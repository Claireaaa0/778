import React, { useEffect } from 'react';
import { useUser } from '../hooks/useUser';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import TabPanel from './TabPanel';
import Sidebar from './Sidebar';
import AISidebar from './AISidebar';
import '../styles/components/Layout.css';
import { useTab } from '../hooks/useTab';

const Layout = () => {
  const { isLoading } = useUser();
  const location = useLocation();
  const { addTab } = useTab();

  // Listen for route changes and automatically add tabs
  useEffect(() => {
    const path = location.pathname;
    const title = getTitleFromPath(path);
    // Always add the current path to tabs
    addTab(path, title);
  }, [location.pathname, addTab]);

  // Generate tab title from path
  const getTitleFromPath = (path) => {
    const segments = path.split('/').filter(Boolean);
    if (segments.length === 0) return 'Home';
    
    const lastSegment = segments[segments.length - 1];
    // Map of special path segments to display titles
    const titleMap = {
      'faqs': 'FAQs',
      'ai-history': 'AI History',
      'settings': 'Settings',
      'windows': 'Windows',
      'doors': 'Doors',
      'product-detail': 'Product Detail'
    };

    // Return mapped title if exists, otherwise format the path segment
    return titleMap[lastSegment] || lastSegment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Show loading state if loading
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  // Define pages that should not show AI sidebar
  const noAISidebarPages = ['/cases/dashboard', '/settings'];
  const shouldShowAISidebar = !noAISidebarPages.includes(location.pathname);

  // Define pages that should not show tab panel
  const noTabPages = ['/login', '/'];
  const alwaysShowTabPages = ['/faqs', '/settings', '/ai-history', '/windows', '/doors', '/product-detail'];
  const shouldShowTabPanel = !noTabPages.includes(location.pathname) || alwaysShowTabPages.some(page => location.pathname.startsWith(page));

  return (
    <div className="layout">
      <Header />
      <div className="layout-content">
        <div className="layout-sidebar">
          <Sidebar />
        </div>
        <div className={`layout-main ${shouldShowAISidebar ? '' : 'no-ai-sidebar'}`}>
          <div className="main-content">
            {shouldShowTabPanel && <TabPanel />}
            <div className="page-content">
              <Outlet />
            </div>
          </div>
          {shouldShowAISidebar && (
            <div className="ai-sidebar-container">
              <AISidebar />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Layout;
