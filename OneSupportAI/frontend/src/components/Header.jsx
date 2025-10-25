import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../hooks/useUser';
import '../styles/components/Header.css';

const Header = () => {
  const { user, logout } = useUser();
  const navigate = useNavigate();
  
  const handleLogoClick = () => {
    navigate('/home');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  return (
    <header className="header">
      <div className="header-content">
        <div className="logo" onClick={handleLogoClick}>
          <span className="logo-icon">🅾</span>
          <span className="logo-text">nesupportai</span>
        </div>
        <div className="user-info">
          <span className="username">{user?.userName || 'User'}</span>
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
