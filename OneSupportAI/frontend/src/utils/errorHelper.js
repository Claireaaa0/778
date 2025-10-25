/**
 * Helper function to handle API errors consistently across the application
 * @param {Error} error - The error object from the API call
 * @param {string} [context] - Optional context where the error occurred
 * @throws {Error} - Re-throws a formatted error with additional context
 */
import logger from './logger';

export const handleApiError = (error, context = '') => {
  const baseMessage = error.response?.data?.message || error.message || 'An unknown error occurred';
  const status = error.response?.status;
  const contextPrefix = context ? `[${context}] ` : '';
  
  // Format error message
  const errorMessage = `${contextPrefix}${baseMessage}${status ? ` (Status: ${status})` : ''}`;
  
  // Log error details for debugging in development
  if (import.meta.env.DEV) {
    logger.error('API Error Details:', {
      message: errorMessage,
      status,
      originalError: error,
      context,
    });
  }

  // Handle specific HTTP status codes
  if (status === 401) {
    throw new Error('Authentication required. Please log in again.');
  }
  
  if (status === 403) {
    throw new Error('You do not have permission to perform this action.');
  }
  
  if (status === 404) {
    throw new Error('The requested resource was not found.');
  }
  
  if (status >= 500) {
    throw new Error('A server error occurred. Please try again later.');
  }

  // For all other cases, throw with the formatted message
  throw new Error(errorMessage);
};
