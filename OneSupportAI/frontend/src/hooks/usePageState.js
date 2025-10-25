import { useContext } from 'react';
import { PageStateContext } from '../contexts/PageStateContextDef';

export function usePageState() {
  const context = useContext(PageStateContext);
  if (!context) {
    throw new Error('usePageState must be used within a PageStateProvider');
  }
  return context;
}
