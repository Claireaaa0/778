import exteriorDoorsData from '../data/exteriordoorsDetail.json';
import interiorDoorsData from '../data/interiordoorsDetail.json';
import patiodoorsData from '../data/patiodoorsDetail.json';
import windowsData from '../data/windowsDetail.json';
import { API_CONFIG, getAuthHeaders, API_ENDPOINTS } from '../config/api';
import { handleApiError } from '../utils/errorHelper';
import logger from '../utils/logger';
import productCacheService from './productCacheService.js';

export const getAllProducts = () => {
    return {
        windows: windowsData,
        exteriorDoors: exteriorDoorsData,
        interiorDoors: interiorDoorsData,
        patioDoors: patiodoorsData
    };
};

export const getProductsByType = (type) => {
    switch (type) {
        case 'windows':
            return windowsData;
        case 'exterior-doors':
            return exteriorDoorsData;
        case 'interior-doors':
            return interiorDoorsData;
        case 'patio-doors':
            return patiodoorsData;
        default:
            return [];
    }
};

export const getProductByNameAndType = (name, type) => {
    const products = getProductsByType(type);
    return products.find(product => product.productName === name);
};

// Helper function to handle API responses and token expiration
const handleApiResponse = async (response) => {
  if (!response.ok) {
    // Handle token expiration specifically
    if (response.status === 401) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData.code === 'TOKEN_EXPIRED' || errorData.message?.includes('expired')) {
        // Trigger token expired modal from UserContext
        const { triggerTokenExpiredModal } = await import('../contexts/UserContext');
        if (triggerTokenExpiredModal) {
          triggerTokenExpiredModal();
        }
        throw new Error('TOKEN_EXPIRED: Your session has expired. Please log in again.');
      }
      throw new Error(`Authentication failed: ${errorData.message || 'Unauthorized'}`);
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};



// API-based product services
export const fetchProductsFromAPI = async (page = 1, limit = 10) => {
    try {
        const response = await fetch(
            `${API_CONFIG.BASE_URL}${API_ENDPOINTS.PRODUCTS}?page=${page}&limit=${limit}`,
            {
                method: 'GET',
                headers: getAuthHeaders(),
                timeout: API_CONFIG.TIMEOUT
            }
        );

        const data = await handleApiResponse(response);
        
        // Log the response for debugging
        logger.debug('Products API Response:', data);
        
        return data;
    } catch (error) {
        console.error('Error fetching products from API:', error);
        throw error;
    }
};

export const fetchProductByIdFromAPI = async (id) => {
    try {
        const response = await fetch(
            `${API_CONFIG.BASE_URL}${API_ENDPOINTS.PRODUCT_BY_ID}/${id}`,
            {
                method: 'GET',
                headers: getAuthHeaders(),
                timeout: API_CONFIG.TIMEOUT
            }
        );

        return await handleApiResponse(response);
    } catch (error) {
        console.error('Error fetching product by ID from API:', error);
        throw error;
    }
};

export const fetchProductsByTypeFromAPI = async (type, page = 1, limit = 10) => {
    try {
        const response = await fetch(
            `${API_CONFIG.BASE_URL}${API_ENDPOINTS.PRODUCTS_BY_TYPE}/${type}?page=${page}&limit=${limit}`,
            {
                method: 'GET',
                headers: getAuthHeaders(),
                timeout: API_CONFIG.TIMEOUT
            }
        );

        return await handleApiResponse(response);
    } catch (error) {
        console.error('Error fetching products by type from API:', error);
        throw error;
    }
};

export const fetchProductByNameFromAPI = async (productName) => {
    try {
        const encodedProductName = encodeURIComponent(productName);
        const response = await fetch(
            `${API_CONFIG.BASE_URL}${API_ENDPOINTS.PRODUCT_BY_NAME}/${encodedProductName}`,
            {
                method: 'GET',
                headers: getAuthHeaders(),
                timeout: API_CONFIG.TIMEOUT
            }
        );

        return await handleApiResponse(response);
    } catch (error) {
        console.error('Error fetching product by name from API:', error);
        throw error;
    }
};

