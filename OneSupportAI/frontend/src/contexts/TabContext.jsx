import React, { createContext, useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { EXCLUDED_PATHS } from '../hooks/useTab';
import { usePageState } from '../hooks/usePageState';

const TabContext = createContext();
export { TabContext };

export function TabProvider({ children }) {
  const [tabs, setTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [unsavedTabs, setUnsavedTabs] = useState(new Set());
  const navigate = useNavigate();
  const location = useLocation();
  const { setNavigationType, getPageState, savePageState } = usePageState();

  // Save page state when switching tabs
  useEffect(() => {
    if (activeTab) {
      const currentTab = tabs.find(tab => tab.id === activeTab);
      if (currentTab && currentTab.path === location.pathname) {
        const state = {
          pathname: location.pathname,
          search: location.search,
          hash: location.hash,
          formData: document.forms[0]?.elements ? Array.from(document.forms[0].elements).reduce((acc, element) => {
            if (element.name) {
              acc[element.name] = element.value;
            }
            return acc;
          }, {}) : null,
          scrollPosition: {
            x: window.scrollX,
            y: window.scrollY
          }
        };
        savePageState(activeTab, state);
      }
    }
    console.log('components mounted');
  return () => {
    console.log('components unmounted');
  };
  }, [activeTab, location, tabs, savePageState]);

  const addTab = useCallback((path, title, isFromNavigation = false) => {
    if (EXCLUDED_PATHS.includes(path)) {
      return;
    }

    setNavigationType(isFromNavigation ? 'navigation' : 'tab');

    setTabs(prevTabs => {
      const existingTab = prevTabs.find(tab => tab.path === path);
      if (existingTab) {
        setActiveTab(existingTab.id);
        return prevTabs;
      }

      const newTab = {
        id: Date.now(),
        path,
        title,
        timestamp: new Date().toISOString(),
        isFromNavigation
      };

      setActiveTab(newTab.id);
      return [...prevTabs, newTab];
    });
  }, [setNavigationType]);

  const closeTab = useCallback(async (tabId) => {
    const tabToClose = tabs.find(tab => tab.id === tabId);
    if (!tabToClose) return;

    if (unsavedTabs.has(tabId)) {
      const confirmed = window.confirm('There are unsaved changes on this page. Are you sure you want to close it?');
      if (!confirmed) return;
    }

    setTabs(prevTabs => {
      const newTabs = prevTabs.filter(tab => tab.id !== tabId);
      
      if (activeTab === tabId) {
        if (newTabs.length > 0) {
          const index = prevTabs.findIndex(tab => tab.id === tabId);
          const nextTab = newTabs[index] || newTabs[index - 1] || newTabs[0];
          setActiveTab(nextTab.id);
          navigate(nextTab.path);
        } else {
          setActiveTab(null);
          navigate('/home');
        }
      }
      
      return newTabs;
    });

    setUnsavedTabs(prev => {
      const next = new Set(prev);
      next.delete(tabId);
      return next;
    });
  }, [tabs, activeTab, navigate, unsavedTabs]);

  const switchTab = useCallback((tabId) => {
    const tab = tabs.find(tab => tab.id === tabId);
    if (tab) {
      setActiveTab(tabId);

      const savedState = getPageState(tabId);
      if (savedState) {
        navigate({
          pathname: savedState.pathname,
          search: savedState.search,
          hash: savedState.hash
        });

        if (savedState.formData) {
          requestAnimationFrame(() => {
            const form = document.forms[0];
            if (form) {
              Object.entries(savedState.formData).forEach(([name, value]) => {
                const element = form.elements[name];
                if (element) {
                  element.value = value;
                }
              });
            }
          });
        }

        if (savedState.scrollPosition) {
          requestAnimationFrame(() => {
            window.scrollTo(
              savedState.scrollPosition.x,
              savedState.scrollPosition.y
            );
          });
        }
      } else {
        navigate(tab.path);
      }
    }
  }, [tabs, navigate, getPageState]);

  const markTabUnsaved = useCallback((tabId, unsaved = true) => {
    setUnsavedTabs(prev => {
      const next = new Set(prev);
      if (unsaved) {
        next.add(tabId);
      } else {
        next.delete(tabId);
      }
      return next;
    });
  }, []);

  const getActiveTabInfo = useCallback(() => {
    return tabs.find(tab => tab.id === activeTab);
  }, [tabs, activeTab]);

  const value = {
    tabs,
    activeTab,
    addTab,
    closeTab,
    switchTab,
    markTabUnsaved,
    getActiveTabInfo,
    unsavedTabs
  };

  return (
    <TabContext.Provider value={value}>
      {children}
    </TabContext.Provider>
  );
}
