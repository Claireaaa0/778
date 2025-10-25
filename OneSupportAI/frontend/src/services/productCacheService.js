/**
 * Product Cache Service
 * Manages caching of product data to avoid unnecessary API calls
 */

import logger from '../utils/logger';

// Suggested products cache (home recommendations)
const PRODUCT_CACHE_KEY = 'product_cache';
const PRODUCT_CACHE_EXPIRY_KEY = 'suggested_products_cache_expiry';
const PRODUCT_CACHE_DURATION = 3 * 60 * 60 * 1000; // 3 hours

// Door counts cache
const DOOR_COUNTS_CACHE_KEY = 'door_counts_cache';
const DOOR_COUNTS_CACHE_EXPIRY_KEY = 'door_counts_cache_expiry';
const DOOR_COUNTS_CACHE_DURATION = 3 * 60 * 60 * 1000; // 3 hours

// Doors homepage list cache (All Doors first page)
const DOORS_HOME_CACHE_KEY = 'doors_home_cache';
const DOORS_HOME_CACHE_EXPIRY_KEY = 'doors_home_cache_expiry';
const DOORS_HOME_CACHE_DURATION = 3 * 60 * 60 * 1000; // 3 hours

class ProductCacheService {
  constructor() {
    this.memoryCache = null;
    this.memoryCacheExpiry = null;
    this.doorCountsMemoryCache = null;
    this.doorCountsMemoryCacheExpiry = null;
    this.searchResultsCache = {}; // In-memory cache for search results
    this.productDetailCache = new Map();//cache for productdetail page
  }

  /**
   * Get cached products from memory or localStorage
   * @returns {Object|null} Cached products data or null if expired/not found
   */
  getCachedProducts() {
    // First check memory cache
    if (this.memoryCache && this.memoryCacheExpiry && Date.now() < this.memoryCacheExpiry) {
      logger.debug('📦 Using memory cache for products');
      return this.memoryCache;
    }

    // Then check localStorage
    try {
      const cachedData = localStorage.getItem(PRODUCT_CACHE_KEY);
      const cacheExpiry = localStorage.getItem(PRODUCT_CACHE_EXPIRY_KEY);
      
      if (cachedData && cacheExpiry && Date.now() < parseInt(cacheExpiry)) {
        const parsedData = JSON.parse(cachedData);
        logger.debug('💾 Using localStorage cache for products');
        
        // Update memory cache
        this.memoryCache = parsedData;
        this.memoryCacheExpiry = parseInt(cacheExpiry);
        
        return parsedData;
      }
    } catch (error) {
      console.warn('Error reading from localStorage cache:', error);
    }

    console.log('❌ No valid cache found');
    return null;
  }

  /**
   * Cache products data in both memory and localStorage
   * @param {Object} productsData - The products data to cache
   */
  setCachedProducts(productsData) {
    const expiryTime = Date.now() + PRODUCT_CACHE_DURATION;
    
    // Update memory cache
    this.memoryCache = productsData;
    this.memoryCacheExpiry = expiryTime;
    
    // Update localStorage cache
    try {
      localStorage.setItem(PRODUCT_CACHE_KEY, JSON.stringify(productsData));
      localStorage.setItem(PRODUCT_CACHE_EXPIRY_KEY, expiryTime.toString());
      console.log('💾 Products cached successfully (expires in 3 hours)');
    } catch (error) {
      console.warn('Error saving to localStorage cache:', error);
    }
  }

  /**
   * Get cached door type counts from memory only
   * @returns {Object|null} Cached door counts data or null if expired/not found
   */
  getCachedDoorCounts() {
    // Check memory cache first
    if (this.doorCountsMemoryCache && this.doorCountsMemoryCacheExpiry && Date.now() < this.doorCountsMemoryCacheExpiry) {
      console.log('📦 Using memory cache for door counts');
      return this.doorCountsMemoryCache;
    }

    // Fallback to localStorage
    try {
      const cachedData = localStorage.getItem(DOOR_COUNTS_CACHE_KEY);
      const cacheExpiry = localStorage.getItem(DOOR_COUNTS_CACHE_EXPIRY_KEY);
      if (cachedData && cacheExpiry && Date.now() < parseInt(cacheExpiry)) {
        const parsed = JSON.parse(cachedData);
        // hydrate memory
        this.doorCountsMemoryCache = parsed;
        this.doorCountsMemoryCacheExpiry = parseInt(cacheExpiry);
        console.log('💾 Using localStorage cache for door counts');
        return parsed;
      }
    } catch (error) {
      console.warn('Error reading door counts from localStorage cache:', error);
    }

    console.log('❌ No valid door counts cache found');
    return null;
  }

