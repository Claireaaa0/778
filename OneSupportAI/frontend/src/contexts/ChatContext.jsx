import React, { useState, useEffect } from 'react';
import { ChatContext } from './ChatContextDef';
import { useUser } from '../hooks/useUser';

export const ChatProvider = ({ children }) => {
  const { user } = useUser();
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');

  // Clear chat data when user changes and load new user's data
  useEffect(() => {
    // First clear current chat data
    setConversationHistory([]);
    setCurrentConversationId(null);
    setCurrentMessage('');
    setIsLoading(false);

    // Then load new user's data if user exists
    if (user?.userID) {
      const savedHistory = localStorage.getItem(`chatHistory_${user.userID}`);
      const savedConversationId = localStorage.getItem(`currentConversationId_${user.userID}`);
      const savedMessage = localStorage.getItem(`currentMessage_${user.userID}`);
      
      if (savedHistory) {
        try {
          setConversationHistory(JSON.parse(savedHistory));
        } catch (e) {
          console.warn('Failed to load chat history:', e);
        }
      }
      if (savedConversationId) {
        setCurrentConversationId(savedConversationId);
      }
      if (savedMessage) {
        setCurrentMessage(savedMessage);
      }
    }
  }, [user?.userID]); // Reload when user changes

  // Save user-specific chat history
  useEffect(() => {
    if (user?.userID) {
      if (conversationHistory.length > 0) {
        localStorage.setItem(`chatHistory_${user.userID}`, JSON.stringify(conversationHistory));
      } else {
        localStorage.removeItem(`chatHistory_${user.userID}`);
      }
    }
  }, [conversationHistory, user?.userID]);

  // Save user-specific conversation ID
  useEffect(() => {
    if (user?.userID) {
      if (currentConversationId) {
        localStorage.setItem(`currentConversationId_${user.userID}`, currentConversationId);
      } else {
        localStorage.removeItem(`currentConversationId_${user.userID}`);
      }
    }
  }, [currentConversationId, user?.userID]);

  // Save user-specific current message
  useEffect(() => {
    if (user?.userID) {
      if (currentMessage) {
        localStorage.setItem(`currentMessage_${user.userID}`, currentMessage);
      } else {
        localStorage.removeItem(`currentMessage_${user.userID}`);
      }
    }
  }, [currentMessage, user?.userID]);

  const clearChat = () => {
    setConversationHistory([]);
    setCurrentConversationId(null);
    setCurrentMessage('');
    if (user?.userID) {
      localStorage.removeItem(`chatHistory_${user.userID}`);
      localStorage.removeItem(`currentConversationId_${user.userID}`);
      localStorage.removeItem(`currentMessage_${user.userID}`);
    }
  };

  const value = {
    currentConversationId,
    setCurrentConversationId,
    conversationHistory,
    setConversationHistory,
    isLoading,
    setIsLoading,
    currentMessage,
    setCurrentMessage,
    clearChat
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
