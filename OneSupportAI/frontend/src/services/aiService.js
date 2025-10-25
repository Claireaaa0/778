import { API_CONFIG, API_ENDPOINTS, getAuthHeaders } from '../config/api';

// Example: Send message to AI chat
export const sendAIMessage = async (message, conversationId = null) => {
  try {
    // get current user infomation
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    
    const response = await fetch(`${API_CONFIG.BASE_URL}/conversation`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        question: message,
        conversation_id: conversationId,
        user_id: userInfo.userID,
        session_id: localStorage.getItem('sessionId')
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle token expiration
      if (response.status === 401) {
        // Trigger token expired modal from UserContext
        const { triggerTokenExpiredModal } = await import('../contexts/UserContext');
        if (triggerTokenExpiredModal) {
          triggerTokenExpiredModal();
        }
        throw new Error('Session expired. Please log in again.');
      }
      
      throw new Error(errorData.message || `AI chat failed: ${response.status}`);
    }

    const result = await response.json();
    
    return {
      success: true,
      response: result.data.answer,
      conversationId: result.data.conversation_id,
      messageId: result.data.message_id,
      timestamp: result.data.processed_at,
      sources: result.data.sources || [],
      confidence: result.data.confidence
    };
  } catch (error) {
    console.error('AI chat error:', error);
    throw error;
  }
};


