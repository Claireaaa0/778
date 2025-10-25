import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import './index.css'
import App from './App.jsx'

// Suppress specific Amazon Connect Streams errors that don't affect functionality
const originalConsoleError = console.error;
let errorSuppressionCount = 0;
let lastSuppressionTime = 0;

console.error = (...args) => {
  const message = args.join(' ');
  const now = Date.now();
  
  // Reset suppression counter every 10 seconds
  if (now - lastSuppressionTime > 10000) {
    errorSuppressionCount = 0;
    lastSuppressionTime = now;
  }
  
  // Suppress specific Connect Streams errors
  const shouldSuppress = (
    // PostMessage errors
    (message.includes('Cannot read properties of null') && message.includes('postMessage')) ||
    // Background blur processor errors
    message.includes('background blur processor') ||
    // Amazon Connect Streams internal errors
    (message.includes('amazon-connect-streams') && message.includes('ERROR')) ||
    // CCP initialization errors
    (message.includes('initCCP') && message.includes('ERROR')) ||
    // Logger schedule errors
    (message.includes('Logger.scheduleUpstreamOuterContextCCPLogsPush') && message.includes('ERROR'))
  );
  
  if (shouldSuppress) {
    errorSuppressionCount++;
    // Only show first few instances of each error type
    if (errorSuppressionCount <= 3) {
      originalConsoleError.apply(console, args);
    } else if (errorSuppressionCount === 4) {
      originalConsoleError('... suppressing additional Amazon Connect Streams errors to prevent spam ...');
    }
    return;
  }
  
  originalConsoleError.apply(console, args);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <ToastContainer
      position="top-right"
      autoClose={3000}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="light"
    />
  </StrictMode>,
)