import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../hooks/useUser';

const AuthGuard = ({ children }) => {
  const { isAuthenticated, isLoading } = useUser();

  // Show loading state if loading
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  // Redirect to login page if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Show protected content if authenticated
  return <>{children}</>;
};

export default AuthGuard;
