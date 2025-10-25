// API Configuration File
export const API_CONFIG = {
  // Backend API base URL - modify according to your backend service address
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  
  // Request timeout
  TIMEOUT: import.meta.env.VITE_API_TIMEOUT || 10000,
  
  // Request headers configuration
  HEADERS: {
    'Content-Type': 'application/json',
  }
};

// Create request headers with authentication
export const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    ...API_CONFIG.HEADERS,
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// API endpoints
export const API_ENDPOINTS = {
  // Authentication endpoints
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  REFRESH_TOKEN: '/auth/refresh',
  USER_PROFILE: '/user/profile',
  
  // User management endpoints
  USERS: '/users',
  
  // Document management endpoints
  // Specific to raw folder
  S3_FILES_RAW: '/s3/files/raw',
  S3_UPLOAD_RAW: '/s3/upload/raw',
  S3_PRESIGNED_URL_RAW: '/s3/presigned-url/raw',

  // Knowledge base jobs
  JOBS_KB_SYNC: '/jobs/kb/sync',
  
  // AI endpoints
  AI_CHAT: '/conversation',
  AI_CHAT_HISTORY: '/conversation/history',
  AI_CHAT_LIST: '/conversation/list',
  AI_CHAT_USER_LIST: '/conversation/user/list',  // Add user-specific endpoint
  AI_CHAT_DELETE: '/conversation', // DELETE /{conversation_id}
  AI_CHAT_RENAME: '/conversation', // PUT /{conversation_id}/name
  
  CASES: '/cases',
  CASES_SEARCH: '/cases/search',
  
  // Product endpoints
  PRODUCTS: '/products',
  PRODUCT_BY_ID: '/products',
  PRODUCT_SEARCH: '/products/search',//search by embedding
  PRODUCTS_BY_TYPE: '/products/type',
  PRODUCT_BY_NAME: '/products/name',
  DOOR_COUNTS: '/products/door-counts',

  // Transcript endpoints
  TRANSCRIPT_GENERATE_CASE: '/transcript',
  TRANSCRIPT_GET: '/transcript',

};

