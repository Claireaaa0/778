import React, { useRef, useEffect, useState } from 'react';
import { useUser } from '../hooks/useUser';
import { useChat } from '../hooks/useChat';
import { sendAIMessage } from '../services/aiService';
import '../styles/components/AISidebar.css';

const MIN_WIDTH = 320;
const MAX_WIDTH = 600;

const AISidebar = ({ selectedHistory, onNewChat }) => {
  const [width, setWidth] = useState(MIN_WIDTH);
  const [isDragging, setIsDragging] = useState(false);
  const sidebarRef = useRef(null);
  const { user } = useUser();
  const { 
    currentConversationId, 
    setCurrentConversationId,
    conversationHistory,
    setConversationHistory,
    isLoading,
    setIsLoading,
    currentMessage,
    setCurrentMessage,
    clearChat
  } = useChat();

  // Handle mouse down on resize handle
  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    document.body.style.cursor = 'ew-resize';
    
    // Add resizing class to prevent text selection
    if (sidebarRef.current) {
      sidebarRef.current.classList.add('resizing');
    }
  };

  // Handle mouse move while dragging
  const handleMouseMove = React.useCallback((e) => {
    if (!isDragging) return;
    
    const container = sidebarRef.current?.parentElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    // Calculate the drag position relative to the left edge
    const dragOffset = containerRect.left - e.clientX;
    const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width + dragOffset));
    
    if (container) {
      container.style.width = `${newWidth}px`;
    }
    setWidth(newWidth);
  }, [isDragging, width]);

  // Handle mouse up after dragging
  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
    document.body.style.cursor = '';
    
    // Remove resizing class
    if (sidebarRef.current) {
      sidebarRef.current.classList.remove('resizing');
    }
  }, []);

  // Add and remove event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      // Clean up
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Add ref for chat messages container
  const chatMessagesRef = useRef(null);
  const lastScrollPosition = useRef(0);

  // Save scroll position when user scrolls
  const handleScroll = () => {
    if (chatMessagesRef.current) {
      lastScrollPosition.current = chatMessagesRef.current.scrollTop;
      // Save to localStorage for persistence across page navigation
      localStorage.setItem('aiChatScrollPosition', lastScrollPosition.current.toString());
    }
  };

  // Handle selected history changes
  useEffect(() => {
    if (selectedHistory) {
      console.log('Loading selected history:', selectedHistory);
      
      // Validate and ensure messages are in the correct format
      const validMessages = (selectedHistory.messages || []).map(msg => ({
        id: msg.id || crypto.randomUUID(),
        sender: msg.sender || (msg.role === 'user' ? 'user' : 'ai'),
        text: msg.content || msg.text || '',
        timestamp: msg.timestamp || new Date().toISOString(),
        conversationId: selectedHistory.conversationId || selectedHistory.id,
        sources: msg.sources || [] // Preserve sources from history
      }));

      console.log('Formatted messages:', validMessages);
      
      // Set conversation ID and history from selected history
      setCurrentConversationId(selectedHistory.conversationId || selectedHistory.id);
      setConversationHistory(validMessages);
      
      // Reset loading and current message states
      setIsLoading(false);
      setCurrentMessage('');
      
      // Scroll to top when loading historical conversation
      if (chatMessagesRef.current) {
        chatMessagesRef.current.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }
    }
  }, [selectedHistory, setCurrentConversationId, setConversationHistory, setIsLoading, setCurrentMessage]);

  // Restore scroll position when component mounts or conversation changes
  useEffect(() => {
    if (chatMessagesRef.current && conversationHistory.length > 0 && !selectedHistory) {
      const savedPosition = localStorage.getItem('aiChatScrollPosition');
      if (savedPosition) {
        // Use setTimeout to ensure DOM is fully rendered
        setTimeout(() => {
          if (chatMessagesRef.current) {
            chatMessagesRef.current.scrollTo({
              top: parseInt(savedPosition),
              behavior: 'smooth'
            });
          }
        }, 100);
      } else {
        // If no saved position, scroll to bottom for new conversations
        chatMessagesRef.current.scrollTo({
          top: chatMessagesRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, [conversationHistory, selectedHistory]);

  // Auto-scroll to bottom for new messages
  useEffect(() => {
    if (chatMessagesRef.current && conversationHistory.length > 0) {
      // Only auto-scroll when viewing historical conversation is restored
      if (!selectedHistory) {
        // Check if we have a saved scroll position (user was browsing history)
        const savedPosition = localStorage.getItem('aiChatScrollPosition');
        if (savedPosition) {
          // Restore the saved position instead of scrolling to bottom
          setTimeout(() => {
            if (chatMessagesRef.current) {
              chatMessagesRef.current.scrollTo({
                top: parseInt(savedPosition),
                behavior: 'smooth'
              });
            }
          }, 100);
        } else {
          // No saved position, scroll to bottom (new conversation)
          chatMessagesRef.current.scrollTo({
            top: chatMessagesRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }
    }
  }, [conversationHistory, selectedHistory]);

  // Auto-scroll when loading finishes (AI response complete)
  useEffect(() => {
    if (!isLoading && chatMessagesRef.current && conversationHistory.length > 0 && !selectedHistory) {
      // Only scroll if we just finished loading AND there's no saved scroll position
      // This means user just sent a new message, not browsing history
      const savedPosition = localStorage.getItem('aiChatScrollPosition');
      if (!savedPosition) {
        // Small delay to ensure DOM is updated with new AI response
        setTimeout(() => {
          if (chatMessagesRef.current) {
            chatMessagesRef.current.scrollTo({
              top: chatMessagesRef.current.scrollHeight,
              behavior: 'smooth'
            });
          }
        }, 100);
      }
    }
  }, [isLoading, conversationHistory, selectedHistory]);

  // Format AI answer with bullet points and better readability
  const formatAIAnswer = (text) => {
    if (!text) return '';
    
    // Split by newlines and format each line
    const lines = text.split('\n').filter(line => line.trim());
    
    return lines.map((line, index) => {
      const trimmedLine = line.trim();
      
      // Check if line starts with a dash or bullet point
      if (trimmedLine.startsWith('-') || trimmedLine.startsWith('•')) {
        return (
          <div key={index} className="bullet-point">
            <span className="bullet">•</span>
            <span className="bullet-text">{trimmedLine.substring(1).trim()}</span>
          </div>
        );
      }
      
      // Check if line contains parentheses (likely product IDs)
      if (trimmedLine.includes('(') && trimmedLine.includes(')')) {
        return (
          <div key={index} className="product-line">
            {trimmedLine}
          </div>
        );
      }
      
      // Regular text line
      return (
        <div key={index} className="text-line">
          {trimmedLine}
        </div>
      );
    });
  };

  // Reset conversation when clicking New Chat
  const handleNewChat = () => {
    // Stop any ongoing AI response by setting isLoading to false
    setIsLoading(false);
    // Clear the current conversation ID
    setCurrentConversationId(null);
    // Clear the current message input
    setCurrentMessage('');
    // Clear the chat history
    clearChat();
    // Clear saved scroll position
    localStorage.removeItem('aiChatScrollPosition');
    // Notify parent component if callback exists
    if (onNewChat) {
      onNewChat();
    }
  };

  const suggestions = [
    "How do I measure for a pre-hung door?",
    "What types of windows do you offer?"
  ];

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!currentMessage.trim() || isLoading) return;

    // Generate new conversation ID for new chats
    let conversationId;
    if (!currentConversationId) {
      // This is a new conversation, generate new ID
      conversationId = crypto.randomUUID();
      console.log('Generated new conversation ID:', conversationId);
      setCurrentConversationId(conversationId);
    } else {
      // Continue existing conversation
      conversationId = currentConversationId;
      console.log('Using existing conversation ID:', conversationId);
    }

    const userMsg = {
      id: crypto.randomUUID(),
      sender: 'user',
      text: currentMessage.trim(),
      userId: user?.userID,
      userName: user?.userName,
      timestamp: new Date().toISOString(),
      conversationId
    };

    setConversationHistory(prev => [...prev, userMsg]);
    setCurrentMessage('');
    setIsLoading(true);
    
    // Clear saved scroll position when sending new message
    // This ensures new messages will scroll to bottom
    localStorage.removeItem('aiChatScrollPosition');

    try {
      const res = await sendAIMessage(currentMessage.trim(), conversationId);
      
      if (res.success) {
        const aiMsg = {
          id: res.messageId || crypto.randomUUID(),
          sender: 'ai',
          text: res.response,
          conversationId: res.conversationId || conversationId,
          timestamp: res.timestamp || new Date().toISOString(),
          sources: res.sources || [] // Save sources
        };
        setConversationHistory(prev => [...prev, aiMsg]);
      }
    } catch (error) {
      console.error('Error communicating with AI service:', error);
      
      let errorMessage = 'Sorry, I encountered an error. Please try again.';
      
      // Check if it's a token expiration error
      if (error.message && error.message.includes('401')) {
        errorMessage = 'Your session has expired. Please try your question again.';
      } else if (error.message && error.message.includes('403')) {
        errorMessage = 'You do not have permission to use this feature. Please contact support.';
      } else if (error.message && error.message.includes('500')) {
        errorMessage = 'The AI service is temporarily unavailable. Please try again in a few moments.';
      } else if (error.message && error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Network connection error. Please check your internet connection and try again.';
      }
      
      const errorMsg = {
        id: crypto.randomUUID(),
        sender: 'system',
        text: errorMessage,
        timestamp: new Date().toISOString(),
        conversationId
      };
      setConversationHistory(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Add the width style to the parent container
  useEffect(() => {
    const container = sidebarRef.current?.parentElement;
    if (container) {
      container.style.width = `${width}px`;
      container.style.minWidth = `${width}px`;
    }
  }, [width]);

  return (
    <aside className="ai-sidebar" ref={sidebarRef} style={{ width: '100%' }}>
      <div className="resize-handle" onMouseDown={handleMouseDown}>
        <div className="resize-handle-line"></div>
      </div>
      {!selectedHistory && conversationHistory.length === 0 && (
        <div className="ai-header">
          <div className="ai-header-content">
            <div className="ai-title-section">
              <h2 className="ai-title">AI assistant</h2>
              <p className="ai-greeting">Hi {user?.userName || 'there'}, how can I help you today?</p>
            </div>
            <button className="btn btn-primary btn-sm new-chat-button" onClick={handleNewChat}>
              New Chat
            </button>
          </div>
          <div className="suggestions-section">
            <h3 className="suggestions-title">Suggestions</h3>
            <div className="suggestions-list">
              {suggestions.map((suggestion, index) => (
                <button 
                  key={index}
                  className="btn btn-sm suggestion-item"
                  onClick={() => setCurrentMessage(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {(selectedHistory || conversationHistory.length > 0) && (
        <div className="chat-header">
          <div className="chat-header-content">
            <h2 className="chat-title">AI assistant</h2>
            <button className="btn btn-primary btn-sm new-chat-button" onClick={handleNewChat}>
              New Chat
            </button>
          </div>
          {selectedHistory && (
            <div className="chat-history-info">
              <div className="chat-history-question">{selectedHistory.text}</div>
            </div>
          )}
        </div>
      )}

      <div className="chat-messages" ref={chatMessagesRef} onScroll={handleScroll}>
        {conversationHistory.map((msg) => (
          <div 
            key={msg.id} 
            className={`chat-bubble ${msg.sender}`}
          >
            <div className="message-content">
              {msg.sender === 'ai' ? (
                <>
                  <div className="ai-answer">
                    {formatAIAnswer(msg.text)}
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="ai-sources">
                      <div className="sources-header">
                        <span className="sources-icon">📄</span>
                        <span className="sources-title">Sources</span>
                      </div>
                      <div className="source-item">
                        <a 
                          href={msg.sources[0].preview_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="source-link"
                        >
                          {msg.sources[0].filename} (Page {msg.sources[0].page})
                        </a>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                msg.text
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="chat-bubble ai loading">
            <div className="message-content loading">
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
            </div>
          </div>
        )}
      </div>

      <div className="chat-input-section">
        <form onSubmit={handleSendMessage} className="chat-input-container">
          <input
            type="text"
            placeholder={isLoading ? "AI is responding..." : "Type your message here..."}
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            className="chat-input"
            disabled={isLoading}
          />
          <button 
            type="submit"
            className="btn btn-primary btn-sm send-button"
            disabled={isLoading || !currentMessage.trim()}
          >
            {isLoading ? '...' : '→'}
          </button>
        </form>
      </div>
    </aside>
  );
};

export default AISidebar;
