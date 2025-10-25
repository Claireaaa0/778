import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getS3Files, uploadFile, deleteS3File, getPresignedUrl, syncKnowledgeBaseJob } from '../services/documentService';
import '../styles/components/DocumentManagement.css';

const DocumentManagement = () => {
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10); // Fixed page size - always 10 items per page
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(true);
  const tableContainerRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const queryClient = useQueryClient();
  
  // Hide scroll hint after user scrolls horizontally
  useEffect(() => {
    const handleScroll = () => {
      if (tableContainerRef.current && tableContainerRef.current.scrollLeft > 10) {
        setShowScrollHint(false);
      }
    };
    
    const tableContainer = tableContainerRef.current;
    if (tableContainer) {
      tableContainer.addEventListener('scroll', handleScroll);
    }
    
    return () => {
      if (tableContainer) {
        tableContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  // Debug log removed

  // Fetch S3 files
  const { data: filesData, isLoading, error, refetch } = useQuery({
    queryKey: ['s3-files', currentPage, pageSize],
    queryFn: getS3Files,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Upload file mutation
  const uploadMutation = useMutation({
    mutationFn: uploadFile,
    onSuccess: () => {
      queryClient.invalidateQueries(['s3-files']);
      setShowUploadForm(false);
      setSelectedFile(null);
      setUploadProgress(0);
      // Reset to first page to see the new file
      setCurrentPage(1);
    },
    onError: (error) => {
      console.error('Upload error:', error);
      setUploadProgress(0);
    }
  });

  // Delete file mutation
  const deleteMutation = useMutation({
    mutationFn: deleteS3File,
    onSuccess: () => {
      queryClient.invalidateQueries(['s3-files']);
    },
    onError: (error) => {
      console.error('Delete error:', error);
    }
  });

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('Please select a PDF file only.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert('File size must be less than 10MB.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('Please select a file to upload.');
      return;
    }

    try {
      setUploadProgress(0);
      // Simulate progress
      progressIntervalRef.current = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressIntervalRef.current);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      await uploadMutation.mutateAsync(selectedFile);
      clearInterval(progressIntervalRef.current);
      setUploadProgress(100);
    } catch (err) {
      // Clear interval and reset progress on error
      clearInterval(progressIntervalRef.current);
      setUploadProgress(0);
      console.error('Upload error:', err);
    }
  };

  const handleDeleteFile = (fileName) => {
    if (window.confirm(`Are you sure you want to delete "${fileName}"?`)) {
      deleteMutation.mutate(fileName);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePreviewFile = async (fileName) => {
    try {
      const res = await getPresignedUrl(fileName);
      const url = res?.presignedUrl || res?.url || res?.data?.url;
      if (!url) {
        alert('Failed to get file preview URL.');
        return;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Open preview error:', err);
      alert('Failed to open preview. Please try again.');
    }
  };

  const allFiles = filesData?.files || [];
  
  // Client-side search and pagination for S3 files
  const filteredFiles = searchTerm 
    ? allFiles.filter(file => 
        file.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : allFiles;
  
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const files = filteredFiles.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredFiles.length / pageSize);

  // Pagination handlers
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Search handlers
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    
    setIsSearching(true);
    setCurrentPage(1); // Reset to first page when searching
    
    // Simulate search delay for better UX
    setTimeout(() => {
      setIsSearching(false);
    }, 500);
  };

  // Handle knowledge base sync
  const handleSyncKnowledgeBase = async () => {
    setIsSyncing(true);
    try {
      const res = await syncKnowledgeBaseJob();
      // Expect unified response shape { code, message, data: { jobId }, timestamp }
      const message = res?.message || 'Knowledge base sync started';
      const jobId = res?.data?.jobId;
      alert(jobId ? `${message} (job: ${jobId})` : message);
      
    } catch (error) {
      console.error('Knowledge base sync error:', error);
      alert('Failed to sync knowledge base. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Render table content separately for better performance
  const renderTableContent = () => {
    if (isLoading) {
      return (
        <tbody>
          <tr>
            <td colSpan="4" className="loading">
              Loading documents...
            </td>
          </tr>
        </tbody>
      );
    }

    if (error) {
      return (
        <tbody>
          <tr>
            <td colSpan="4" className="error">
              Error loading documents: {error.message}
            </td>
          </tr>
        </tbody>
      );
    }

    if (files.length === 0) {
      return (
        <tbody>
          <tr>
            <td colSpan="4" className="no-data">
              {searchTerm ? 'No documents found matching your search.' : 'No documents found.'}
            </td>
          </tr>
        </tbody>
      );
    }

    return (
      <tbody>
        {files.map((file, index) => (
          <tr key={index}>
            <td className="file-name">
              <button
                className="file-link"
                title="Preview"
                onClick={() => handlePreviewFile(file.Key?.replace('raw/', '') || file.name)}
              >
                <span className="file-icon">📄</span>
                {file.Key?.replace('raw/', '') || file.name}
              </button>
            </td>
            <td>{formatFileSize(file.Size || file.size || 0)}</td>
            <td>{formatDate(file.LastModified || file.lastModified)}</td>
            <td>
              <button
                className="btn-danger btn-sm"
                onClick={() => handleDeleteFile(file.Key?.replace('raw/', '') || file.name)}
                disabled={deleteMutation.isPending}
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    );
  };

  return (
    <div className="document-management">
      <div className="document-management-header">
        <form className="search-form" onSubmit={handleSearchSubmit}>
          <input
            type="text"
            placeholder="Search documents by filename..."
            className="search-input"
            value={searchTerm}
            onChange={handleSearchChange}
          />
          <button 
            type="submit" 
            className="search-button"
            disabled={isSearching}
          >
            {isSearching ? '⏳' : '🔍'}
          </button>
        </form>
        <div className="header-actions">
          <button 
            className="btn-secondary"
            onClick={() => refetch()}
          >
            Refresh
          </button>
          <button 
            className="btn-secondary"
            onClick={handleSyncKnowledgeBase}
            disabled={isSyncing}
          >
            {isSyncing ? '⏳' : '🔄'} Sync KB
          </button>
          <button 
            className="btn-primary"
            onClick={() => {
              setSelectedFile(null);
              setUploadProgress(0);
              setShowUploadForm(true);
            }}
          >
            Upload PDF
          </button>
        </div>
      </div>

      {showUploadForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Upload PDF Document</h3>
              <button 
                className="close-button"
                onClick={() => {
                  setShowUploadForm(false);
                  setSelectedFile(null);
                  setUploadProgress(0);
                }}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleUpload} className="upload-form">
              <div className="form-group">
                <label htmlFor="file">Select PDF File *</label>
                <input
                  type="file"
                  id="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="file-input"
                />
                {selectedFile && (
                  <div className="file-info">
                    <p><strong>Selected:</strong> {selectedFile.name}</p>
                    <p><strong>Size:</strong> {formatFileSize(selectedFile.size)}</p>
                  </div>
                )}
              </div>

              {selectedFile && uploadProgress > 0 && (
                <div className="upload-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <span className="progress-text">{uploadProgress}%</span>
                </div>
              )}

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => {
                    setShowUploadForm(false);
                    setSelectedFile(null);
                    setUploadProgress(0);
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={!selectedFile || uploadMutation.isPending}
                >
                  {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="table-responsive-wrapper">
        {showScrollHint && <div className="scroll-hint">Swipe to see more →</div>}
        <div className="documents-table-container" ref={tableContainerRef}>
          <table className="documents-table">
            <thead>
              <tr>
                <th>File Name</th>
                <th>Size</th>
                <th>Last Modified</th>
                <th>Actions</th>
              </tr>
            </thead>
            {renderTableContent()}
          </table>
          
          {files.length === 0 && (
            <div className="no-documents">
              <p>No documents found in S3 raw folder</p>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <div className="pagination-controls">
            <button
              className="pagination-btn"
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
            >
              Previous
            </button>

            {(() => {
              const renderPageButton = (pageNum) => (
                <button
                  key={pageNum}
                  className={`pagination-btn ${currentPage === pageNum ? 'active' : ''}`}
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </button>
              );

              const pages = [];
              
              // Always show first page
              pages.push(renderPageButton(1));
              
              // Calculate range around current page
              let start = Math.max(2, currentPage - 1);
              let end = Math.min(totalPages - 1, currentPage + 1);
              
              // Add ellipsis after first page if needed
              if (start > 2) {
                pages.push(<span key="ellipsis1" className="page-ellipsis">...</span>);
              }
              
              // Add pages around current page
              for (let i = start; i <= end; i++) {
                pages.push(renderPageButton(i));
              }
              
              // Add ellipsis before last page if needed
              if (end < totalPages - 1) {
                pages.push(<span key="ellipsis2" className="page-ellipsis">...</span>);
              }
              
              // Always show last page if there is more than one page
              if (totalPages > 1) {
                pages.push(renderPageButton(totalPages));
              }
              
              return pages;
            })()}

            <button
              className="pagination-btn"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentManagement;
