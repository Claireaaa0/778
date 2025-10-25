import { useContext } from 'react';
import { TabContext } from '../contexts/TabContext';

// Paths that don't need tabs
export const EXCLUDED_PATHS = ['/login', '/'];

export function useTab() {
  const context = useContext(TabContext);
  if (!context) {
    throw new Error('useTab must be used within a TabProvider');
  }
  return context;
}
