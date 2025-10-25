import React, { useEffect } from 'react';
import { usePageState } from '../contexts/PageStateContext';
import { useTab } from '../hooks/useTab';

export function withPageState(WrappedComponent, stateKey) {
  return function WithPageStateComponent(props) {
    const { getPageState, savePageState, clearPageState, getNavigationType } = usePageState();
    const { activeTab } = useTab();

    // Save state on component unmount (if switching tabs)
    useEffect(() => {
      return () => {
        if (getNavigationType() === 'tab') {
          const state = {
            formData: {},
            customState: {},
            scrollPosition: {
              x: window.scrollX,
              y: window.scrollY
            }
          };

            // Get form data
          document.querySelectorAll(`[data-state-key="${stateKey}"]`).forEach(element => {
            if (element.name || element.id) {
              const key = element.name || element.id;
              
                // Handle different types of form elements
              if (element.type === 'checkbox' || element.type === 'radio') {
                state.formData[key] = element.checked;
              } else if (element.type === 'select-multiple') {
                state.formData[key] = Array.from(element.selectedOptions).map(opt => opt.value);
              } else if (element.type === 'file') {
                // Do not save file input, but save file names
                state.formData[key] = Array.from(element.files).map(f => f.name);
              } else {
                state.formData[key] = element.value;
              }
            }
          });

            // Get custom state
          if (window[stateKey]) {
            state.customState = window[stateKey];
          }

          savePageState(activeTab, state);
        }
      };
    }, [activeTab, savePageState, getNavigationType]);

    // Restore state when component loads
    useEffect(() => {
      const savedState = getPageState(activeTab);
      if (savedState) {
        // Restore form data
        if (savedState.formData) {
          Object.entries(savedState.formData).forEach(([key, value]) => {
            const element = document.querySelector(`[data-state-key="${stateKey}"][name="${key}"]`) || 
                          document.getElementById(key);
            
            if (element) {
              if (element.type === 'checkbox' || element.type === 'radio') {
                element.checked = value;
              } else if (element.type === 'select-multiple' && Array.isArray(value)) {
                Array.from(element.options).forEach(option => {
                  option.selected = value.includes(option.value);
                });
              } else {
                element.value = value;
              }
            }
          });
        }

        // Restore custom state
        if (savedState.customState && window[stateKey]) {
          window[stateKey] = savedState.customState;
        }

        // Restore scroll position
        if (savedState.scrollPosition) {
          requestAnimationFrame(() => {
            window.scrollTo(
              savedState.scrollPosition.x,
              savedState.scrollPosition.y
            );
          });
        }
      }
    }, [activeTab, getPageState]);

    // Clear state on component unmount if opened via navigation bar
    useEffect(() => {
      return () => {
        if (getNavigationType() === 'navigation') {
          clearPageState(activeTab);
        }
      };
    }, [activeTab, clearPageState, getNavigationType]);

    return <WrappedComponent {...props} />;
  };
}
