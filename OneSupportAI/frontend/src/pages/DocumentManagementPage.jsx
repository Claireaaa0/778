import React from 'react';
import { useUser } from '../hooks/useUser';
import DocumentManagement from '../components/DocumentManagement';
import '../styles/pages/DocumentManagementPage.css';

const DocumentManagementPage = () => {
  const { user } = useUser();

  // Check if user is manager
  if (!user?.isManager) {
    return (
      <div className="document-management-page">
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>You don't have permission to access this page. Manager role required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="document-management-page">
      <div className="page-header">
        <h1>Documents Management</h1>
        <p>Manage S3 documents</p>
      </div>
      <div className="content-wrapper">
        <DocumentManagement />
      </div>
    </div>
  );
};

export default DocumentManagementPage;
