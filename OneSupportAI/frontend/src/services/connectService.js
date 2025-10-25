import 'amazon-connect-streams';

class ConnectService {
  constructor() {
    this.isInitialized = false;
    this.agent = null;
    this.currentContact = null;
    this.currentContactId = null;
    this.onCallStateChange = null;
    this.onIncomingCall = null;
    this.isReady = false;
    this.loginWindow = null;
    this.ccpContainer = null;
    this.ccpEmbeddedLocation = null; // Track where CCP is currently embedded
    this.isEmbedding = false; // Prevent concurrent embedding operations
    this.lastCleanupTime = 0; // Track last cleanup to prevent excessive cleanup
    this.cleanupCooldown = 2000; // Minimum time between cleanups (ms)
  }

  // Initialize Connect Streams
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    // Set up log suppression first to prevent spam
    this.suppressExcessiveLogging();

    // Always clean up existing CCP to avoid conflicts
    this.cleanupExistingCCP();
    
    // Perform aggressive iframe cleanup before initialization
    this.aggressiveIframeCleanup();

    try {
      
      // Pre-warm the connection
      await this.preWarmConnection();
      
      // Initialize CCP
      this.initCCP();
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing Connect Streams:', error);
      this.isInitialized = true; // Mark as initialized even if failed
    }
  }

  // Clean up existing CCP to avoid conflicts
  cleanupExistingCCP() {
    try {
      const now = Date.now();
      
      // Prevent excessive cleanup
      if (now - this.lastCleanupTime < this.cleanupCooldown) {
        console.log('Cleanup cooldown active, skipping cleanup');
        return;
      }
      
      this.lastCleanupTime = now;
      
      // Only clean up if we're not already initialized or if there are conflicts
      if (this.isInitialized && this.ccpContainer) {
        return;
      }
      
      // 1. Remove only orphaned CCP containers (not the main one)
      const orphanedContainers = document.querySelectorAll('[id*="connect-ccp"]:not(#connect-ccp-container)');
      
      orphanedContainers.forEach((container, index) => {
        try {
          container.remove();
        } catch (e) {
          console.warn(`Error removing orphaned CCP container ${index + 1}:`, e);
        }
      });

      // 2. Remove only orphaned Connect-related iframes (preserve main CCP iframe)
      const allIframes = document.querySelectorAll('iframe');
      let removedIframes = 0;
      
      allIframes.forEach((iframe, index) => {
        try {
          // Only remove iframes that are NOT inside our main CCP container
          if (iframe.src && (
            iframe.src.includes('connect') || 
            iframe.src.includes('amazon-connect') ||
            iframe.src.includes('ccp')
          ) && !(this.ccpContainer && this.ccpContainer.contains(iframe))) {
            iframe.remove();
            removedIframes++;
          }
        } catch (e) {
          console.warn(`Error removing orphaned iframe ${index + 1}:`, e);
        }
      });

      // 3. Only terminate Connect Streams if we're doing a full reinitialization
      if (!this.isInitialized && window.connect && window.connect.core) {
        try {
          window.connect.core.terminate();
        } catch (e) {
          console.warn('Error terminating existing CCP:', e);
        }
      }
      
      // 4. Only reset state if we're not initialized
      if (!this.isInitialized) {
        this.ccpEmbeddedLocation = null;
        this.isEmbedding = false;
        this.ccpContainer = null;
      }
    } catch (error) {
      console.warn('Error during CCP cleanup:', error);
    }
  }

  // Clean up orphaned DOM elements without reinitializing CCP
  cleanupExistingCCPDOM() {
    try {
      // Only clean up orphaned DOM elements, don't reinitialize CCP
      const orphanedContainers = document.querySelectorAll('[id*="connect-ccp"]:not(#connect-ccp-container)');
      orphanedContainers.forEach(container => container.remove());
      
      // Clean up orphaned iframes (but preserve main CCP iframe)
      const allIframes = document.querySelectorAll('iframe');
      allIframes.forEach(iframe => {
        if (iframe.src && iframe.src.includes('connect') && 
            !iframe.closest('#connect-ccp-container')) {
          iframe.remove();
        }
      });
      
    } catch (error) {
      console.warn('Error cleaning up CCP DOM:', error);
    }
  }

  // Pre-warm connection to speed up initialization
  async preWarmConnection() {
    try {
      const ccpUrl = import.meta.env.VITE_CONNECT_CCP_URL;
      if (!ccpUrl) return;

      // Create a hidden iframe to preload the CCP
      const preloadIframe = document.createElement('iframe');
      preloadIframe.style.cssText = `
        position: absolute;
        top: -9999px;
        left: -9999px;
        width: 1px;
        height: 1px;
        opacity: 0;
        pointer-events: none;
      `;
      preloadIframe.src = ccpUrl;
      document.body.appendChild(preloadIframe);

      // Remove the preload iframe after a short delay
      setTimeout(() => {
        if (preloadIframe.parentNode) {
          preloadIframe.parentNode.removeChild(preloadIframe);
        }
      }, 2000);

    } catch (error) {
      console.warn('Pre-warm failed, continuing with normal initialization:', error);
    }
  }

  // Initialize CCP
  initCCP() {
    try {
      const ccpUrl = import.meta.env.VITE_CONNECT_CCP_URL;
      if (!ccpUrl) {
        console.error('Missing Connect CCP URL. Please set VITE_CONNECT_CCP_URL in your environment variables.');
       
        return;
      }


      // Create container for CCP - will be embedded directly in CallPage
      const ccpContainer = document.createElement('div');
      ccpContainer.id = 'connect-ccp-container';
      ccpContainer.style.cssText = `
        width: 100%;
        height: 600px;
        border: 1px solid #ddd;
        border-radius: 8px;
        overflow: hidden;
      `;
      
      // Store container reference for later use
      this.ccpContainer = ccpContainer;
      this.ccpEmbeddedLocation = null; // Initially not embedded

      // Use popup only for first-time login. Thereafter reuse session silently
      const hasSession = localStorage.getItem('connectSession') === '1';

      // Initialize CCP with optimized settings and better error handling
      const initOptions = {
        ccpUrl: ccpUrl,
        loginPopup: !hasSession,
        loginPopupAutoClose: true,
        loginOptions: {
          autoClose: true,
          height: 600,
          width: 400,
          top: 0,
          left: 0
        },
        softphone: {
          allowFramedSoftphone: true,
          disableRingtone: false,
          ringtoneUrl: null
        },
        region: import.meta.env.VITE_AWS_REGION || 'ap-southeast-2',
        ccpAckTimeout: 20000,
        ccpSynTimeout: 20000,
        ccpLoadTimeout: 60000,
        // Add performance optimizations
        pageOptions: {
          enableAudioDeviceSettings: false,
          enablePhoneTypeSettings: false
        }
      };

      
      window.connect.core.initCCP(ccpContainer, initOptions);

      // Set up initialization callback with better error handling
      if (window.connect?.core?.onInitialized) {
        window.connect.core.onInitialized(() => {
          this.setupConnectAPI();
        });
      } else {
        // Fallback: try multiple times with increasing delays
        let attempts = 0;
        const maxAttempts = 5;
        const trySetup = () => {
          attempts++;
          if (window.connect?.agent && typeof window.connect.agent === 'function') {
            this.setupConnectAPI();
          } else if (attempts < maxAttempts) {
            setTimeout(trySetup, attempts * 1000);
          } else {
            console.error('Failed to initialize Connect Streams API after', maxAttempts, 'attempts');
          }
        };
        setTimeout(trySetup, 1000);
      }
      
    } catch (error) {
      console.error('Error initializing CCP:', error);
      // Don't mark as initialized if there's an error
      this.isInitialized = false;
    }
  }

  // Open CCP login popup explicitly (useful if silent auth fails)
  openLoginPopup() {
    try {
      const ccpUrl = import.meta.env.VITE_CONNECT_CCP_URL;
      if (!ccpUrl) return;
      const features = 'width=420,height=640,noopener,noreferrer';
      const win = window.open(ccpUrl, 'connect_ccp_login', features);
      this.loginWindow = win || this.loginWindow;
    } catch (e) {
      console.error('Failed to open CCP login popup:', e);
    }
  }

  // Whether CCP login popup is still open
  isLoginPopupOpen() {
    try {
      return !!(this.loginWindow && this.loginWindow.closed === false);
    } catch (_) {
      return false;
    }
  }

  // Set up Connect Streams API
  setupConnectAPI() {
    if (!window.connect || typeof window.connect.agent !== 'function' || typeof window.connect.contact !== 'function') {
      return;
    }
    this.setupListeners();
  }

  // Set up Connect Streams listeners
  setupListeners() {
    
    // Suppress FAC API errors in console (they're non-critical)
    this.suppressFACErrors();
    
    // Handle critical errors like ACK_TIMEOUT and postMessage failures
    this.handleCriticalErrors();
    
    // Listen for agent state changes
    window.connect.agent((agent) => {
      this.agent = agent;
      this.isReady = true;
      try { localStorage.setItem('connectSession', '1'); } catch (_) {}
      
      // Trigger a custom event to notify that Connect Streams is ready
      window.dispatchEvent(new CustomEvent('connectStreamsReady', { 
        detail: { agent, isReady: true } 
      }));
      
      // Auto-close login popup once agent is ready to avoid dual-session conflicts
      try {
        if (this.loginWindow && this.loginWindow.closed === false) {
          this.loginWindow.close();
          this.loginWindow = null;
        }
      } catch (_) {}
      
      agent.onStateChange((agentStateChange) => {
        if (this.onAgentStateChange) {
          this.onAgentStateChange(agentStateChange);
        }
      });
    });

    // Listen for contacts only after CCP is initialized
    window.connect.contact((contact) => {
      try {
        
        // Store current contact
        this.currentContact = contact;
        this.currentContactId = contact.getContactId();
        
      } catch (error) {
        console.error('Error in contact callback:', error);
      }

      // Handle incoming calls
      contact.onIncoming?.(() => {
        if (contact.getState() === 'incoming') {
          this.currentContact = contact;
          this.currentContactId = contact?.getContactId?.();
          if (this.onIncomingCall) this.onIncomingCall(contact);
        }
      });

      // Handle state changes
      contact.onStateChange((contactStateChange) => {
        if (contactStateChange.newState === 'incoming') {
          this.currentContact = contact;
          this.currentContactId = contact?.getContactId?.();
        }
        
        if (this.onContactStateChange) {
          this.onContactStateChange(contactStateChange);
        }
      });

      contact.onAccepted(() => {
        if (this.onContactStateChange) {
          this.onContactStateChange({ newState: 'Connected' });
        }
      });

      contact.onEnd(() => {
        // Save call information for AI Case generation
        const contactId = contact.getContactId();
        const contactNumber = contact.getAttributes()?.CustomerPhone || '';
        
        // Store call info for post-call AI Case generation
        this.lastCallInfo = {
          contactId,
          contactNumber,
          endedAt: new Date().toISOString()
        };
        
        
        // Clear current contact but keep last call info
        this.currentContact = null;
        this.currentContactId = null;
        
        if (this.onContactStateChange) {
          this.onContactStateChange({ newState: 'Ended' });
        }
      });

      contact.onError((error) => {
        console.error('Contact error:', error);
        
        // Handle contact errors with cooldown to prevent loops
        const lastReinit = localStorage.getItem('lastCCPReinit');
        const now = Date.now();
        const reinitCooldown = 30000; // 30 seconds cooldown
        
        if (contact.getState() === 'error' && (!lastReinit || now - parseInt(lastReinit) > reinitCooldown)) {
          localStorage.setItem('lastCCPReinit', now.toString());
          
          setTimeout(() => {
            this.forceReinitialize().catch(err => {
              console.error('Failed to reinitialize after contact error:', err);
            });
          }, 5000);
        }
      });

      // Monitor connection quality
      contact.onConnected(() => {
        this.monitorConnectionQuality(contact);
      });

    });
  }

  // Suppress non-critical FAC API errors
  suppressFACErrors() {
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const message = args.join(' ');
      // Suppress FAC API 400 errors as they're non-critical
      if (message.includes('FAC.js') && message.includes('400')) {
        return;
      }
      // Suppress forced reflow warnings
      if (message.includes('Forced reflow')) {
        return;
      }
      originalConsoleError.apply(console, args);
    };
  }

  // Handle ACK_TIMEOUT and other critical errors
  handleCriticalErrors() {
    const originalConsoleWarn = console.warn;
    console.warn = (...args) => {
      const message = args.join(' ');
      
      // Handle ACK_TIMEOUT - this indicates authentication failure
      if (message.includes('ACK_TIMEOUT')) {
        console.error('ACK_TIMEOUT detected - authentication failed, reinitializing...');
        this.handleAuthenticationFailure();
        return;
      }
      
      // Handle postMessage errors - indicates iframe communication failure
      if (message.includes('postMessage') && message.includes('null')) {
        console.error('postMessage error detected - iframe communication failed, reinitializing...');
        this.handleIframeCommunicationFailure();
        return;
      }
      
      originalConsoleWarn.apply(console, args);
    };
  }

  // Handle authentication failure
  async handleAuthenticationFailure() {
    
    // Clear session data
    try {
      localStorage.removeItem('connectSession');
      localStorage.removeItem('lastCCPReinit');
    } catch (_) {}
    
    // Trigger error event for UI
    window.dispatchEvent(new CustomEvent('connectError', { 
      detail: { type: 'authentication', message: 'ACK_TIMEOUT - Authentication failed' } 
    }));
    
    // Force reinitialize after a delay
    setTimeout(() => {
      this.forceReinitialize().catch(err => {
        console.error('Failed to reinitialize after auth failure:', err);
      });
    }, 2000);
  }

  // Handle iframe communication failure
  async handleIframeCommunicationFailure() {
    
    // Clean up and reinitialize
    this.cleanupExistingCCP();
    
    // Force reinitialize after a delay
    setTimeout(() => {
      this.forceReinitialize().catch(err => {
        console.error('Failed to reinitialize after iframe failure:', err);
      });
    }, 1000);
  }

  // Answer the current call
  async answerCall() {
    try {
      await this.ensureReady(7000);
      // If a contact is already attached, answer immediately
      if (this.currentContact) {
        await this.currentContact.accept();
        return { success: true, message: 'Call answered successfully', contactId: this.currentContactId };
      }

      // Otherwise, subscribe once for the next contact and accept
      return await this.answerNextIncoming(7000);
    } catch (error) {
      console.error('Error answering call:', error);
      throw error;
    }
  }

  // Subscribe once for next contact and accept when it arrives
  async answerNextIncoming(timeoutMs = 7000) {
    if (!window.connect || typeof window.connect.contact !== 'function') {
      throw new Error('Connect Streams not ready');
    }
    return new Promise((resolve, reject) => {
      let done = false;
      const timeout = setTimeout(() => {
        if (!done) reject(new Error('No incoming call to answer'));
      }, timeoutMs);

      try {
        window.connect.contact((contact) => {
          if (done) return;
          // Only accept inbound voice
          try {
            contact.onIncoming?.(() => {
              if (done) return;
              done = true;
              clearTimeout(timeout);
              this.currentContact = contact;
              this.currentContactId = contact?.getContactId?.();
              contact.accept().then(() => {
                resolve({ success: true, message: 'Call answered successfully', contactId: this.currentContactId });
              }).catch(reject);
            });
          } catch (_) {
            // Fallback: attempt accept directly
            done = true;
            clearTimeout(timeout);
            this.currentContact = contact;
            this.currentContactId = contact?.getContactId?.();
            contact.accept().then(() => {
              resolve({ success: true, message: 'Call answered successfully', contactId: this.currentContactId });
            }).catch(reject);
          }
        });
      } catch (err) {
        clearTimeout(timeout);
        reject(err);
      }
    });
  }

  // Ensure Streams is ready (agent object exists)
  async ensureReady(timeoutMs = 7000) {
    if (this.isReady) return true;
    const start = Date.now();
    return new Promise((resolve, reject) => {
      const check = () => {
        if (this.isReady) return resolve(true);
        if (Date.now() - start >= timeoutMs) return reject(new Error('Connect Streams not ready (agent not initialized)'));
        setTimeout(check, 200);
      };
      check();
    });
  }

  // Hang up the current call
  async hangupCall() {
    try {
      if (!this.currentContact) {
        throw new Error('No active call to hang up');
      }

      await this.currentContact.destroy();
      
      return {
        success: true,
        message: 'Call ended successfully',
        contactId: this.currentContactId
      };
    } catch (error) {
      console.error('Error hanging up call:', error);
      throw error;
    }
  }

  // Get current contact
  getCurrentContact() {
    return this.currentContact;
  }

  // Get current agent
  getCurrentAgent() {
    return this.agent;
  }

  // Set current contact ID
  setCurrentContactId(contactId) {
    this.currentContactId = contactId;
  }

  // Get current contact ID
  getCurrentContactId() {
    return this.currentContactId;
  }

  // Get CCP container for embedding
  getCCPContainer() {
    return this.ccpContainer;
  }

  // Safely embed CCP to target container
  embedCCPToContainer(targetContainer) {
    // 1. Check embedding lock
    if (this.isEmbedding) {
      console.warn('CCP embedding already in progress, skipping duplicate request');
      return false;
    }

    // 2. Validate inputs
    if (!targetContainer) {
      console.warn('Target container not available');
      return false;
    }

    if (!this.ccpContainer) {
      console.warn('CCP container not available, CCP may not be initialized yet');
      return false;
    }

    // 3. Check if already in correct location (most common case)
    if (this.ccpEmbeddedLocation === targetContainer && 
        this.ccpContainer.parentNode === targetContainer) {
      console.log('CCP already embedded in target container, no action needed');
      return true;
    }

    // 4. Set lock
    this.isEmbedding = true;

    try {
      // 5. Remove from current location (if exists) - this preserves the CCP instance
      if (this.ccpContainer.parentNode) {
        this.ccpContainer.parentNode.removeChild(this.ccpContainer);
      }

      // 6. Clean target container (simple cleanup)
      targetContainer.innerHTML = '';
      
      // 7. Move CCP to new location (reuse existing instance)
      targetContainer.appendChild(this.ccpContainer);
      this.ccpEmbeddedLocation = targetContainer;
      
      // 8. Ensure CCP remains visible after embedding
      this.ensureCCPStaysVisible();
      
      return true;
    } catch (error) {
      console.error('Error moving CCP:', error);
      return false;
    } finally {
      // 9. Release lock
      this.isEmbedding = false;
    }
  }

  // Check if CCP is embedded in specific container
  isCCPEmbeddedIn(targetContainer) {
    return this.ccpEmbeddedLocation === targetContainer && 
           this.ccpContainer?.parentNode === targetContainer;
  }

  // Check for and clean up any duplicate Connect iframes
  checkAndCleanupDuplicateIframes() {
    try {
      console.log('Checking for duplicate Connect iframes...');
      
      // Find all Connect-related iframes
      const allIframes = document.querySelectorAll('iframe');
      const connectIframes = Array.from(allIframes).filter(iframe => 
        iframe.src && (
          iframe.src.includes('connect') || 
          iframe.src.includes('amazon-connect') ||
          iframe.src.includes('ccp')
        )
      );
      
      console.log(`Found ${connectIframes.length} Connect-related iframes`);
      
      if (connectIframes.length > 1) {
        console.warn(`Multiple Connect iframes detected (${connectIframes.length}), cleaning up duplicates...`);
        
        // Keep only the iframe that's inside our CCP container
        const validIframe = connectIframes.find(iframe => 
          this.ccpContainer && this.ccpContainer.contains(iframe)
        );
        
        // Remove all other Connect iframes
        connectIframes.forEach((iframe, index) => {
          if (iframe !== validIframe) {
            console.log(`Removing duplicate iframe ${index + 1}:`, iframe.src);
            try {
              iframe.remove();
            } catch (e) {
              console.warn(`Error removing duplicate iframe ${index + 1}:`, e);
            }
          }
        });
        
        console.log('Duplicate iframe cleanup completed');
      } else if (connectIframes.length === 1) {
        console.log('Single Connect iframe found, no cleanup needed');
      } else {
        console.log('No Connect iframes found');
      }
      
      return connectIframes.length;
    } catch (error) {
      console.error('Error checking for duplicate iframes:', error);
      return 0;
    }
  }

  // Gentle duplicate CCP detection and cleanup
  detectAndCleanupDuplicateCCP() {
    try {
      const now = Date.now();
      
      // Prevent excessive checking
      if (now - this.lastCleanupTime < 1000) { // Reduced to 1 second
        return false;
      }
      
      // Only check if CCP is properly embedded and visible
      if (!this.ccpContainer || !this.ccpEmbeddedLocation) {
        return false;
      }
      
      // Check if CCP container is still visible
      const ccpRect = this.ccpContainer.getBoundingClientRect();
      if (ccpRect.width === 0 || ccpRect.height === 0) {
        console.warn('CCP container has zero dimensions, attempting to restore...');
        this.restoreCCPVisibility();
        return true;
      }
      
      // Check for all Connect-related iframes
      const allIframes = document.querySelectorAll('iframe');
      const connectIframes = Array.from(allIframes).filter(iframe => 
        iframe.src && (
          iframe.src.includes('connect') || 
          iframe.src.includes('amazon-connect') ||
          iframe.src.includes('ccp')
        )
      );
      
      console.log(`Found ${connectIframes.length} Connect-related iframes total`);
      
      if (connectIframes.length > 1) {
        console.warn(`Multiple Connect iframes detected (${connectIframes.length}), cleaning up duplicates...`);
        
        // Keep only the iframe inside our CCP container
        const validIframe = connectIframes.find(iframe => 
          this.ccpContainer && this.ccpContainer.contains(iframe)
        );
        
        // Remove all other Connect iframes
        connectIframes.forEach((iframe, index) => {
          if (iframe !== validIframe) {
            console.warn(`Removing duplicate iframe ${index + 1}:`, iframe.src);
            try {
              iframe.remove();
            } catch (e) {
              console.warn(`Error removing duplicate iframe ${index + 1}:`, e);
            }
          }
        });
        
        return true;
      }
      
      this.lastCleanupTime = now;
      
      return false;
    } catch (error) {
      console.error('Error in CCP health check:', error);
      return false;
    }
  }

  // Ensure CCP stays visible after embedding
  ensureCCPStaysVisible() {
    try {
      if (!this.ccpContainer || !this.ccpEmbeddedLocation) {
        return false;
      }
      
      // Ensure CCP container is visible
      this.ccpContainer.style.display = 'block';
      this.ccpContainer.style.visibility = 'visible';
      this.ccpContainer.style.opacity = '1';
      this.ccpContainer.style.width = '100%';
      this.ccpContainer.style.height = '600px';
      this.ccpContainer.style.minHeight = '600px';
      this.ccpContainer.style.position = 'relative';
      this.ccpContainer.style.border = '1px solid #ddd';
      this.ccpContainer.style.borderRadius = '8px';
      this.ccpContainer.style.overflow = 'hidden';
      
      // Ensure parent container is visible
      this.ccpEmbeddedLocation.style.display = 'block';
      this.ccpEmbeddedLocation.style.visibility = 'visible';
      this.ccpEmbeddedLocation.style.width = '100%';
      this.ccpEmbeddedLocation.style.height = '600px';
      this.ccpEmbeddedLocation.style.minHeight = '600px';
      
      // Ensure iframes inside CCP container are visible
      const iframes = this.ccpContainer.querySelectorAll('iframe');
      iframes.forEach((iframe, index) => {
        iframe.style.display = 'block';
        iframe.style.visibility = 'visible';
        iframe.style.opacity = '1';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.minHeight = '600px';
        iframe.style.border = 'none';
        iframe.style.position = 'relative';
      });
      return true;
    } catch (error) {
      console.error('Error ensuring CCP visibility:', error);
      return false;
    }
  }

  // Restore CCP visibility if it becomes hidden
  restoreCCPVisibility() {
    try {
      if (!this.ccpContainer || !this.ccpEmbeddedLocation) {
        console.warn('Cannot restore CCP: container or location not available');
        return false;
      }
      
      console.log('Restoring CCP visibility...');
      
      // Ensure CCP container is visible
      this.ccpContainer.style.display = 'block';
      this.ccpContainer.style.visibility = 'visible';
      this.ccpContainer.style.opacity = '1';
      this.ccpContainer.style.width = '100%';
      this.ccpContainer.style.height = '600px';
      this.ccpContainer.style.minHeight = '600px';
      
      // Ensure parent container is visible
      if (this.ccpEmbeddedLocation) {
        this.ccpEmbeddedLocation.style.display = 'block';
        this.ccpEmbeddedLocation.style.visibility = 'visible';
        this.ccpEmbeddedLocation.style.width = '100%';
        this.ccpEmbeddedLocation.style.height = '600px';
        this.ccpEmbeddedLocation.style.minHeight = '600px';
      }
      
      // Check iframes inside CCP container
      const iframes = this.ccpContainer.querySelectorAll('iframe');
      iframes.forEach((iframe, index) => {
        iframe.style.display = 'block';
        iframe.style.visibility = 'visible';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.minHeight = '600px';
      });
      
      console.log('CCP visibility restored');
      return true;
    } catch (error) {
      console.error('Error restoring CCP visibility:', error);
      return false;
    }
  }

  // Suppress excessive error logging to prevent CPU overload
  suppressExcessiveLogging() {
    try {
      // Override console methods to limit error spam
      if (!this.originalConsoleError) {
        this.originalConsoleError = console.error;
        this.errorCount = 0;
        this.lastErrorTime = 0;
        
        console.error = (...args) => {
          const now = Date.now();
          const message = args.join(' ');
          
          // Reset counter every 5 seconds
          if (now - this.lastErrorTime > 5000) {
            this.errorCount = 0;
            this.lastErrorTime = now;
          }
          
          // Completely suppress specific known errors
          const shouldCompletelySuppress = (
            message.includes('background blur processor') ||
            (message.includes('Cannot read properties of null') && message.includes('postMessage')) ||
            (message.includes('amazon-connect-streams') && message.includes('Logger.scheduleUpstreamOuterContextCCPLogsPush'))
          );
          
          if (shouldCompletelySuppress) {
            return; // Don't log these errors at all
          }
          
          // Only show first 10 errors per 5-second window
          if (this.errorCount < 10) {
            this.originalConsoleError.apply(console, args);
          } else if (this.errorCount === 10) {
            this.originalConsoleError('... suppressing additional error messages to prevent spam ...');
          }
          
          this.errorCount++;
        };
      }
      
      // Override console.warn similarly
      if (!this.originalConsoleWarn) {
        this.originalConsoleWarn = console.warn;
        this.warnCount = 0;
        this.lastWarnTime = 0;
        
        console.warn = (...args) => {
          const now = Date.now();
          
          // Reset counter every 5 seconds
          if (now - this.lastWarnTime > 5000) {
            this.warnCount = 0;
            this.lastWarnTime = now;
          }
          
          // Only show first 5 warnings per 5-second window
          if (this.warnCount < 5) {
            this.originalConsoleWarn.apply(console, args);
          } else if (this.warnCount === 5) {
            this.originalConsoleWarn('... suppressing additional warning messages to prevent spam ...');
          }
          
          this.warnCount++;
        };
      }
    } catch (error) {
      console.error('Error setting up log suppression:', error);
    }
  }

  // Aggressive iframe cleanup before CCP initialization
  aggressiveIframeCleanup() {
    try {
      console.log('Performing aggressive iframe cleanup...');
      
      // Remove ALL Connect-related iframes
      const allIframes = document.querySelectorAll('iframe');
      const connectIframes = Array.from(allIframes).filter(iframe => 
        iframe.src && (
          iframe.src.includes('connect') || 
          iframe.src.includes('amazon-connect') ||
          iframe.src.includes('ccp')
        )
      );
      
      console.log(`Found ${connectIframes.length} Connect-related iframes to remove`);
      
      connectIframes.forEach((iframe, index) => {
        try {
          console.log(`Removing Connect iframe ${index + 1}:`, iframe.src);
          iframe.remove();
        } catch (e) {
          console.warn(`Error removing iframe ${index + 1}:`, e);
        }
      });
      
      console.log('Aggressive iframe cleanup completed');
    } catch (error) {
      console.error('Error in aggressive iframe cleanup:', error);
    }
  }

  // Check if CCP is ready for embedding
  isCCPReadyForEmbedding() {
    return this.isInitialized && this.ccpContainer && !this.isEmbedding;
  }

  // Reconnect CCP when connection is lost
  async reconnectCCP() {
    
    try {
      // Clean up existing CCP
      this.cleanupExistingCCP();
      
      // Reset state
      this.isInitialized = false;
      this.isReady = false;
      this.ccpEmbeddedLocation = null;
      this.isEmbedding = false;
      
      // Clear Connect Streams completely
      if (window.connect) {
        try {
          window.connect = null;
        } catch (error) {
          console.warn('Error clearing Connect Streams:', error);
        }
      }
      
      // Wait longer before reinitializing to ensure cleanup
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Reinitialize CCP
      await this.initialize();
      
      return true;
    } catch (error) {
      console.error('CCP reconnection failed:', error);
      return false;
    }
  }

  // Check if CCP connection is healthy
  isCCPConnectionHealthy() {
    try {
      // Check if CCP container exists
      if (!this.ccpContainer) {
        return false;
      }
      
      // Check if CCP container is embedded somewhere
      if (!this.ccpContainer.parentNode) {
        return false;
      }
      
      // Check if there are any iframes in the container
      const iframes = this.ccpContainer.querySelectorAll('iframe');
      if (iframes.length === 0) {
        return false;
      }
      
      // Check if the main iframe is still accessible
      const mainIframe = iframes[0];
      if (!mainIframe.src || !mainIframe.src.includes('connect')) {
        return false;
      }
      
      // Check if iframe is visible and has proper dimensions
      const rect = mainIframe.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        console.log('CCP iframe has zero dimensions:', rect);
        return false;
      }
      
      // Check if Connect Streams API is available
      if (!window.connect || !window.connect.agent) {
        console.log('Connect Streams API not available');
        return false;
      }
      
      console.log('CCP connection is healthy:', {
        iframeCount: iframes.length,
        iframeSrc: mainIframe.src,
        iframeDimensions: { width: rect.width, height: rect.height },
        hasConnectAPI: !!(window.connect && window.connect.agent)
      });
      
      return true;
    } catch (error) {
      console.warn('Error checking CCP connection health:', error);
      return false;
    }
  }

  // Check if user needs to login to Connect
  needsConnectLogin() {
    try {
      // Check if there's a valid session - this is the primary indicator
      const hasSession = localStorage.getItem('connectSession') === '1';
      
      console.log('Checking login needs:', {
        hasSession,
        hasConnectAPI: !!(window.connect && window.connect.agent),
        ccpContainerExists: !!this.ccpContainer,
        isInitialized: this.isInitialized
      });
      
      // If no session, definitely needs login
      if (!hasSession) {
        console.log('No Connect session, needs login');
        return true;
      }
      
      // If we have a session, check if CCP is properly loaded
      if (this.isInitialized) {
        // Check if CCP container exists and has content
        if (this.ccpContainer) {
          const iframes = this.ccpContainer.querySelectorAll('iframe');
          if (iframes.length > 0) {
            const mainIframe = iframes[0];
            const rect = mainIframe.getBoundingClientRect();
            
            // If iframe exists but has zero dimensions, might need re-embedding
            if (rect.width === 0 || rect.height === 0) {
              console.log('CCP iframe has zero dimensions, but session exists - might need re-embedding');
              return false; // Don't show login, just need re-embedding
            }
          } else {
            console.log('No iframes in CCP container, but session exists - might need re-embedding');
            return false; // Don't show login, just need re-embedding
          }
        } else {
          console.log('No CCP container, but session exists - might need re-embedding');
          return false; // Don't show login, just need re-embedding
        }
        
        // If no Connect Streams API, might need re-initialization
        if (!window.connect || !window.connect.agent) {
          console.log('Connect Streams API not available, but session exists - might need re-initialization');
          return false; // Don't show login, just need re-initialization
        }
        
        console.log('Session exists and CCP appears functional, no login needed');
        return false;
      } else {
        // Not initialized but has session - don't show login, just wait for initialization
        console.log('Not initialized but has session, waiting for initialization');
        return false;
      }
    } catch (error) {
      console.warn('Error checking Connect login status:', error);
      // If error, check session status as fallback
      const hasSession = localStorage.getItem('connectSession') === '1';
      return !hasSession;
    }
  }

  // Open Connect login popup (required by AWS Connect security)
  openConnectLogin() {
    try {
      const ccpUrl = import.meta.env.VITE_CONNECT_CCP_URL;
      if (!ccpUrl) {
        console.error('Connect CCP URL not configured');
        return false;
      }

      console.log('Opening Connect login popup...');
      
      // Open login popup with proper features
      const features = 'width=420,height=640,noopener,noreferrer,scrollbars=yes,resizable=yes,menubar=no,toolbar=no,location=no,status=no';
      const loginWindow = window.open(ccpUrl, 'connect_login', features);
      
      if (!loginWindow) {
        console.error('Failed to open login popup - popup blocked?');
        return false;
      }

      // Focus the popup
      loginWindow.focus();

      // Monitor popup
      const checkClosed = setInterval(() => {
        if (loginWindow.closed) {
          clearInterval(checkClosed);
          console.log('Login popup closed, checking login status...');
          
          // Stop the monitoring interval since popup is closed
          this.stopLoginMonitoring();
          
          // Wait a moment then check if login was successful
          setTimeout(() => {
            this.checkLoginStatus();
          }, 1000);
        }
      }, 1000);

      // Start monitoring for successful login while popup is open
      this.startLoginMonitoring();

      return true;
    } catch (error) {
      console.error('Error opening Connect login:', error);
      return false;
    }
  }

  // Start monitoring for successful login
  startLoginMonitoring() {
    console.log('Starting login monitoring...');
    
    let checkCount = 0;
    const maxChecks = 150; // 5 minutes at 2-second intervals
    
    // Store interval reference for cleanup
    this.loginMonitoringInterval = setInterval(() => {
      checkCount++;
      const hasSession = localStorage.getItem('connectSession') === '1';
      
      console.log(`Login check ${checkCount}/${maxChecks}: hasSession=${hasSession}`);
      
      if (hasSession) {
        console.log('Login detected during monitoring, stopping and handling success...');
        clearInterval(this.loginMonitoringInterval);
        this.loginMonitoringInterval = null;
        
        // Wait a moment for session to be fully established
        setTimeout(() => {
          this.handleLoginSuccess();
        }, 2000);
      } else if (checkCount >= maxChecks) {
        console.log('Login monitoring timeout - no login detected');
        clearInterval(this.loginMonitoringInterval);
        this.loginMonitoringInterval = null;
        // Dispatch failure event
        window.dispatchEvent(new CustomEvent('connectLoginFailed'));
      }
    }, 2000); // Check every 2 seconds
  }

  // Stop login monitoring
  stopLoginMonitoring() {
    if (this.loginMonitoringInterval) {
      console.log('Stopping login monitoring...');
      clearInterval(this.loginMonitoringInterval);
      this.loginMonitoringInterval = null;
    }
  }

  // Handle successful login
  handleLoginSuccess() {
    try {
      console.log('Handling successful login...');
      
      // Set session flag in localStorage
      localStorage.setItem('connectSession', '1');
      console.log('Connect session flag set in localStorage');
      
      // Clean up login iframe
      if (this.ccpContainer && this.ccpContainer.parentNode) {
        this.ccpContainer.innerHTML = '';
      }
      
      // Reinitialize CCP with authenticated session
      this.reconnectCCP().then(success => {
        if (success) {
          console.log('CCP reinitialized after successful login');
          // Dispatch event to notify UI
          window.dispatchEvent(new CustomEvent('connectLoginSuccess'));
        } else {
          console.error('Failed to reinitialize CCP after login');
          window.dispatchEvent(new CustomEvent('connectLoginFailed'));
        }
      });
    } catch (error) {
      console.error('Error handling login success:', error);
      window.dispatchEvent(new CustomEvent('connectLoginFailed'));
    }
  }

  // Check if login was successful
  checkLoginStatus() {
    try {
      // Check if session was established
      const hasSession = localStorage.getItem('connectSession') === '1';
      
      console.log('Checking login status after popup closed:', hasSession);
      
      if (hasSession) {
        console.log('Connect login successful, triggering success handler...');
        this.handleLoginSuccess();
      } else {
        console.log('Connect login not successful');
        // Dispatch event to notify UI
        window.dispatchEvent(new CustomEvent('connectLoginFailed'));
      }
    } catch (error) {
      console.error('Error checking login status:', error);
      window.dispatchEvent(new CustomEvent('connectLoginFailed'));
    }
  }

  // Set callbacks
  setOnCallStateChange(callback) {
    this.onCallStateChange = callback;
  }

  setOnAgentStateChange(callback) {
    this.onAgentStateChange = callback;
  }

  setOnContactStateChange(callback) {
    this.onContactStateChange = callback;
  }

  // Set incoming call callback
  setOnIncomingCall(callback) {
    this.onIncomingCall = callback;
  }

  // Monitor connection quality
  monitorConnectionQuality(contact) {
    const checkInterval = setInterval(() => {
      if (!contact || contact.getState() === 'ended') {
        clearInterval(checkInterval);
        return;
      }
      
      try {
        const state = contact.getState();
        console.log('Connection quality check - state:', state);
        
        // Check if we have audio streams
        if (contact.getAgentConnection && contact.getAgentConnection()) {
          const connection = contact.getAgentConnection();
          console.log('Agent connection active:', !!connection);
        }
      } catch (error) {
        console.warn('Connection quality check failed:', error);
      }
    }, 5000); // Check every 5 seconds
  }


  // Force cleanup and reinitialize
  async forceReinitialize() {
    console.log('Force reinitializing Connect Streams...');
    
    // Clean up existing instance
    this.destroy();
    
    // Clear session and all Connect-related data
    try {
      localStorage.removeItem('connectSession');
      localStorage.removeItem('lastCCPReinit');
      // Clear any Connect Streams related data
      Object.keys(localStorage).forEach(key => {
        if (key.includes('connect') || key.includes('ccp')) {
          localStorage.removeItem(key);
        }
      });
    } catch (_) {}
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Reinitialize
    this.isInitialized = false;
    await this.initialize();
  }

  // Manual reinitialize method
  async manualReinitialize() {
    await this.forceReinitialize();
  }

  // Clear old contact states
  clearOldContactStates() {
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.includes('contact')) {
          localStorage.removeItem(key);
        }
      });
      
      this.currentContact = null;
      this.currentContactId = null;
    } catch (error) {
      console.error('Error clearing old contact states:', error);
    }
  }


  // Get current status
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isReady: this.isReady,
      hasAgent: !!this.agent,
      hasContact: !!this.currentContact,
      contactId: this.currentContactId
    };
  }

  // Cleanup
  destroy() {
    if (this.isInitialized) {
      try {
        window.connect.core.terminate();
      } catch (error) {
        console.warn('Error terminating CCP:', error);
      }
      this.isInitialized = false;
    }
    
    this.currentContact = null;
    this.currentContactId = null;
    this.agent = null;
    this.isReady = false;
  }
}

// Export singleton instance
export default new ConnectService();