  /**
   * Cache door type counts data in memory only
   * @param {Object} doorCountsData - The door counts data to cache
   */
  setCachedDoorCounts(doorCountsData) {
    const expiryTime = Date.now() + DOOR_COUNTS_CACHE_DURATION;
    // Update memory
    this.doorCountsMemoryCache = doorCountsData;
    this.doorCountsMemoryCacheExpiry = expiryTime;
    // Persist to localStorage
    try {
      localStorage.setItem(DOOR_COUNTS_CACHE_KEY, JSON.stringify(doorCountsData));
      localStorage.setItem(DOOR_COUNTS_CACHE_EXPIRY_KEY, expiryTime.toString());
      console.log('💾 Door counts cached (memory + localStorage)');
    } catch (error) {
      console.warn('Error saving door counts to localStorage cache:', error);
    }
  }

  //cache search results in memory only
  getCachedSearchResults(query, searchType) {
    const key = `${searchType}::${query}`;
    const cachedEntry = this.searchResultsCache[key];
    if (cachedEntry && Date.now() < cachedEntry.expiry) {
      console.log(`📦 Using memory cache for search results: ${key}`);
      return cachedEntry.results;
    }
    console.log(`❌ No valid cache for search results: ${key}`);
    return null;
  }

  setCachedSearchResults(query, searchType, results) {
    const key = `${searchType}::${query}`;
    const expiryTime = Date.now() + 5 * 60 * 1000; // Cache search results for 5 minutes
    this.searchResultsCache[key] = {
      results,
      expiry: expiryTime
    };
    console.log(`📦 Search results cached in memory: ${key} (expires in 5 minutes)`);
  }

//cache for productdetail
  getCachedProductDetail(id){
    return this.productDetailCache.get(id)
  }

  setCachedProductDetail(id,productData){
    this.productDetailCache.set(id,productData);
    console.log(`Product detail cached for ID: ${id}`);
  }

  clearProductDetailCache(id){
    if(id){
      this.productDetailCache.delete(id);
      console.log(`Cleared cache for product ID: ${id}`);
    } else {
      this.productDetailCache.delete()
      console.log('clear all product detail cache');
    }
  }



  /**
   * Clear all cached products data
   */
  clearCache() {
    // Clear memory cache
    this.memoryCache = null;
    this.memoryCacheExpiry = null;
    
    // Clear localStorage cache
    try {
      localStorage.removeItem(PRODUCT_CACHE_KEY);
      localStorage.removeItem(PRODUCT_CACHE_EXPIRY_KEY);
      console.log('🗑️ Product cache cleared');
    } catch (error) {
      console.warn('Error clearing localStorage cache:', error);
    }
  }

  /**
   * Clear door counts cache
   */
  clearDoorCountsCache() {
    // Clear memory cache only
    this.doorCountsMemoryCache = null;
    this.doorCountsMemoryCacheExpiry = null;
    
    // Clear localStorage cache
    try {
      localStorage.removeItem(DOOR_COUNTS_CACHE_KEY);
      localStorage.removeItem(DOOR_COUNTS_CACHE_EXPIRY_KEY);
    } catch (error) {
      console.warn('Error clearing door counts localStorage cache:', error);
    }
    console.log('🗑️ Door counts memory cache cleared');
  }

  /**
   * Clear all caches
   */
  clearAllCaches() {
    this.clearCache();
    this.clearDoorCountsCache();
    console.log('🗑️ All caches cleared');
  }

