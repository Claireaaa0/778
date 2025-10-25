import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useConnect } from '../contexts/ConnectContext';
import { useCall } from '../contexts/CallContext';
import { getCasesByPhoneNumber, createCase } from '../services/caseService';
import { generateAICase } from '../services/transcriptService';
import { useUser } from '../hooks/useUser';
import { CASE_STATUS, STATUS_MAP } from '../utils/caseUtils';
import { parsePhoneNumber } from '../utils/phoneUtils';
import '../styles/pages/CallPage.css';
import '../styles/pages/NewCasePage.css';

const CallPage = () => {
  const { callId } = useParams();
  const navigate = useNavigate();
  const { token } = useUser();
  const { 
    agentState, 
    contactState, 
    connectStatus, 
    isInitialized, 
    currentContact, 
    connectService 
  } = useConnect();
  
  // Use CallContext for persistent state
  const {
    customerInfo,
    setCustomerInfo,
    phoneNumber,
    setPhoneNumber,
    lastCallInfo,
    setLastCallInfo,
    caseFormData,
    setCaseFormData,
    showCaseForm,
    setShowCaseForm,
    clearCallData
  } = useCall();
  
  const [call, setCall] = useState(null);
  const [ccpLoading, setCcpLoading] = useState(true);
  const [ccpError, setCcpError] = useState(null);
  const [isGeneratingCase, setIsGeneratingCase] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const ccpContainerRef = useRef(null);
  const ccpEmbeddedRef = useRef(false); // Track if CCP is already embedded

  // Query cases by phone number
  const { data: customerCases, isLoading: casesLoading, error: casesError } = useQuery({
    queryKey: ['cases-by-phone', phoneNumber],
    queryFn: () => {
      return getCasesByPhoneNumber(token, phoneNumber);
    },
    enabled: !!phoneNumber && !!token,
    retry: false,
  });

  // Simplified CCP embedding logic
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 10; // Maximum retry attempts
    let duplicateCheckInterval = null;

    const embedCCP = () => {
      if (!ccpContainerRef.current || !isInitialized) return;

      // Check if CCP is ready for embedding
      if (!connectService.isCCPReadyForEmbedding()) {
        retryCount++;
        if (retryCount < maxRetries) {
          // Retry after a short delay
          setTimeout(embedCCP, 200);
          return;
        } else {
          console.error('CCP embedding failed after maximum retries');
          return;
        }
      }

      // Use ConnectService's safe embedding method
      const success = connectService.embedCCPToContainer(ccpContainerRef.current);
      if (success) {
        ccpEmbeddedRef.current = true;
        
        // Set up periodic CCP health check (every 3 seconds)
        duplicateCheckInterval = setInterval(() => {
          connectService.detectAndCleanupDuplicateCCP();
        }, 3000);
      } else {
        retryCount++;
        if (retryCount < maxRetries) {
          // Retry after a short delay
          setTimeout(embedCCP, 200);
        } else {
          console.error('CCP embedding failed after maximum retries');
        }
      }
    };

    // Embed CCP when Connect is initialized
    if (isInitialized) {
      // Add small delay to ensure DOM is ready
      const timer = setTimeout(embedCCP, 50);
      return () => {
        clearTimeout(timer);
        if (duplicateCheckInterval) {
          clearInterval(duplicateCheckInterval);
        }
      };
    }

    // Reset state on cleanup
    return () => {
      ccpEmbeddedRef.current = false;
      if (duplicateCheckInterval) {
        clearInterval(duplicateCheckInterval);
      }
    };
  }, [isInitialized]); // Only depend on isInitialized

  // Listen for incoming call notifications with customerInfo
  useEffect(() => {
    const handleIncomingCall = (event) => {
      if (event.detail && event.detail.customerInfo) {
        const customerInfoData = event.detail.customerInfo;
        
        // Set customer info from WebSocket notification
        setCustomerInfo({
          name: customerInfoData.CustomerName || 'Unknown Customer',
          phoneNumber: customerInfoData.CustomerPhone || '',
          email: '', // Not available in customerInfo
          location: '', // Not available in customerInfo
          customerId: customerInfoData.RecentCaseId || '',
          recentCaseTitle: customerInfoData.RecentCaseTitle || '',
          recentCaseStatus: customerInfoData.RecentCaseStatus || '',
          productInfo: customerInfoData.ProductInfo || '',
          totalCases: customerInfoData.TotalCases || 0,
          lastContactDate: customerInfoData.LastContactDate || ''
        });
        
        // Set phone number for case history query
        if (customerInfoData.CustomerPhone) {
          setPhoneNumber(String(customerInfoData.CustomerPhone)); // Ensure it's a string
        }
      } else {
      }
    };

    // Listen for incoming call events
    window.addEventListener('incomingCall', handleIncomingCall);
    
    // Also check if there's already an incoming call event in the global state
    // This handles the case where the event was fired before the listener was added
    const checkForExistingEvent = () => {
      if (window.lastIncomingCallEvent) {
        handleIncomingCall(window.lastIncomingCallEvent);
        window.lastIncomingCallEvent = null; // Clear after processing
      }
    };
    
    // Check immediately and also after a short delay
    checkForExistingEvent();
    const timeoutId = setTimeout(checkForExistingEvent, 100);
    
    return () => {
      window.removeEventListener('incomingCall', handleIncomingCall);
      clearTimeout(timeoutId);
    };
  }, []);

  // Separate useEffect for customer info from current contact (fallback)
  useEffect(() => {
    if (currentContact && !customerInfo) {
      // Get contact number from current contact
      const contactNumber = currentContact.getAttributes()?.CustomerPhone || '';
      
      if (contactNumber) {
        setPhoneNumber(contactNumber);
      }
    }
  }, [currentContact, customerInfo]);

  // Debug phoneNumber changes
  useEffect(() => {
  }, [phoneNumber]);

  // Listen for call end events
  useEffect(() => {
    const checkCallEnd = () => {
      if (connectService.lastCallInfo) {
        setLastCallInfo(connectService.lastCallInfo);
      }
    };

    // Check immediately
    checkCallEnd();

    // Set up interval to check for call end
    const interval = setInterval(checkCallEnd, 1000);

    return () => clearInterval(interval);
  }, [setLastCallInfo]);

  // Handle AI case generation
  const handleAICaseGeneration = async () => {
    setIsGeneratingCase(true);
    
    try {
      // Use callId from URL or lastCallInfo
      const contactId = callId || lastCallInfo?.contactId;
      const contactNumber = lastCallInfo?.contactNumber || phoneNumber;
      
      
      const result = await generateAICase(token, contactId, contactNumber);
      
      // Set form data and show case form in the center panel
      setCaseFormData({
        ...result.data.caseData,
        contactId,
        contactNumber
      });
      setShowCaseForm(true);
    } catch (error) {
      console.error('Error generating AI case:', error);
      alert(`Error generating AI case: ${error.message}`);
    } finally {
      setIsGeneratingCase(false);
    }
  };

  // Handle manual case creation
  const handleManualCase = () => {
    const parsedPhone = parsePhoneNumber(phoneNumber);
    
    setCaseFormData({
      status: 'pending',
      caseId: '',
      todo: '',
      name: customerInfo?.name || '',
      contactCode: parsedPhone.contactCode,
      contactNumber: parsedPhone.contactNumber,
      email: customerInfo?.email || '',
      product: '',
      summary: '',
      actions: '',
      contactId: callId,
    });
    setShowCaseForm(true);
  };

  // Handle case form submission
  const handleCaseSubmit = async (formData) => {
    // Validate required fields
    if (!formData.name || formData.name.trim() === '') {
      alert('Name is required. Please fill in the customer name.');
      return;
    }

    try {
      const response = await createCase(token, formData);

      if (response.code === 201) {
        alert('Case created successfully!');
        setShowCaseForm(false);
        setCaseFormData(null);
        // Navigate to CasesPage
        navigate('/cases');
      } else {
        alert(`Failed to create case: ${response.message}`);
      }
    } catch (error) {
      console.error('Error creating case:', error);
      alert(`Error creating case: ${error.message}`);
    }
  };

  // Handle case form cancellation
  const handleCaseCancel = () => {
    setShowCaseForm(false);
    setCaseFormData(null);
  };


  // Reconnect handler for already logged in users
  const handleReconnectCCP = async () => {
    try {
      setIsReconnecting(true);
      
      // Try multiple approaches to reinitialize CCP
      if (ccpContainerRef.current) {
        try {
          // Approach 1: Clear container and re-embed
          ccpContainerRef.current.innerHTML = '';
          
          // Wait a moment for cleanup
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Try to re-embed CCP
          const embedSuccess = connectService.embedCCPToContainer(ccpContainerRef.current);
          if (embedSuccess) {
          } else {
            throw new Error('Re-embedding failed');
          }
        } catch (error) {
          
          // Approach 2: Full reconnection
          try {
            await connectService.reconnectCCP();
            await connectService.embedCCPToContainer(ccpContainerRef.current);
          } catch (reconnectError) {
            // Approach 3: Fallback to page reload
            window.location.reload();
            return;
          }
        }
      }
      
      
    } catch (error) {
      console.error('Error reconnecting CCP:', error);
    } finally {
      setIsReconnecting(false);
    }
  };

  // Login handler for users who need to login
  const handleLoginCCP = async () => {
    try {
      setIsReconnecting(true);
      
      const loginSuccess = await connectService.openConnectLogin();
      
      if (!loginSuccess) {
      }
      
    } catch (error) {
      console.error('Error opening login popup:', error);
    } finally {
      setIsReconnecting(false);
    }
  };

  // Listen for login success events
  useEffect(() => {
    const handleLoginSuccess = () => {
      
      // Reinitialize and re-embed CCP after successful login
      setTimeout(async () => {
        try {
          await connectService.reconnectCCP();
          
          if (ccpContainerRef.current) {
            await connectService.embedCCPToContainer(ccpContainerRef.current);
            ccpEmbeddedRef.current = true;
          }
        } catch (error) {
          console.error('Error reinitializing CCP after login:', error);
        }
      }, 1000);
    };

    window.addEventListener('connectLoginSuccess', handleLoginSuccess);

    return () => {
      window.removeEventListener('connectLoginSuccess', handleLoginSuccess);
    };
  }, []);

  // Optional: Clear call data when component unmounts
  // Uncomment the following useEffect if you want to clear data when leaving CallPage
  // useEffect(() => {
  //   return () => {
  //     // Only clear if no active call
  //     if (!currentContact) {
  //       clearCallData();
  //     }
  //   };
  // }, [currentContact, clearCallData]);

  return (
    <div className="call-page">
      <div className="call-layout">
        {/* Left Panel - CCP Integration */}
        <div className="call-left-panel">


          {/* CCP Container */}
          <div className="ccp-container">
            <div style={{ position: 'relative' }}>
              {/* CCP Container */}
              <div 
                ref={ccpContainerRef}
                style={{
                  width: '100%',
                  height: '600px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}
              />
              
            </div>
          </div>

          {/* CCP Control Buttons */}
          <div className="ccp-control-buttons">
            <button
              onClick={handleReconnectCCP}
              disabled={isReconnecting}
              style={{
                backgroundColor: isReconnecting ? '#e2e8f0' : '#f1f5f9',
                color: isReconnecting ? '#94a3b8' : '#475569',
                border: '2px solid #e2e8f0',
                padding: '14px 28px',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: isReconnecting ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                minWidth: '150px',
                boxShadow: 'none'
              }}
            >
              {isReconnecting ? 'Reconnecting...' : 'Reconnect'}
            </button>
            <button
              onClick={handleLoginCCP}
              disabled={isReconnecting}
              style={{
                backgroundColor: isReconnecting ? '#e2e8f0' : '#f0f9ff',
                color: isReconnecting ? '#94a3b8' : '#0369a1',
                border: '2px solid #bae6fd',
                padding: '14px 28px',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: isReconnecting ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                minWidth: '150px',
                boxShadow: 'none'
              }}
            >
              Login
            </button>
          </div>

          {/* Status Summary - Commented out for now */}
          {/* 
          <div className="agent-status-section">
            <h3>Status Summary</h3>
            <div className="status-display">
              <div className="status-info">
                <span className="status-label">Agent Status:</span>
                <span className={`status-badge ${agentState.toLowerCase()}`}>
                  {agentState.toUpperCase()}
                </span>
              </div>
              <div className="status-info">
                <span className="status-label">Contact State:</span>
                <span className={`status-badge ${contactState.toLowerCase().replace(' ', '-')}`}>
                  {contactState.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
          */}

        </div>

        {/* Center Panel - Customer Information & Case History */}
        <div className="call-center-panel">
          <div className="panel-header">
            <div className="header-content">
              <h2>{showCaseForm ? 'Create New Case' : 'Customer Information'}</h2>
              {showCaseForm && (
                <button 
                  onClick={handleCaseCancel}
                  className="back-btn"
                >
                  Back
                </button>
              )}
            </div>
          </div>
          
          <div className="call-info-container">
            {showCaseForm ? (
              <CallPageCaseForm 
                initialData={caseFormData}
                onSubmit={handleCaseSubmit}
                onCancel={handleCaseCancel}
              />
            ) : (
              <>
                {/* Customer Information Section */}
                <div className="call-info-section">
                  <h3>Customer Details</h3>
                  {customerInfo ? (
                    <div className="customer-details">
                      <div className="customer-field">
                        <span className="field-label">Name:</span>
                        <span className="field-value">{customerInfo.name}</span>
                      </div>
                      <div className="customer-field">
                        <span className="field-label">Phone:</span>
                        <span className="field-value">{customerInfo.phoneNumber}</span>
                      </div>
                      {customerInfo.totalCases > 0 && (
                        <div className="customer-field">
                          <span className="field-label">Total Cases:</span>
                          <span className="field-value">{customerInfo.totalCases}</span>
                        </div>
                      )}
                      {customerInfo.lastContactDate && (
                        <div className="customer-field">
                          <span className="field-label">Last Contact:</span>
                          <span className="field-value">
                            {new Date(customerInfo.lastContactDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="no-customer-info">
                      <p>No customer information available</p>
                      <p>Customer details will appear when a call is connected</p>
                    </div>
                  )}
                </div>

            {/* Case History Section */}
            <div className="call-info-section">
              <h3>Case History</h3>
              {phoneNumber ? (
                <div className="case-history">
                  {casesLoading ? (
                    <div className="loading-state">
                      <p>Loading case history...</p>
                    </div>
                  ) : casesError ? (
                    <div className="error-state">
                      <p>Error loading cases: {casesError.message}</p>
                    </div>
                  ) : customerCases?.data?.Items?.length > 0 ? (
                    <div className="case-list">
                      {customerCases.data.Items.map((caseItem) => (
                        <div
                          key={caseItem.caseId}
                          className="case-card"
                          onClick={() => navigate(`/cases/${caseItem.caseId}`)}
                        >
                          <div className="case-header">
                            <span
                              className="case-status-dot"
                              style={{
                                background: CASE_STATUS[STATUS_MAP[caseItem.status]]?.color || '#6c757d',
                              }}
                            />
                            <span className="case-id">CASE {caseItem.caseId}</span>
                            <span className="case-status">{CASE_STATUS[STATUS_MAP[caseItem.status?.toLowerCase()] || 0].label.toUpperCase()}</span>
                          </div>
                          <div className="case-details">
                            <div className="case-date">
                              Created: {new Date(caseItem.createdAt).toLocaleDateString()}
                            </div>
                            <div className="case-product">
                              Product: {caseItem.product}
                            </div>
                            <div className="case-summary">
                              {caseItem.summary?.substring(0, 100)}
                              {caseItem.summary?.length > 100 ? '...' : ''}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-cases">
                      <p>No previous cases found for this customer</p>
                      <p className="no-cases-hint">Cases will appear here when they are created with this phone number</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="no-phone">
                  <p>Phone number required to load case history</p>
                </div>
              )}
            </div>
              </>
            )}
          </div>
          
          {/* New Case Buttons - Outside scrollable container */}
          {!showCaseForm && (
            <div className="new-case-buttons">
              <button 
                onClick={handleManualCase}
                className="new-case-btn manual"
              >
                <span className="btn-icon">📝</span>
                Manual Case
              </button>
              <button 
                onClick={handleAICaseGeneration}
                className="new-case-btn ai"
                disabled={isGeneratingCase}
                title="Generate AI case from call transcript"
              >
                <span className="btn-icon">🤖</span>
                {isGeneratingCase ? 'Generating...' : 'AI Case'}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

// CallPage Case Form Component - matches NewCasePage structure exactly
const CallPageCaseForm = ({ initialData, onSubmit, onCancel }) => {
  const parsedPhone = parsePhoneNumber(initialData?.contactNumber);
  
  const [form, setForm] = useState({
    status: initialData?.status || 'pending',
    caseId: initialData?.caseId || '',
    todo: initialData?.todo || '',
    name: initialData?.name || '',
    contactCode: parsedPhone.contactCode,
    contactNumber: parsedPhone.contactNumber,
    email: initialData?.email || '',
    product: initialData?.product || '',
    summary: initialData?.summary || '',
    actions: initialData?.actions || '',
    priority: initialData?.priority || '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate required fields
    const requiredFields = [
      { field: 'name', label: 'Customer Name' },
      { field: 'email', label: 'Email' },
      { field: 'contactNumber', label: 'Contact Number' },
      { field: 'product', label: 'Product Concerned' },
      { field: 'summary', label: 'Summary of Issue' }
    ];

    for (const { field, label } of requiredFields) {
      if (!form[field] || form[field].trim() === '') {
        alert(`${label} is required.`);
        return;
      }
    }
    
    onSubmit(form);
  };

  return (
    <form className="case-form" onSubmit={handleSubmit}>
      <div className="form-section">
        <h3>Case Details:</h3>
        <div className="form-row">
          <label>Case Status:</label>
          <select name="status" value={form.status} onChange={handleChange}>
            <option value="pending">Pending</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div className="form-row">
          <label>Priority:</label>
          <select name="priority" value={form.priority || ''} onChange={handleChange}>
            <option value="" disabled hidden={!!form.priority}>Select priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <div className="date-row">
            <label>Date & Time:</label>
            <span className="date-value">{
              new Date().toLocaleString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })
            }</span>
          </div>
        </div>
      </div>
      <div className="form-section">
        <h3>Customer Details:</h3>
        <div className="form-row">
          <label>Name: <span className="required">*</span></label>
          <input name="name" type="text" value={form.name} onChange={handleChange} placeholder="Enter customer name" />
        </div>
        <div className="form-row">
          <label>Contact number: <span className="required">*</span></label>
          <select name="contactCode" value={form.contactCode} onChange={handleChange}>
            <option>+64</option>
            <option>+61</option>
            <option>+1</option>
          </select>
          <input name="contactNumber" type="text" value={form.contactNumber} onChange={handleChange} placeholder="Phone number" />
        </div>
        <div className="form-row">
          <label>E-mail: <span className="required">*</span></label>
          <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Enter email address" />
        </div>
      </div>
      <div className="form-section">
        <h3>Issue Details:</h3>
        <div className="form-row">
          <label>Product Concerned: <span className="required">*</span></label>
          <input name="product" type="text" value={form.product} onChange={handleChange} placeholder="Enter product name" />
        </div>
        <div className="form-row textarea-row">
          <label>Summary of Issue: <span className="required">*</span></label>
          <textarea name="summary" value={form.summary} onChange={handleChange} placeholder="Describe the issue in detail..." />
        </div>
        <div className="form-row textarea-row">
          <label>Actions Taken During the Call:</label>
          <textarea name="actions" value={form.actions} onChange={handleChange} placeholder="Description..." />
        </div>
        <div className="form-row textarea-row">
          <label>To do:</label>
          <textarea name="todo" value={form.todo || ''} onChange={handleChange} placeholder="List next steps, follow-ups, etc..." />
        </div>
      </div>
      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary">Save</button>
      </div>
    </form>
  );
};

export default CallPage;
