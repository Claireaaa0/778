import { useCallback, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { usePageState } from './usePageState';

export function useTabState(activeTab, tabs) {
  const { setNavigationType, getPageState, savePageState } = usePageState();
  const location = useLocation();
  const isInitialMount = useRef(true);

  // Save page state when navigating away
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

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
  }, [activeTab, location.pathname, location.search, location.hash, tabs, savePageState]);

  // Restore page state when navigating back
  useEffect(() => {
    if (activeTab) {
      const savedState = getPageState(activeTab);
      if (savedState && savedState.pathname === location.pathname) {
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
      }
    }
  }, [activeTab, location.pathname, location.search, location.hash, getPageState]);

  // Update navigation type based on current tab
  const setTabNavigationType = useCallback((isFromNavigation) => {
    setNavigationType(isFromNavigation ? 'navigation' : 'tab');
  }, [setNavigationType]);

  return {
    setTabNavigationType
  };
}
