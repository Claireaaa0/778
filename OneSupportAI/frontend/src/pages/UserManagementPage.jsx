import React from 'react';
import { useUser } from '../hooks/useUser';
import UserManagement from '../components/UserManagement';
import '../styles/pages/UserManagementPage.css';

const UserManagementPage = () => {
  const { user } = useUser();

  // Check if user is manager
  if (!user?.isManager) {
    return (
      <div className="user-management-page">
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>You don't have permission to access this page. Manager role required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-management-page">
      <div className="page-header">
        <h1>User Management</h1>
        <p>Manage system users</p>
      </div>
      <div className="content-wrapper">
        <UserManagement />
      </div>
    </div>
  );
};

export default UserManagementPage;
