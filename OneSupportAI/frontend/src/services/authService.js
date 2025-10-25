import { API_CONFIG, API_ENDPOINTS, getAuthHeaders } from '../config/api';

// Login user
export const loginUser = async (email, password) => {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.LOGIN}`, {
      method: 'POST',
      headers: API_CONFIG.HEADERS,
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Login failed: ${response.status}`);
    }

    const result = await response.json();
    
    // Check if the response has the expected structure
    if (result.code !== 200) {
      throw new Error(result.message || 'Login failed');
    }

    const { user, token } = result.data;
    
    // Clear all existing user data before setting new data
    const allKeys = Object.keys(localStorage);
    allKeys.filter(key => 
      key.startsWith('chatHistory_') || 
      key.startsWith('currentConversationId_') || 
      key.startsWith('currentMessage_') ||
      key === 'userInfo' ||
      key === 'authToken'
    ).forEach(key => localStorage.removeItem(key));
    
    // Save new token to localStorage
    if (token) {
      localStorage.setItem('authToken', token);
    }

    // Store new user info in localStorage for persistence
    if (user) {
      localStorage.setItem('userInfo', JSON.stringify(user));
    }

    return {
      success: true,
      user: user,
      token: token,
      message: result.message
    };
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

// Logout user
export const logoutUser = async () => {
  try {
    // Clear all user-specific chat data
    const allKeys = Object.keys(localStorage);
    const chatKeys = allKeys.filter(key => key.startsWith('chatHistory_') || 
                                         key.startsWith('currentConversationId_') || 
                                         key.startsWith('currentMessage_'));
    chatKeys.forEach(key => localStorage.removeItem(key));
    
    // Call backend logout API (if available)
    try {
      await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.LOGOUT}`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    } catch (error) {
      console.log('Backend logout API not available, continuing with local cleanup');
    }
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Clear locally stored authentication information
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userInfo');
  }
};

// Check if user is authenticated
export const isAuthenticated = () => {
  const token = localStorage.getItem('authToken');
  return !!token;
};

// Get current user info
export const getCurrentUser = () => {
  const userStr = localStorage.getItem('userInfo');
  return userStr ? JSON.parse(userStr) : null;
};

// Get current token
export const getCurrentToken = () => {
  return localStorage.getItem('authToken');
};

// Change user password
export const changePassword = async (currentPassword, newPassword) => {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.USERS}/password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        currentPassword,
        newPassword
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle token expiration
      if (response.status === 401) {
        throw new Error('Session expired. Please log in again.');
      }
      
      throw new Error(errorData.message || `Password change failed: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Change password error:', error);
    throw error;
  }
};

// Get user profile
export const getUserProfile = async () => {
  try {
    // First try to get stored user info
    const storedUserInfo = localStorage.getItem('userInfo');
    if (storedUserInfo) {
      try {
        return JSON.parse(storedUserInfo);
      } catch (e) {
        console.warn('Failed to parse stored user info:', e);
      }
    }

    // If no stored info or parsing failed, try to fetch from API
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.USER_PROFILE}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Session expired');
      }
      // Return a default user profile if API is not available in testing
      if (response.status === 404) {
        const defaultProfile = {
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
          role: 'user'
        };
        localStorage.setItem('userInfo', JSON.stringify(defaultProfile));
        return defaultProfile;
      }
      throw new Error('Failed to get user profile');
    }

    const userData = await response.json();
    localStorage.setItem('userInfo', JSON.stringify(userData));
    
    return userData;
  } catch (error) {
    console.error('Get user profile error:', error);
    throw error;
  }
};

// Update user profile
export const updateUserProfile = async (updates) => {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.USER_PROFILE}`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error('Failed to update user profile');
    }

    const updatedData = await response.json();
    // Update local storage with new user data
    localStorage.setItem('userInfo', JSON.stringify(updatedData));
    
    return updatedData;
  } catch (error) {
    console.error('Update user profile error:', error);
    throw error;
  }
};

// Validate user credentials (local validation, for development testing)
export const validateCredentials = () => {
  // In production environment, this function should be removed and loginUser should be used directly
  return null;
};