  /**
   * Check if products cache is valid (not expired)
   * @returns {boolean} True if cache is valid
   */
  isCacheValid() {
    // Check memory cache first
    if (this.memoryCache && this.memoryCacheExpiry && Date.now() < this.memoryCacheExpiry) {
      return true;
    }

    // Check localStorage cache
    try {
      const cacheExpiry = localStorage.getItem(PRODUCT_CACHE_EXPIRY_KEY);
      return cacheExpiry && Date.now() < parseInt(cacheExpiry);
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if door counts cache is valid (not expired)
   * @returns {boolean} True if cache is valid
   */
  isDoorCountsCacheValid() {
    if (this.doorCountsMemoryCache && this.doorCountsMemoryCacheExpiry && Date.now() < this.doorCountsMemoryCacheExpiry) {
      return true;
    }

    // Check localStorage cache
    try {
      const cacheExpiry = localStorage.getItem(DOOR_COUNTS_CACHE_EXPIRY_KEY);
      return cacheExpiry && Date.now() < parseInt(cacheExpiry);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get cache info for debugging
   * @returns {Object} Cache information
   */
  getCacheInfo() {
    const memoryValid = this.memoryCache && this.memoryCacheExpiry && Date.now() < this.memoryCacheExpiry;
    const localStorageValid = this.isCacheValid();
    const doorCountsMemoryValid = this.doorCountsMemoryCache && this.doorCountsMemoryCacheExpiry && Date.now() < this.doorCountsMemoryCacheExpiry;
    const doorCountsLocalStorageValid = this.isDoorCountsCacheValid();
    
    return {
      productsCache: {
        memoryCache: {
          exists: !!this.memoryCache,
          valid: memoryValid,
          expiry: this.memoryCacheExpiry ? new Date(this.memoryCacheExpiry).toLocaleString() : null
        },
        localStorageCache: {
          valid: localStorageValid,
          expiry: (() => {
            try {
              const expiry = localStorage.getItem(PRODUCT_CACHE_EXPIRY_KEY);
              return expiry ? new Date(parseInt(expiry)).toLocaleString() : null;
            } catch {
              return null;
            }
          })()
        }
      },
      doorCountsCache: {
        memoryCache: {
          exists: !!this.doorCountsMemoryCache,
          valid: doorCountsMemoryValid,
          expiry: this.doorCountsMemoryCacheExpiry ? new Date(this.doorCountsMemoryCacheExpiry).toLocaleString() : null
        },
        localStorageCache: {
          valid: doorCountsLocalStorageValid,
          expiry: (() => {
            try {
              const expiry = localStorage.getItem(DOOR_COUNTS_CACHE_EXPIRY_KEY);
              return expiry ? new Date(parseInt(expiry)).toLocaleString() : null;
            } catch {
              return null;
            }
          })()
        }
      }
    };
  }

  /**
   * Force refresh cache by clearing it
   */
  forceRefresh() {
    this.clearAllCaches();
    console.log('🔄 All caches refresh forced');
  }

  /**
   * Doors homepage cache (All Doors first page)
   */
  getCachedDoorsHome() {
    try {
      const cached = localStorage.getItem(DOORS_HOME_CACHE_KEY);
      const expiry = localStorage.getItem(DOORS_HOME_CACHE_EXPIRY_KEY);
      if (cached && expiry && Date.now() < parseInt(expiry)) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Error reading doors home cache:', error);
    }
    return null;
  }

  setCachedDoorsHome(data) {
    const expiry = Date.now() + DOORS_HOME_CACHE_DURATION;
    try {
      localStorage.setItem(DOORS_HOME_CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(DOORS_HOME_CACHE_EXPIRY_KEY, expiry.toString());
    } catch (error) {
      console.warn('Error writing doors home cache:', error);
    }
  }

  clearDoorsHomeCache() {
    try {
      localStorage.removeItem(DOORS_HOME_CACHE_KEY);
      localStorage.removeItem(DOORS_HOME_CACHE_EXPIRY_KEY);
    } catch {}
  }
}

// Create singleton instance
const productCacheService = new ProductCacheService();

export default productCacheService;
