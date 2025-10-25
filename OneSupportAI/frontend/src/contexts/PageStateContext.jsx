import React, { useCallback, useRef } from 'react';
import { PageStateContext } from './PageStateContextDef';

export function PageStateProvider({ children }) {
  // Use useRef to store page state because it does not trigger re-renders
  const pageStates = useRef(new Map());
  
  // Save page state
  const savePageState = useCallback((tabId, state) => {
    pageStates.current.set(tabId, state);
  }, []);

  // Get page state
  const getPageState = useCallback((tabId) => {
    return pageStates.current.get(tabId);
  }, []);

  // Clear page state
  const clearPageState = useCallback((tabId) => {
    pageStates.current.delete(tabId);
  }, []);

  // Check if there is a state
  const hasPageState = useCallback((tabId) => {
    return pageStates.current.has(tabId);
  }, []);

  // Navigation type marker
  const navigationTypeRef = useRef('tab'); // 'tab' or 'navigation'
  
  const setNavigationType = useCallback((type) => {
    navigationTypeRef.current = type;
  }, []);

  const getNavigationType = useCallback(() => {
    return navigationTypeRef.current;
  }, []);

  return (
    <PageStateContext.Provider
      value={{
        savePageState,
        getPageState,
        clearPageState,
        hasPageState,
        setNavigationType,
        getNavigationType
      }}
    >
      {children}
    </PageStateContext.Provider>
  );
}
