import React, { useContext } from 'react';
import AIHistoryArea from '../components/AIHistoryArea';
import '../styles/pages/AIHistoryPage.css';
import { ChatContext } from '../contexts/ChatContextDef';
import { getConversationHistory } from '../services/conversationService';

const AIHistoryPage = () => {
  const { setConversationHistory, setCurrentConversationId } = useContext(ChatContext);

  const handleSelectHistory = async (conversation) => {
    try {
      if (!conversation?.id) return;
      
      // Get complete conversation history
      const history = await getConversationHistory(conversation.id);
      if (history && history.messages) {
        // Update ChatContext
        setCurrentConversationId(conversation.id);
        setConversationHistory(history.messages);
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
    }
  };

  return (
    <div className="history-page-layout">
      <AIHistoryArea onSelectHistory={handleSelectHistory} />
    </div>
  );
};

export default AIHistoryPage;
