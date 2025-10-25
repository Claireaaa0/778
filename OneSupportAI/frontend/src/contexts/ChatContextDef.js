import { createContext } from 'react';

export const ChatContext = createContext({
  currentConversationId: null,
  setCurrentConversationId: () => {},
  conversationHistory: [],
  setConversationHistory: () => {},
  isLoading: false,
  setIsLoading: () => {},
  currentMessage: '',
  setCurrentMessage: () => {},
  clearChat: () => {}
});
