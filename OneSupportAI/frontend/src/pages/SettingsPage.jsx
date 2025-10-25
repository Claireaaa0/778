import React, { useState } from 'react';
import { useUser } from '../hooks/useUser';
import { changePassword } from '../services/authService';
import '../styles/pages/SettingsPage.css';

const SettingsPage = () => {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState('account');
  
  // Account form states - use user context data
  const [accountData, setAccountData] = useState({
    name: user?.userName || 'User',
    email: user?.email,
    password: '••••••••••'
  });
  
  const [editingField, setEditingField] = useState(null);
  // Remove editValue since we don't use it
  
  // Password specific states
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Sync local account data with global user state
  React.useEffect(() => {
    setAccountData(prev => ({
      ...prev,
      name: user?.userName || 'User',
      email: user?.email
    }));
  }, [user?.userName, user?.email]);

  // Handle edit functions
  const handleEdit = (field) => {
    setEditingField(field);
    if (field === 'password') {
      setPasswordForm({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setPasswordErrors({});
    }
  };

  const validatePassword = () => {
    const errors = {};
    
    if (!passwordForm.oldPassword) {
      errors.oldPassword = 'Please enter your current password';
    }
    
    if (!passwordForm.newPassword) {
      errors.newPassword = 'Please enter a new password';
    } else if (passwordForm.newPassword.length < 6) {
      errors.newPassword = 'Password must be at least 6 characters';
    }
    
    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (field) => {
    if (field === 'password' && validatePassword()) {
      setIsChangingPassword(true);
      try {
        // Call the API to change password
        await changePassword(passwordForm.oldPassword, passwordForm.newPassword);
        
        // Success - update UI
        setAccountData(prev => ({
          ...prev,
          password: '••••••••••'
        }));
        setEditingField(null);
        setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
        setPasswordErrors({});
        
        // Show success message (you could add a toast notification here)
        alert('Password changed successfully!');
      } catch (error) {
        console.error('Password change error:', error);
        
        // Handle specific error cases
        if (error.message.includes('Current password is incorrect')) {
          setPasswordErrors({ oldPassword: 'Current password is incorrect' });
        } else if (error.message.includes('New password must be minimum')) {
          setPasswordErrors({ newPassword: error.message });
        } else if (error.message.includes('Session expired')) {
          alert('Your session has expired. Please refresh the page and log in again.');
        } else {
          alert(`Failed to change password: ${error.message}`);
        }
      } finally {
        setIsChangingPassword(false);
      }
    }
  };

  const handleCancel = () => {
    setEditingField(null);
    setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordErrors({});
  };

  const handlePasswordChange = (field, value) => {
    setPasswordForm(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear specific error when user starts typing
    if (passwordErrors[field]) {
      setPasswordErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };



  const renderTabContent = () => {
    switch (activeTab) {
      case 'account':
        return (
          <div className="tab-content">
            <div className="form-group">
              <label>Name:</label>
              <div className="form-field">
                <span>{accountData.name}</span>
                <span className="non-editable">Non-editable</span>
              </div>
            </div>
            <div className="form-group">
              <label>E-mail:</label>
              <div className="form-field">
                <span>{accountData.email}</span>
                <span className="non-editable">Non-editable</span>
              </div>
            </div>
            <div className="form-group">
              <label>Password:</label>
              <div className="form-field">
                {editingField === 'password' ? (
                  <div className="password-edit-mode">
                    <div className="password-input-group">
                      <label className="password-label">Current Password:</label>
                      <input
                        type="password"
                        value={passwordForm.oldPassword}
                        onChange={(e) => handlePasswordChange('oldPassword', e.target.value)}
                        className={`password-input ${passwordErrors.oldPassword ? 'error' : ''}`}
                        placeholder="Enter current password"
                      />
                      {passwordErrors.oldPassword && (
                        <span className="error-message">{passwordErrors.oldPassword}</span>
                      )}
                    </div>
                    
                    <div className="password-input-group">
                      <label className="password-label">New Password:</label>
                      <input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                        className={`password-input ${passwordErrors.newPassword ? 'error' : ''}`}
                        placeholder="Enter new password"
                      />
                      {passwordErrors.newPassword && (
                        <span className="error-message">{passwordErrors.newPassword}</span>
                      )}
                    </div>
                    
                    <div className="password-input-group">
                      <label className="password-label">Confirm New Password:</label>
                      <input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                        className={`password-input ${passwordErrors.confirmPassword ? 'error' : ''}`}
                        placeholder="Confirm new password"
                      />
                      {passwordErrors.confirmPassword && (
                        <span className="error-message">{passwordErrors.confirmPassword}</span>
                      )}
                    </div>
                    
                    <div className="password-actions">
                      <button 
                        className="btn-primary" 
                        onClick={() => handleSave('password')}
                        disabled={isChangingPassword}
                      >
                        {isChangingPassword ? '⏳ Changing...' : '✓ Save'}
                      </button>
                      <button 
                        className="btn-secondary" 
                        onClick={handleCancel}
                        disabled={isChangingPassword}
                      >
                        ✕ Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span>{accountData.password}</span>
                    <button className="btn-secondary btn-sm" onClick={() => handleEdit('password')}>✏️ Edit</button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      case 'support':
        return (
          <div className="tab-content">
            <div className="support-section">
              <h3>Support Contact</h3>
              <p><strong>Email:</strong> onesupportai@gmail.com</p>
              <p><strong>Phone number:</strong> +64 800 035 800</p>
            </div>
            <div className="support-section">
              <h3>Help Resources</h3>
              <button className="help-btn">User Guide - video tutorial</button>
            </div>
          </div>
        );
      case 'about':
        return (
          <div className="tab-content">
            <div className="about-section">
              <p><strong>Current System Version:</strong> v1.3.2</p>
              <p><strong>Model Version:</strong> claude-3</p>
              <p><strong>Last Updated:</strong> 2025-09-24</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="settings-page">
      <main className="settings-area">
        <div className="settings-header">
          <h2>Settings</h2>
        </div>
        <div className="settings-content">
          <div className="settings-tabs">
            <button
              className={`tab-btn ${activeTab === 'account' ? 'active' : ''}`}
              onClick={() => setActiveTab('account')}
            >
              <span className="tab-icon">👤</span>
              Account
            </button>
            <button
              className={`tab-btn ${activeTab === 'support' ? 'active' : ''}`}
              onClick={() => setActiveTab('support')}
            >
              <span className="tab-icon">❓</span>
              Support
            </button>
            <button
              className={`tab-btn ${activeTab === 'about' ? 'active' : ''}`}
              onClick={() => setActiveTab('about')}
            >
              <span className="tab-icon">💬</span>
              About
            </button>
          </div>
          <div className="settings-main">
            {renderTabContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;
