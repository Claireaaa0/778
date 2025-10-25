import React, { useState, useEffect } from 'react';
import { UserContext } from './UserContextDef';
import { logoutUser } from '../services/authService';

// Helper function to parse stored user info
const parseStoredUserInfo = () => {
  try {
    const storedInfo = localStorage.getItem('userInfo');
    if (!storedInfo) return null;
    
    const parsed = JSON.parse(storedInfo);
    const userID = parsed.userID || parsed.id;
    const isManager = parsed.isManager || parsed.userPosition === 'Manager'; // Keep both validation methods
    
    return {
      ...parsed,
      userID,
      id: userID,
      isManager
    };
  } catch (e) {
    console.error('Failed to parse stored user info:', e);
    return null;
  }
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);
  const [token, setToken] = useState(null);
  const [showTokenExpiredModal, setShowTokenExpiredModal] = useState(false);

  // Initialize user state from localStorage
  useEffect(() => {
    const checkAuthStatus = () => {
      try {
        const storedUserInfo = localStorage.getItem('userInfo');
        const storedAuthToken = localStorage.getItem('authToken');
        
        console.log('Checking stored credentials:', {
          hasUserInfo: !!storedUserInfo,
          hasAuthToken: !!storedAuthToken
        });
        
        if (storedUserInfo && storedAuthToken) {
          const userData = parseStoredUserInfo();
          if (userData) {
            // Use isManager directly from stored data
            setUser(userData);  // userData should already have isManager from login
            setToken(storedAuthToken);
            setIsAuth(true);
            console.log('User data loaded:', userData);
          }
        }
      } catch (error) {
        console.error('Failed to check auth status:', error);
        setIsAuth(false);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Function to show token expired modal (called from API error handlers)
  const triggerTokenExpiredModal = () => {
    console.log('Showing token expired modal from API error');
    setShowTokenExpiredModal(true);
  };

  // Update user information
  const updateUser = (userData, newToken) => {
    if (!userData || !newToken) {
      console.error('Invalid user data or token');
      return;
    }

    const userID = userData.userID || userData.id;
    const processedUser = {
      ...userData,
      userID,
      id: userID,
      isManager: userData.isManager // Ensure isManager flag is preserved
    };

    // First clean up any existing user data
    Object.keys(localStorage)
      .filter(key => key.startsWith('chatHistory_') || 
                    key.startsWith('currentConversationId_') || 
                    key.startsWith('currentMessage_') ||
                    key === 'userInfo' ||
                    key === 'authToken')
      .forEach(key => localStorage.removeItem(key));

    setUser(processedUser);
    setToken(newToken);
    setIsAuth(true);
    
    // Hide token expired modal if it was showing
    setShowTokenExpiredModal(false);
    
    try {
      localStorage.setItem('userInfo', JSON.stringify(processedUser));
      localStorage.setItem('authToken', newToken);
      console.log('Successfully stored user data:', processedUser);
    } catch (error) {
      console.error('Failed to store user data:', error);
    }
  };

  // Handle logout
  const logout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userInfo');
      // Clear all chat related data
      Object.keys(localStorage)
        .filter(key => key.startsWith('chatHistory_') || 
                      key.startsWith('currentConversationId_') || 
                      key.startsWith('currentMessage_'))
        .forEach(key => localStorage.removeItem(key));
      setUser(null);
      setIsAuth(false);
      setToken(null);
      setShowTokenExpiredModal(false);
    }
  };

  // Handle token expired modal
  const handleTokenExpiredConfirm = () => {
    setShowTokenExpiredModal(false);
    logout();
    // Redirect to login page
    window.location.href = '/login';
  };

  const handleTokenExpiredCancel = () => {
    // Hide modal and let user continue (they can try API calls again)
    setShowTokenExpiredModal(false);
  };

  const value = {
    user,
    isAuthenticated: isAuth,
    isLoading,
    token,
    updateUser,
    logout,
    triggerTokenExpiredModal: triggerTokenExpiredModal, // Expose the function to show modal
    handleTokenExpiredConfirm,
    handleTokenExpiredCancel
  };

  return (
    <UserContext.Provider value={value}>
      {children}
      
      {/* Global Token Expired Modal */}
      {showTokenExpiredModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Session Expired</h3>
            </div>
            <div className="modal-body">
              <p>Your session has expired due to inactivity. Please log in again to continue.</p>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-secondary" 
                onClick={handleTokenExpiredCancel}
              >
                Stay on Page
              </button>
              <button 
                className="btn-primary" 
                onClick={handleTokenExpiredConfirm}
              >
                Log In Again
              </button>
            </div>
          </div>
        </div>
      )}
    </UserContext.Provider>
  );
};