export const fetchDoorTypeCountsFromAPI = async () => {
    try {
        const response = await fetch(
            `${API_CONFIG.BASE_URL}${API_ENDPOINTS.DOOR_COUNTS}`,
            {
                method: 'GET',
                headers: getAuthHeaders(),
                timeout: API_CONFIG.TIMEOUT
            }
        );

        return await handleApiResponse(response);
    } catch (error) {
        console.error('Error fetching door type counts from API:', error);
        throw error;
    }
};
//search products by embedding
export const fetchProductsByEmbeddingFromAPI = async (query,searchType) => {
    try {
        const response = await fetch(
            `${API_CONFIG.BASE_URL}${API_ENDPOINTS.PRODUCT_SEARCH}`, // Adjust endpoint as needed
            {
                method: 'POST',
                headers: getAuthHeaders(),
                timeout: API_CONFIG.TIMEOUT,
                body: JSON.stringify({ query, searchType }) // Adjust payload as needed
            }
        );
        console.log('Fetching products by embedding with query:', query, 'and searchType:', searchType);
        const responseData = await handleApiResponse(response);
        console.log('Products by Embedding API Response:', responseData);
        return responseData;
    } catch (error) {
        console.error('Error fetching products by embedding from API:', error);
        throw error;
    }
}

// Cached version of door type counts using unified cache service
export const fetchDoorTypeCountsCached = async () => {
    // Check cache first
    const cachedData = productCacheService.getCachedDoorCounts();
    if (cachedData) {
        console.log('✅ Returning cached door type counts');
        return cachedData;
    }
    
    // If not in cache, fetch from API
    console.log('🔍 Fetching fresh door type counts from API');
    try {
        const data = await fetchDoorTypeCountsFromAPI();
        
        // Cache the result
        productCacheService.setCachedDoorCounts(data);
        
        console.log('✅ Door type counts cached for 1 hour');
        return data;
    } catch (error) {
        console.error('Error fetching door type counts:', error);
        throw error;
    }
};

// Cached Doors homepage list (All Doors first page)
export const fetchDoorsHomepageCached = async (limit = 20) => {
  // Try cache first
  const cached = productCacheService.getCachedDoorsHome();
  if (cached) {
    console.log('✅ Returning cached doors homepage list');
    return cached;
  }

  // Fetch fresh and cache
  const response = await fetchProductsByTypeFromAPI('doors', 1, limit);
  try {
    productCacheService.setCachedDoorsHome(response);
  } catch {}
  return response;
};

// Cached version of suggested products using unified cache service
export const fetchSuggestedProductsCached = async (page = 1, limit = 8) => {
    // Check cache first
    const cachedData = productCacheService.getCachedProducts();
    if (cachedData) {
        console.log('✅ Returning cached suggested products');
        return cachedData;
    }
    
    // If not in cache, fetch from API
    console.log('🔍 Fetching fresh suggested products from API');
    try {
        const data = await fetchProductsFromAPI(page, limit);
        
        // Cache the result
        productCacheService.setCachedProducts(data);
        
        console.log('✅ Suggested products cached for 30 minutes');
        return data;
    } catch (error) {
        console.error('Error fetching suggested products:', error);
        throw error;
    }
};

// Function to clear door counts cache
export const clearDoorCountsCache = () => {
    productCacheService.clearDoorCountsCache();
};

// Function to clear suggested products cache
export const clearSuggestedProductsCache = () => {
    productCacheService.clearCache();
};

// Function to clear all product caches
export const clearAllProductCaches = () => {
    productCacheService.clearAllCaches();
};

// Function to get door counts cache status
export const getDoorCountsCacheStatus = () => {
    return productCacheService.isDoorCountsCacheValid();
};

// Function to get suggested products cache status
export const getSuggestedProductsCacheStatus = () => {
    return productCacheService.isCacheValid();
};

// Function to get all cache info
export const getAllCacheInfo = () => {
    return productCacheService.getCacheInfo();
};
