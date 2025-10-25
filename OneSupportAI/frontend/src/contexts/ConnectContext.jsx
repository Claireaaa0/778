import React, { createContext, useContext, useState, useEffect } from 'react';
import connectService from '../services/connectService';

const ConnectContext = createContext();

export const useConnect = () => {
  const context = useContext(ConnectContext);
  if (!context) {
    throw new Error('useConnect must be used within a ConnectProvider');
  }
  return context;
};

export const ConnectProvider = ({ children }) => {
  const [agentState, setAgentState] = useState('Available');
  const [contactState, setContactState] = useState('No Contact');
  const [connectStatus, setConnectStatus] = useState('disconnected');
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentContact, setCurrentContact] = useState(null);
  const [currentAgent, setCurrentAgent] = useState(null);

  useEffect(() => {
    // Initialize Connect Service once
    const initializeConnect = async () => {
      if (!connectService.isInitialized) {
        try {
          await connectService.initialize();
          setIsInitialized(true);
          setConnectStatus('ready');
          
          // Add state monitoring
          console.log('Connect initialized, CCP ready for embedding');
        } catch (error) {
          console.error('Failed to initialize Connect Service:', error);
          setConnectStatus('error');
          setIsInitialized(true); // Mark as initialized to prevent retries
        }
      } else {
        setIsInitialized(true);
        setConnectStatus('ready');
        console.log('Connect already initialized, CCP ready for embedding');
      }
    };

    // Add a small delay to prevent race conditions
    const timer = setTimeout(initializeConnect, 100);
    
    return () => clearTimeout(timer);

    // Set up global state listeners
    connectService.setOnAgentStateChange((agentStateChange) => {
      if (agentStateChange?.newState) {
        setAgentState(agentStateChange.newState);
      }
    });

    connectService.setOnContactStateChange((contactStateChange) => {
      if (contactStateChange?.newState) {
        setContactState(contactStateChange.newState);
      }
    });

    // Listen for Connect Streams ready event
    const handleConnectStreamsReady = (event) => {
      setConnectStatus('ready');
      const agent = event.detail?.agent || connectService.getCurrentAgent();
      if (agent) {
        setCurrentAgent(agent);
        setAgentState(agent.getState().name);
      }
    };

    // Listen for Connect errors
    const handleConnectError = (event) => {
      setConnectStatus('error');
    };

    window.addEventListener('connectStreamsReady', handleConnectStreamsReady);
    window.addEventListener('connectError', handleConnectError);

    // Clean up listeners
    return () => {
      window.removeEventListener('connectStreamsReady', handleConnectStreamsReady);
      window.removeEventListener('connectError', handleConnectError);
    };
  }, []);

  // Update current contact when it changes
  useEffect(() => {
    const updateCurrentContact = () => {
      const contact = connectService.getCurrentContact();
      setCurrentContact(contact);
    };

    // Check for contact changes periodically
    const interval = setInterval(updateCurrentContact, 1000);
    updateCurrentContact(); // Initial check

    return () => clearInterval(interval);
  }, []);

  const value = {
    agentState,
    contactState,
    connectStatus,
    isInitialized,
    currentContact,
    currentAgent,
    connectService
  };

  return (
    <ConnectContext.Provider value={value}>
      {children}
    </ConnectContext.Provider>
  );
};
