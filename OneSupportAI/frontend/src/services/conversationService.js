import { API_CONFIG, API_ENDPOINTS, getAuthHeaders } from '../config/api';

export const getConversationHistory = async (conversationId) => {
  try {
    console.log('Fetching history for conversation:', conversationId);
    
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.AI_CHAT_HISTORY}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ conversation_id: conversationId })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch conversation history');
    }

    const data = await response.json();
    console.log('Raw history data:', data);

    // Transform and validate messages
    const messages = (data.data?.messages || []).map(msg => ({
      id: msg.id || msg.messageId || crypto.randomUUID(),
      sender: msg.sender || (msg.role === 'user' ? 'user' : 'ai'),
      text: msg.text || msg.content || '',
      timestamp: msg.timestamp || msg.createdAt || new Date().toISOString(),
      conversationId: msg.conversationId || conversationId,
      sources: msg.sources || []
    }));

    console.log('Transformed messages:', messages);

    return {
      messages,
      conversationId
    };
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    throw error;
  }
};

export const getConversationList = async ({ page = 1, limit = 10, userId } = {}) => {
  try {
    if (!userId) {
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      userId = userInfo.userID || userInfo.id;
    }
    
    console.log('Fetching conversations with params:', { page, limit, userId }); // Debug log

    const response = await fetch(
      `${API_CONFIG.BASE_URL}${API_ENDPOINTS.AI_CHAT_LIST}?page=${page}&limit=${limit}&userId=${userId}`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to fetch conversation list: ${response.status}`);
    }

    const data = await response.json();
    console.log('API raw response:', data); // Debug log

    // Validate and transform response data
    const conversations = Array.isArray(data.data?.conversations) 
      ? data.data.conversations
          .filter(conv => conv && typeof conv === 'object') // Filter out invalid conversation items
          .map(conv => {
            // Ensure all necessary fields are present
            const conversation = {
              id: conv.conversation_id || conv.id || '',
              title: conv.title || 'Untitled Conversation',
              updatedAt: conv.updated_at || conv.updatedAt || new Date().toISOString(),
              userId: conv.user_id || conv.userId || ''
            };
            
            // Log invalid conversation items for debugging
            if (!conversation.id || !conversation.userId) {
              console.warn('Invalid conversation item:', conv);
            }
            
            return conversation;
          })
      : [];

    return {
      conversations,
      total: data.data?.pagination?.total || conversations.length,
      page: data.data?.pagination?.page || page,
      totalPages: data.data?.pagination?.totalPages || 1,
      hasNext: data.data?.pagination?.hasNext || false,
      hasPrev: data.data?.pagination?.hasPrev || false
    };
  } catch (error) {
    console.error('Error fetching conversation list:', error);
    throw error;
  }
};

// Function to delete a conversation
export const deleteConversation = async (conversationId) => {
  try {
    console.log('Deleting conversation:', conversationId);
    
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.AI_CHAT_DELETE}/${conversationId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (response.status === 401) {
      throw new Error('Unauthorized - Please log in again');
    }
    
    if (response.status === 404) {
      throw new Error('Conversation not found');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to delete conversation');
    }

    const data = await response.json();
    console.log('Delete response:', data);
    
    return {
      success: true,
      conversationId,
      message: data.message || 'Conversation deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting conversation:', error);
    throw error;
  }
};

// Function to update conversation name
export const updateConversationName = async (conversationId, title) => {
  try {
    console.log('Updating conversation name:', { conversationId, title });
    
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.AI_CHAT_RENAME}/${conversationId}/name`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ title })
    });

    if (response.status === 401) {
      throw new Error('Unauthorized - Please log in again');
    }
    
    if (response.status === 400) {
      throw new Error('Invalid title - Title cannot be empty');
    }
    
    if (response.status === 404) {
      throw new Error('Conversation not found');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to update conversation name');
    }

    const data = await response.json();
    console.log('Update response:', data);
    
    return {
      success: true,
      conversationId,
      title: data.data.title,
      updatedAt: data.data.updated_at,
      message: data.message || 'Conversation name updated successfully'
    };
  } catch (error) {
    console.error('Error updating conversation name:', error);
    throw error;
  }
};
