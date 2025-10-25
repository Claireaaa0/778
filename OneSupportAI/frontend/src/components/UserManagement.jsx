import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllUsers, createUser, deleteUser } from '../services/userService';
import '../styles/components/UserManagement.css';

const UserManagement = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    userPosition: 'user'
  });
  const [errors, setErrors] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10); // Fixed page size - always 10 items per page
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(true);
  const tableContainerRef = useRef(null);
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

  // Debug: Log page size to confirm it's fixed
  console.log('UserManagement pageSize:', pageSize);

  // Fetch users
  const { data: usersData, isLoading, error } = useQuery({
    queryKey: ['users', currentPage, pageSize, searchTerm],
    queryFn: () => getAllUsers({ page: currentPage, limit: pageSize, search: searchTerm }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      setShowAddForm(false);
      setFormData({ name: '', email: '', password: '', userPosition: 'user' });
      setErrors({});
      // Reset to first page to see the new user
      setCurrentPage(1);
    },
    onError: (error) => {
      setErrors({ submit: error.message });
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      // If current page becomes empty, go to previous page
      if (usersData?.pagination?.total > 0) {
        const totalPages = Math.ceil((usersData.pagination.total - 1) / pageSize);
        if (currentPage > totalPages) {
          setCurrentPage(Math.max(1, totalPages));
        }
      }
    },
    onError: (error) => {
      console.error('Delete user error:', error);
    }
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length > 50) {
      newErrors.name = 'Name must be less than 50 characters';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    } else if (formData.email.length > 100) {
      newErrors.email = 'Email must be less than 100 characters';
    }
    
    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (!formData.userPosition) {
      newErrors.userPosition = 'User position is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      createUserMutation.mutate(formData);
    }
  };

  const handleDeleteUser = (userId, userName) => {
    if (window.confirm(`Are you sure you want to delete user "${userName}"?`)) {
      deleteUserMutation.mutate(userId);
    }
  };

  const users = usersData?.users || [];
  const pagination = usersData?.pagination || {};

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
    if (currentPage < pagination.totalPages) {
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
    
    // The search will be handled by React Query automatically
    // Reset searching state after a short delay for better UX
    setTimeout(() => {
      setIsSearching(false);
    }, 300);
  };

  // Render table content separately for better performance
  const renderTableContent = () => {
    if (isLoading) {
      return (
        <tbody>
          <tr>
            <td colSpan="5" className="loading">
              Loading users...
            </td>
          </tr>
        </tbody>
      );
    }

    if (error) {
      return (
        <tbody>
          <tr>
            <td colSpan="5" className="error">
              Error loading users: {error.message}
            </td>
          </tr>
        </tbody>
      );
    }

    if (users.length === 0) {
      return (
        <tbody>
          <tr>
            <td colSpan="5" className="no-data">
              {searchTerm ? 'No users found matching your search.' : 'No users found.'}
            </td>
          </tr>
        </tbody>
      );
    }

    return (
      <tbody>
        {users.map((user) => (
          <tr key={user.id}>
            <td>{user.userName}</td>
            <td>{user.email}</td>
            <td>
              <span className={`position-badge ${user.userPosition?.toLowerCase()}`}>
                {user.userPosition || 'User'}
              </span>
            </td>
            <td>{user.Entry_Time || 'N/A'}</td>
            <td>
              <button
                className="btn-danger btn-sm"
                onClick={() => handleDeleteUser(user.id, user.userName)}
                disabled={deleteUserMutation.isPending}
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
    <div className="user-management">
      <div className="user-management-header">
        <form className="search-form" onSubmit={handleSearchSubmit}>
          <input
            type="text"
            placeholder="Search users by name or email..."
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
        <button 
          className="btn-primary"
          onClick={() => setShowAddForm(true)}
        >
          Add New User
        </button>
      </div>

      {showAddForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add New User</h3>
              <button 
                className="close-button"
                onClick={() => {
                  setShowAddForm(false);
                  setFormData({ name: '', email: '', password: '', userPosition: 'user' });
                  setErrors({});
                }}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="user-form">
              <div className="form-group">
                <label htmlFor="name">Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={errors.name ? 'error' : ''}
                  placeholder="Enter user name"
                />
                {errors.name && <span className="error-message">{errors.name}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={errors.email ? 'error' : ''}
                  placeholder="Enter email address"
                />
                {errors.email && <span className="error-message">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="password">Password *</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={errors.password ? 'error' : ''}
                  placeholder="Enter password"
                />
                {errors.password && <span className="error-message">{errors.password}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="userPosition">Position *</label>
                <select
                  id="userPosition"
                  name="userPosition"
                  value={formData.userPosition}
                  onChange={handleInputChange}
                  className={errors.userPosition ? 'error' : ''}
                >
                  <option value="user">User</option>
                  <option value="Manager">Manager</option>
                </select>
                {errors.userPosition && <span className="error-message">{errors.userPosition}</span>}
              </div>

              {errors.submit && <div className="error-message">{errors.submit}</div>}

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => {
                    setShowAddForm(false);
                    setFormData({ name: '', email: '', password: '', userPosition: 'user' });
                    setErrors({});
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={createUserMutation.isPending}
                >
                  {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="table-responsive-wrapper">
        {showScrollHint && <div className="scroll-hint">Swipe to see more →</div>}
        <div className="users-table-container" ref={tableContainerRef}>
          <table className="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Position</th>
                <th>Entry Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            {renderTableContent()}
          </table>
          
          {users.length === 0 && (
            <div className="no-users">
              <p>No users found</p>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
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
              let end = Math.min(pagination.totalPages - 1, currentPage + 1);
              
              // Add ellipsis after first page if needed
              if (start > 2) {
                pages.push(<span key="ellipsis1" className="page-ellipsis">...</span>);
              }
              
              // Add pages around current page
              for (let i = start; i <= end; i++) {
                pages.push(renderPageButton(i));
              }
              
              // Add ellipsis before last page if needed
              if (end < pagination.totalPages - 1) {
                pages.push(<span key="ellipsis2" className="page-ellipsis">...</span>);
              }
              
              // Always show last page if there is more than one page
              if (pagination.totalPages > 1) {
                pages.push(renderPageButton(pagination.totalPages));
              }
              
              return pages;
            })()}

            <button
              className="pagination-btn"
              onClick={handleNextPage}
              disabled={currentPage === pagination.totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
