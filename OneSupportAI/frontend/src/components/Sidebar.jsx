import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../hooks/useUser';
import '../styles/components/Sidebar.css';


const Sidebar = () => {
  const [expandedItems, setExpandedItems] = useState({ products: true, management: false, cases: false });
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();

  // Determine active item based on current path
  const getActiveItem = () => {
    if (location.pathname === '/doors') return 'doors';
    if (location.pathname === '/windows') return 'windows';
    if (location.pathname === '/ai-history') return 'history';
    if (location.pathname === '/settings') return 'settings';
    if (location.pathname === '/faqs') return 'faqs';
    if (location.pathname === '/management/users') return 'user-management';
    if (location.pathname === '/management/documents') return 'document-management';
    if (location.pathname.includes('/management')) return 'management';
    if (location.pathname === '/cases/dashboard') return 'cases-dashboard';
    if (location.pathname === '/cases') return 'all-cases'; // Updated for All Cases page
    if (location.pathname.includes('/cases')) return 'cases';
    if (location.pathname === '/home') return 'products';
    return 'products';
  };

  const [activeItem, setActiveItem] = useState(getActiveItem());

  // Update active item when location changes
  useEffect(() => {
    let currentActiveItem = 'products';
    if (location.pathname === '/doors') currentActiveItem = 'doors';
    else if (location.pathname === '/windows') currentActiveItem = 'windows';
    else if (location.pathname === '/ai-history') currentActiveItem = 'history';
    else if (location.pathname === '/settings') currentActiveItem = 'settings';
    else if (location.pathname === '/faqs') currentActiveItem = 'faqs';
    else if (location.pathname === '/management/users') currentActiveItem = 'user-management';
    else if (location.pathname === '/management/documents') currentActiveItem = 'document-management';
    else if (location.pathname.includes('/management')) currentActiveItem = 'management';
    else if (location.pathname === '/cases/dashboard') currentActiveItem = 'cases-dashboard';
    else if (location.pathname === '/cases') currentActiveItem = 'all-cases'; // Updated to differentiate between cases menu and all-cases page
    else if (location.pathname.includes('/cases')) currentActiveItem = 'cases';
    else if (location.pathname === '/home') currentActiveItem = 'products';
    setActiveItem(currentActiveItem);

    // Auto-expand items based on current path
    if (location.pathname.includes('/cases')) {
      setExpandedItems(prev => ({ ...prev, cases: true }));
    } else if (location.pathname.includes('/management')) {
      setExpandedItems(prev => ({ ...prev, management: true }));
    } else if (location.pathname === '/doors' || location.pathname === '/windows') {
      setExpandedItems(prev => ({ ...prev, products: true }));
    }
  }, [location.pathname]);

  const toggleExpanded = (item) => {
    setExpandedItems(prev => ({
      ...prev,
      [item]: !prev[item]
    }));
  };

  const handleItemClick = (item) => {
    setActiveItem(item);
    if (item === 'products') {
      toggleExpanded(item);
      // Don't navigate when clicking products, only toggle the dropdown
    } else if (item === 'management') {
      toggleExpanded(item);
      // Don't navigate when clicking management, only toggle the dropdown
    } else if (item === 'cases') {
      toggleExpanded(item);
      // Don't navigate when clicking cases, only toggle the dropdown
    } else if (item === 'history') {
      navigate('/ai-history');
    } else if (item === 'faqs') {
      navigate('/faqs');
    } else if (item === 'settings') {
      navigate('/settings');
    }
  };

  const handleSubitemClick = (subitem) => {
    setActiveItem(subitem);
    if (subitem === 'doors') {
      navigate('/doors');
    } else if (subitem === 'windows') {
      navigate('/windows');
    } else if (subitem === 'cases-dashboard') {
      navigate('/cases/dashboard');
    } else if (subitem === 'user-management') {
      navigate('/management/users');
    } else if (subitem === 'document-management') {
      navigate('/management/documents');
    }
  };

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <nav className="sidebar-nav">
        <div 
          className="sidebar-collapse-button"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <span className="toggle-icon">❮</span>
        </div>

        <div className="nav-item">
          <div className={`nav-item-header ${activeItem === 'products' ? 'active' : ''}`}>
            <div 
              className="nav-content" 
              onClick={() => {
                setActiveItem('products');
                toggleExpanded('products'); // Toggle dropdown
                navigate('/home');
              }}
            >
              <span className="nav-icon">📦</span>
              <span className="nav-text">All products</span>
            </div>
            {/* Arrow is only for expanding/collapsing the submenu */}
            <span 
              className={`nav-arrow ${expandedItems.products ? 'expanded' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded('products');
              }}
            >
              ▼
            </span>
          </div>
          {expandedItems.products && (
            <div className="nav-subitems">
              <div 
                className={`nav-subitem ${activeItem === 'doors' ? 'active' : ''}`}
                onClick={() => handleSubitemClick('doors')}
              >
                Doors
              </div>
              <div 
                className={`nav-subitem ${activeItem === 'windows' ? 'active' : ''}`}
                onClick={() => handleSubitemClick('windows')}
              >
                Windows
              </div>
            </div>
          )}
        </div>
        
        <div className="nav-item">
          <div className={`nav-item-header ${activeItem === 'cases' ? 'active' : ''}`}>
            <div 
              className="nav-content"
              onClick={() => {
                setActiveItem('cases');
                toggleExpanded('cases'); // Toggle dropdown
              }}
            >
              <span className="nav-icon">📁</span>
              <span className="nav-text">Cases</span>
            </div>
            {/* Arrow is only for expanding/collapsing the submenu */}
            <span 
              className={`nav-arrow ${expandedItems.cases ? 'expanded' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded('cases');
              }}
            >
              ▼
            </span>
          </div>
          {expandedItems.cases && (
            <div className="nav-subitems">
              <div 
                className={`nav-subitem ${activeItem === 'all-cases' ? 'active' : ''}`}
                onClick={() => {
                  setActiveItem('all-cases');
                  navigate('/cases');
                }}
              >
                All Cases
              </div>
              <div 
                className={`nav-subitem ${activeItem === 'cases-dashboard' ? 'active' : ''}`}
                onClick={() => handleSubitemClick('cases-dashboard')}
              >
                Cases Dashboard
              </div>
            </div>
          )}
        </div>
        
        <div className="nav-item">
          <div 
            className={`nav-item-header ${activeItem === 'history' ? 'active' : ''}`}
            onClick={() => handleItemClick('history')}
          >
            <span className="nav-icon">🕒</span>
            <span className="nav-text">AI Search history</span>
          </div>
        </div>
        
        <div className="nav-item">
          <div 
            className={`nav-item-header ${activeItem === 'faqs' ? 'active' : ''}`}
            onClick={() => handleItemClick('faqs')}
          >
            <span className="nav-icon">❓</span>
            <span className="nav-text">FAQ's</span>
          </div>
        </div>
        {user?.isManager && (
          <div className="nav-item">
            <div className={`nav-item-header ${activeItem === 'management' ? 'active' : ''}`}>
              <div 
                className="nav-content" 
                onClick={() => {
                  setActiveItem('management');
                  toggleExpanded('management'); // Toggle the dropdown when clicking on management
                }}
              >
                <span className="nav-icon">👨‍💼</span>
                <span className="nav-text">Management</span>
              </div>
              {/* Arrow is only for expanding/collapsing the submenu */}
              <span 
                className={`nav-arrow ${expandedItems.management ? 'expanded' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpanded('management');
                }}
              >
                ▼
              </span>
            </div>
            {expandedItems.management && (
              <div className="nav-subitems">
                <div 
                  className={`nav-subitem ${activeItem === 'user-management' ? 'active' : ''}`}
                  onClick={() => handleSubitemClick('user-management')}
                >
                  User Management
                </div>
                <div 
                  className={`nav-subitem ${activeItem === 'document-management' ? 'active' : ''}`}
                  onClick={() => handleSubitemClick('document-management')}
                >
                  Documents Management
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="nav-item">
          <div 
            className={`nav-item-header ${activeItem === 'settings' ? 'active' : ''}`}
            onClick={() => handleItemClick('settings')}
          >
            <span className="nav-icon">⚙️</span>
            <span className="nav-text">Settings</span>
          </div>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
