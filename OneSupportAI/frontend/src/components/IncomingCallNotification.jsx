import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConnect } from '../contexts/ConnectContext';
import '../styles/components/IncomingCallNotification.css';

const IncomingCallNotification = () => {
  const [incomingCall, setIncomingCall] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);
  const [contactReady, setContactReady] = useState(false);
  const navigatedRef = useRef(false);
  const navigate = useNavigate();
  const { connectService } = useConnect();

  const wsRef = useRef(null);
  const lastCallIdRef = useRef(null);

  useEffect(() => {
    // Connect to WebSocket for incoming call notifications
    const connectWebSocket = () => {
      const userId = localStorage.getItem('userInfo') ? JSON.parse(localStorage.getItem('userInfo')).userID : null;
      if (!userId) return null;

      const wsUrl = import.meta.env.VITE_WEBSOCKET_URL || 'wss://02cuhyl6v3.execute-api.ap-southeast-2.amazonaws.com/dev';
      if (wsRef.current) return wsRef.current;
      const ws = new WebSocket(`${wsUrl}?userId=${userId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        
        // Subscribe to call notifications
        ws.send(JSON.stringify({ type: 'subscribe_to_calls' }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'INCOMING_CALL') {
            const payload = message.data || {};
            const callId = payload.callId || payload.callerId;
            if (callId && lastCallIdRef.current === callId) {
              // duplicate notification for same call
              return;
            }
            lastCallIdRef.current = callId || null;
            console.log('Incoming call from WebSocket:', payload);
            setIncomingCall(payload);
            setIsVisible(true);
          } else if (message.type === 'CALL_ENDED') {
            setIsVisible(false);
            setIncomingCall(null);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        
        // Only reconnect if it's not a user logout
        const isUserLogout = event.code === 1000; // Normal closure
        const isUserNavigating = !isUserLogout;
        
        if (isUserNavigating) {
          console.log('Reconnecting in 3 seconds...');
          wsRef.current = null;
          setTimeout(connectWebSocket, 3000);
        } else {
          console.log('User logged out, not reconnecting');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      return ws;
    };

    const ws = connectWebSocket();

    // Reflect current Streams state to enable/disable Answer button
    try {
      if (connectService.getCurrentContact()) {
        setContactReady(true);
      }
      connectService.setOnIncomingCall?.(() => {
        setContactReady(true);
      });
      connectService.setOnCallStateChange?.((state) => {
        const newState = state?.newState || state;
        if (newState === 'Ended') {
          setContactReady(false);
        }
        if (newState === 'Connected' && isVisible && incomingCall && !navigatedRef.current) {
          // Call is connected (either via our button or CCP). Auto-navigate once.
          try {
            setIsVisible(false);
            const callId = incomingCall.callerId || incomingCall.callId || 'test-call-' + Date.now();
            navigatedRef.current = true;
            navigate(`/call/${callId}`);
          } catch (_) {}
        }
      });
    } catch (_) {}
    
    return () => {
      if (ws) {
        console.log('Component unmounting, closing WebSocket...');
        ws.close(1000, 'User logged out'); // Normal closure with reason
        wsRef.current = null;
      }
      try { connectService.setOnCallStateChange?.(null); } catch (_) {}
    };
  }, []);


  const handleAnswer = () => {
    if (!incomingCall) return;
    if (isAnswering) return; // debounce

    console.log('=== ENTER CALL PAGE BUTTON CLICKED ===');
    console.log('IncomingCallNotification: incomingCall data:', incomingCall);
    
    setIsAnswering(true);
    
    // Dispatch custom event with customerInfo for CallPage
    if (incomingCall.customerInfo) {
      console.log('IncomingCallNotification: Dispatching incomingCall event with customerInfo:', incomingCall.customerInfo);
      const incomingCallEvent = new CustomEvent('incomingCall', {
        detail: {
          customerInfo: incomingCall.customerInfo,
          callId: incomingCall.callId || incomingCall.callerId
        }
      });
      
      // Store the event globally in case CallPage isn't ready yet
      window.lastIncomingCallEvent = incomingCallEvent;
      
      window.dispatchEvent(incomingCallEvent);
      console.log('IncomingCallNotification: Event dispatched successfully');
    } else {
      console.log('IncomingCallNotification: No customerInfo available in incomingCall');
    }
    
    // Hide the notification first
    setIsVisible(false);
    
    // Navigate to call page with callerId as callId
    const callId = incomingCall.callerId || incomingCall.callId || 'test-call-' + Date.now();
    console.log('IncomingCallNotification: Navigating to call page with callId:', callId);
    navigate(`/call/${callId}`);
    
    // Reset answering state after a short delay
    setTimeout(() => {
      setIsAnswering(false);
    }, 1000);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIncomingCall(null);
  };


  if (!isVisible || !incomingCall) return null;

  return (
    <div className="incoming-call-notification">
      <div className="notification-content">
        <div className="call-header">
          <div className="call-icon">📞</div>
          <div className="call-title">
            <h3>Incoming Call</h3>
            <p className="call-status">Ringing...</p>
          </div>
          <button 
            className="close-btn"
            onClick={handleDismiss}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#666',
              padding: '4px',
              borderRadius: '4px',
              marginLeft: 'auto'
            }}
            title="Dismiss notification"
          >
            ✕
          </button>
        </div>

        <div className="customer-info">
          <div className="info-row">
            <span className="label">Customer:</span>
            <span className="value">{incomingCall.customerInfo.CustomerName}</span>
          </div>
          <div className="info-row">
            <span className="label">Phone:</span>
            <span className="value">{incomingCall.customerInfo.CustomerPhone}</span>
          </div>
          <div className="info-row">
            <span className="label">Last Case:</span>
            <span className="value">{incomingCall.customerInfo.RecentCaseTitle}</span>
          </div>
          <div className="info-row">
            <span className="label">Status:</span>
            <span className="value">{incomingCall.customerInfo.RecentCaseStatus}</span>
          </div>
        </div>

        <div className="call-actions">
          <button 
            className="answer-btn"
            onClick={handleAnswer}
            disabled={isAnswering}
            style={{
              width: '100%',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            {isAnswering ? 'Entering...' : 'Enter Call Page'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallNotification;
