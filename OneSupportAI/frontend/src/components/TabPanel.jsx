import React from 'react';
import { useTab } from '../hooks/useTab';
import '../styles/components/TabPanel.css';

function TabPanel() {
  const { tabs, activeTab, closeTab, switchTab, unsavedTabs } = useTab();

  return (
    <div className="tab-panel">
      {tabs.map(tab => (
        <div
          key={tab.id}
          className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => switchTab(tab.id)}
        >
          <span className="tab-title">{tab.title}</span>
          {unsavedTabs.has(tab.id) && (
            <span className="unsaved-indicator">•</span>
          )}
          <button
            className="close-tab"
            onClick={(e) => {
              e.stopPropagation();
              closeTab(tab.id);
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export default TabPanel;
