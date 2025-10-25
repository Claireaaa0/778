// TabStateContext.jsx
import React, { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { usePageState } from '../hooks/usePageState';

export const TabStateProvider = React.memo(({ children, tabs, activeTab, setActiveTab, navigate }) => {
  const { setNavigationType, getPageState, savePageState } = usePageState();
  const location = useLocation();

  // Side effect for saving state
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
  }, [activeTab, location, tabs, savePageState]);

  // Function to switch tabs
  const handleSwitchTab = useCallback((tabId) => {
    const tab = tabs.find(tab => tab.id === tabId);
    if (tab) {
      setActiveTab(tabId);

      // Restore tab state
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
            window.scrollTo(savedState.scrollPosition.x, savedState.scrollPosition.y);
          });
        }
      } else {
        navigate(tab.path);
      }
    }
  }, [tabs, setActiveTab, navigate, getPageState]);

  // Handle navigation type
  useEffect(() => {
    const currentTab = tabs.find(tab => tab.id === activeTab);
    setNavigationType(currentTab?.isFromNavigation ? 'navigation' : 'tab');
  }, [activeTab, setNavigationType, tabs]);

  // Inject handler functions
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { onSwitchTab: handleSwitchTab });
    }
    return child;
  });

  return childrenWithProps;
});
