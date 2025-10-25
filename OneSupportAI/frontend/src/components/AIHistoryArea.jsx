import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '../hooks/useUser';
import '../styles/components/AIHistoryArea.css';
import { 
  getConversationList, 
  getConversationHistory, 
  deleteConversation,
  updateConversationName 
} from '../services/conversationService';
import { toast } from 'react-toastify';
import ErrorBoundary from './ErrorBoundary';

const PAGE_SIZE = 8;

// Wrapper for the main component content
const AIHistoryContent = ({ onSelectHistory }) => {
  const queryClient = useQueryClient();
  const [manageMode, setManageMode] = useState(false);
  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(1);
  const [loadingHistoryId, setLoadingHistoryId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const editInputRef = useRef(null);
  const { user, isAuthenticated, isLoading: userLoading } = useUser(); // Get current user information
  
  // Debug user state and API request conditions
  useEffect(() => {
    console.log('Current user state:', {
      user,
      userId: user?.userID,
      isAuthenticated,
      userLoading,
      localStorage: {
        userInfo: localStorage.getItem('userInfo'),
        authToken: localStorage.getItem('authToken')
      }
    });
    
    // Log when request will be enabled/disabled
    console.log('API request conditions:', {
      hasUserId: !!user?.userID,
      currentPage: page,
      willMakeRequest: !!user?.userID
    });
  }, [user, isAuthenticated, userLoading, page]);

  const handleStartRename = (item) => {
    if (manageMode) return;
    setEditingId(item.id);
    setEditingTitle(item.title || '');
    setTimeout(() => {
      editInputRef.current?.focus();
    }, 0);
  };

  const handleCancelRename = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const handleRename = async (id) => {
    try {
      if (!editingTitle.trim()) {
        toast.error('Title cannot be empty');
        return;
      }

      const toastId = toast.loading('Updating conversation name...');

      await updateConversationName(id, editingTitle.trim());
      
      toast.update(toastId, {
        render: 'Conversation name updated successfully',
        type: 'success',
        isLoading: false,
        autoClose: 3000
      });

      // Reset edit state
      setEditingId(null);
      setEditingTitle('');

      // Refresh the list
      queryClient.invalidateQueries(['conversations']);
    } catch (error) {
      console.error('Failed to rename conversation:', error);
      
      let errorMessage = 'Failed to update conversation name';
      if (error.message.includes('Unauthorized')) {
        errorMessage = 'Please log in again to rename conversations';
      } else if (error.message.includes('not found')) {
        errorMessage = 'Conversation no longer exists';
      } else if (error.message.includes('Invalid title')) {
        errorMessage = 'Invalid title - Please try again';
      }

      toast.error(errorMessage);
    }
  };

  // Auto-update history when component mounts or auth state changes
  useEffect(() => {
    if (isAuthenticated && user?.userID) {
      queryClient.invalidateQueries(['conversations']);
    }
  }, [isAuthenticated, user?.userID, queryClient]);

  // Fetch conversation list using React Query
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['conversations', page, user?.userID],
    staleTime: 0, // Allow immediate data refetching
    cacheTime: 5 * 60 * 1000, // Keep cache for 5 minutes
    refetchOnMount: true, // Refetch data when component mounts
    refetchOnWindowFocus: false, // Disable auto-refresh on window focus
    queryFn: async () => {
      const userId = user?.userID;
      
      if (!userId) {
        const storedUser = JSON.parse(localStorage.getItem('userInfo') || '{}');
        if (storedUser.userID) {
          console.log('Using stored user ID:', storedUser.userID);
          return await getConversationList({ page, limit: PAGE_SIZE, userId: storedUser.userID });
        }
        console.error('No user ID available');
        throw new Error('User ID is required');
      }
      
      console.log('Starting API request with:', {
        page,
        limit: PAGE_SIZE,
        userId,
        token: localStorage.getItem('authToken')?.substring(0, 10) + '...'
      });
      
      const result = await getConversationList({ 
        page, 
        limit: PAGE_SIZE,
        userId // Pass userId to the API call
      });
      
      console.log('API request completed:', {
        success: true,
        dataReceived: !!result,
        conversationsCount: result?.conversations?.length,
        userId
      });
      
      return result;
    },
    keepPreviousData: true,
    enabled: !!(user?.userID || user?.id),  // Enable if either ID format exists
    onSuccess: (data) => {
      console.log('API Response successful:', {
        data,
        conversationsReceived: data?.conversations?.length,
        totalCount: data?.total,
        currentPage: data?.page
      });
    },
    onError: (error) => {
      console.error('API Error details:', {
        message: error.message,
        stack: error.stack,
        userState: {
          userID: user?.userID,
          isAuthenticated,
          hasToken: !!localStorage.getItem('authToken')
        }
      });
    }
  });

  // Validate and process data
  const conversations = Array.isArray(data?.conversations) ? data.conversations : [];
  const totalCount = data?.total || 0;
  const totalPages = data?.totalPages || 1;
  const hasNext = data?.hasNext || false;
  const hasPrev = data?.hasPrev || false;

  // Debug logging
  console.log('Processed data:', { 
    conversations, 
    totalCount, 
    totalPages,
    hasNext,
    hasPrev,
    rawData: data 
  });

  // Add manual refresh functionality
  const handleRefresh = () => {
    queryClient.invalidateQueries(['conversations']);
  };

  const handleManageClick = () => setManageMode(true);
  const handleCancelManage = () => {
    setManageMode(false);
    setSelected([]);
  };

  const handleSelect = async (id) => {
    if (manageMode) {
      setSelected(selected.includes(id)
        ? selected.filter(item => item !== id)
        : [...selected, id]);
    } else {
      // If already loading, don't load again
      if (loadingHistoryId) return;
      
      setLoadingHistoryId(id);
      try {
        const selectedConversation = data?.conversations?.find(conv => conv.id === id);
        if (selectedConversation && onSelectHistory) {
          await onSelectHistory(selectedConversation);
        }
      } catch (error) {
        console.error('Error selecting conversation:', error);
        toast.error('Failed to load conversation history');
      } finally {
        setLoadingHistoryId(null);
      }
    }
  };

  const handleDelete = async () => {
    try {
      if (selected.length === 0) return;

      // Show loading state
      const toastId = toast.loading(`Deleting ${selected.length} conversation(s)...`);
      
      try {
        // Delete each conversation one by one
        const results = await Promise.allSettled(
          selected.map(conversationId => deleteConversation(conversationId))
        );
        
        // Check results
        const succeeded = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        
        if (failed > 0) {
          // Some deletions failed
          toast.update(toastId, {
            render: `Deleted ${succeeded} conversation(s), ${failed} failed`,
            type: 'warning',
            isLoading: false,
            autoClose: 5000
          });
        } else {
          // All deletions succeeded
          toast.update(toastId, {
            render: `Successfully deleted ${succeeded} conversation(s)`,
            type: 'success',
            isLoading: false,
            autoClose: 3000
          });
        }
        
        // Refresh the list
        queryClient.invalidateQueries(['conversations']);
        
        // Reset state
        setSelected([]);
        setManageMode(false);
      } catch (error) {
        // Handle specific error cases
        let errorMessage = 'Failed to delete conversations';
        if (error.message.includes('Unauthorized')) {
          errorMessage = 'Please log in again to delete conversations';
        } else if (error.message.includes('not found')) {
          errorMessage = 'One or more conversations no longer exist';
        }
        
        toast.update(toastId, {
          render: errorMessage,
          type: 'error',
          isLoading: false,
          autoClose: 5000
        });
      }
    } catch (error) {
      console.error('Failed to delete conversations:', error);
    }
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  if (isLoading) {
    return (
      <main className="ai-history-area">
        <div className="loading">Loading conversations...</div>
      </main>
    );
  }

  if (isError) {
    console.error('Detailed error:', error);
    return (
      <main className="ai-history-area">
        <div className="error">
          Error loading conversations: {error?.message || 'Please try again.'}
          {!user?.userID && <div>Please log in to view conversation history.</div>}
        </div>
      </main>
    );
  }
  
  // Check if user data is still loading
  if (userLoading) {
    return (
      <main className="ai-history-area">
        <div className="loading">Loading user information...</div>
      </main>
    );
  }

  // Check authentication and user data
  if (!isAuthenticated || !user?.id) {
    const storedUserInfo = localStorage.getItem('userInfo');
    const storedAuthToken = localStorage.getItem('authToken');
    console.log('Authentication check:', {
      isAuthenticated,
      userID: user?.userID,
      storedUserInfo,
      storedAuthToken
    });
    
    return (
      <main className="ai-history-area">
        <div className="notice">
          Please log in to view your conversation history.
          <br />
          {storedUserInfo && storedAuthToken ? 
            <small>Refreshing user session...</small> :
            <small>No stored credentials found</small>
          }
        </div>
      </main>
    );
  }

  return (
    <main className="ai-history-area">
      <div className="history-header">
        <h2>AI Search History</h2>
        <div className="history-actions">
          {!manageMode ? (
            <>
              <button className="btn btn-text" onClick={handleRefresh}>
                ⟳ Refresh
              </button>
              <button className="btn btn-text" onClick={handleManageClick}>
                Manage History
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={selected.length === 0}>
                Delete
              </button>
              <button className="btn btn-text btn-sm" onClick={handleCancelManage}>
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
      <section className="history-section">
        <div className="history-list-box">
          <div className="history-list">
            {conversations.length === 0 && <div className="no-history">No history found.</div>}
            {conversations.map(item => {
              // Ensure required fields exist
              if (!item?.id || !item?.title) {
                console.warn('Invalid conversation item:', item);
                return null;
              }

              return (
                <div
                  key={item.id}
                  className={`history-row${!manageMode ? ' clickable' : ''} ${loadingHistoryId === item.id ? 'loading' : ''}`}
                  onClick={async (e) => {
                    // if editing, stop propagation
                    if (editingId === item.id) {
                      e.stopPropagation();
                      return;
                    }
                    if (!manageMode && loadingHistoryId !== item.id) {
                      try {
                        setLoadingHistoryId(item.id);
                        // Fetch detailed conversation history
                        const historyData = await getConversationHistory(item.id);
                        // Transform and pass conversation data
                        const formattedMessages = (historyData.messages || []).map(msg => ({
                          id: msg.id || crypto.randomUUID(),
                          sender: msg.sender || (msg.role === 'user' ? 'user' : 'ai'),
                          text: msg.content || msg.text || '',
                          timestamp: msg.timestamp || new Date().toISOString(),
                          conversationId: item.id,
                          sources: msg.sources || []
                        }));

                        onSelectHistory({
                          id: item.id,
                          title: item.title,
                          messages: formattedMessages,
                          timestamp: item.updatedAt,
                          conversationId: item.id,
                          isHistoryView: true
                        });
                      } catch (error) {
                        console.error('Failed to load conversation history:', error);
                        // Show error message to user
                        alert('Failed to load conversation history. Please try again.');
                      } finally {
                        setLoadingHistoryId(null);
                      }
                    }
                  }}
                  style={{ cursor: !manageMode ? 'pointer' : 'default' }}
                >
                  {manageMode && (
                    <input
                      type="checkbox"
                      checked={selected.includes(item.id)}
                      onChange={() => handleSelect(item.id)}
                    />
                  )}
                  <div className="history-content">
                    {editingId === item.id ? (
                      <div className="history-edit-container" onClick={e => e.stopPropagation()}>
                        <input
                          ref={editInputRef}
                          type="text"
                          className="history-edit-input"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleRename(item.id);
                            } else if (e.key === 'Escape') {
                              handleCancelRename();
                            }
                          }}
                          placeholder="Enter new title"
                        />
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleRename(item.id)}
                        >
                          Save
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={handleCancelRename}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="history-text-container">
                          <span className="history-text">
                            {item.title || 'Untitled Conversation'}
                          </span>
                          {!manageMode && (
                            <button
                              className="history-edit-icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartRename(item);
                              }}
                              title="Rename conversation"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                          )}
                        </div>
                        {loadingHistoryId === item.id && (
                          <span className="loading-indicator">Loading...</span>
                        )}
                        <span className="history-date">
                          {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : 'No date'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {totalPages > 1 && (
          <div className="history-pagination">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handlePageChange(page - 1)}
              disabled={!hasPrev}
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
              <button
                key={num}
                className={`btn btn-secondary btn-sm ${num === page ? 'active' : ''}`}
                onClick={() => handlePageChange(num)}
              >
                {num}
              </button>
            ))}
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handlePageChange(page + 1)}
              disabled={!hasNext}
            >
              Next
            </button>
          </div>
        )}
      </section>
    </main>
  );
};

// Main component with error boundary
const AIHistoryArea = (props) => {
  const queryClient = useQueryClient();

  return (
    <ErrorBoundary
      onRetry={() => {
        // Invalidate and refetch data on retry
        queryClient.invalidateQueries(['conversations']);
      }}
    >
      <AIHistoryContent {...props} />
    </ErrorBoundary>
  );
};

export default AIHistoryArea;
