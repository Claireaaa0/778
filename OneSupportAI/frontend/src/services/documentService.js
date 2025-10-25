import { API_CONFIG, API_ENDPOINTS, getAuthHeaders } from '../config/api';

// Get S3 files from raw folder
export const getS3Files = async () => {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.S3_FILES_RAW}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Session expired. Please log in again.');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to fetch S3 files: ${response.status}`);
    }

    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.error('Get S3 files error:', error);
    throw error;
  }
};

// Upload file to S3 raw folder
export const uploadFile = async (file) => {
  try {
    const token = localStorage.getItem('authToken');
    
    // Convert file to base64
    const fileData = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]); // Remove data:application/pdf;base64, prefix
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const requestBody = {
      fileName: file.name,
      fileData: fileData,
      contentType: file.type
    };

    const response = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.S3_UPLOAD_RAW}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Session expired. Please log in again.');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to upload file: ${response.status}`);
    }

    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.error('Upload file error:', error);
    throw error;
  }
};

// Delete file from S3
export const deleteS3File = async (fileName) => {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.S3_FILES_RAW}/${encodeURIComponent(fileName)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Session expired. Please log in again.');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to delete file: ${response.status}`);
    }

    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.error('Delete S3 file error:', error);
    throw error;
  }
};

// Get presigned URL for file download
export const getPresignedUrl = async (fileName) => {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.S3_PRESIGNED_URL_RAW}/${encodeURIComponent(fileName)}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Session expired. Please log in again.');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to get presigned URL: ${response.status}`);
    }

    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.error('Get presigned URL error:', error);
    throw error;
  }
};

// Trigger knowledge base sync job (Manager only)
export const syncKnowledgeBaseJob = async () => {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.JOBS_KB_SYNC}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Session expired. Please log in again.');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to start KB sync: ${response.status}`);
    }

    const result = await response.json();
    // Unified format: { code, message, data, timestamp }
    return result;
  } catch (error) {
    console.error('KB sync error:', error);
    throw error;
  }
};
