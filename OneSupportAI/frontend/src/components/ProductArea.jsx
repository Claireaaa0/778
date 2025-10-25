import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchProductsFromAPI, fetchProductByNameFromAPI, fetchProductsByEmbeddingFromAPI } from '../services/productService';
import productCacheService from '../services/productCacheService';
import '../styles/components/ProductArea.css';
import '../styles/components/ProductCard.css';

const ProductArea = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchQueryFromURL = new URLSearchParams(location.search).get('searchQuery') || '';
  const initialCached = productCacheService.getCachedSearchResults(searchQueryFromURL, 'products') || null;

  const [suggestedProducts, setSuggestedProducts] = useState(()=> initialCached ?? []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(()=> initialCached ?? []);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const loadSuggestedProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // First, try to get products from cache
        const cachedData = productCacheService.getCachedProducts();
        
        if (cachedData) {
          console.log('✅ Using cached products data');
          setSuggestedProducts(cachedData);
          setLoading(false);
          return;
        }
        
        console.log('🔄 Cache miss - fetching from API');
        
        // Fetch first page of products from API
        const response = await fetchProductsFromAPI(1, 8);
        
        // Check if response is successful (backend returns {code, message, data, timestamp})
        if (response.code === 200 && response.data && response.data.products) {
          // Transform API data to match component expectations
          const transformedProducts = response.data.products.map(product => ({
            id: product.id,
            name: product.productName || product.name || 'Unknown Product',
            specifications: getProductSummary(product),
            image: product.image || "/api/placeholder/120/120",
            type: product.type || product.productType,
            originalData: product // Keep original data for detail view
          }));
          
          // Cache the transformed products
          productCacheService.setCachedProducts(transformedProducts);
          
          setSuggestedProducts(transformedProducts);
        } else {
          throw new Error(`API returned error: ${response.message || 'Unknown error'}`);
        }
      } catch (err) {
        console.error('Error loading suggested products:', err);
        
        // Check if it's a token expiration error
        if (err.message && err.message.includes('TOKEN_EXPIRED')) {
          setError('Your session has expired. Please log in again.');
        } else {
          setError('Unable to load products from server. Showing fallback data.');
        }
        // Fallback to empty array if API fails
        setSuggestedProducts([]);
      } finally {
        setLoading(false);
      }
    };

    // if (!initialCached){
      loadSuggestedProducts();
    // } else {
    //   setLoading(false);
    //   setSearchResults(true);
    // }
    
  }, []);

  // Helper function to extract product summary from API data
  const getProductSummary = (product) => {
    // Try to extract key information from Model Details & Options
    if (product['Model Details & Options']) {
      const modelDetails = product['Model Details & Options'];
      
      // Check for Window Specifications
      if (modelDetails['Window Specifications']) {
        const specs = modelDetails['Window Specifications'];
        const type = specs.Type || '';
        const material = specs.Material || '';
        const sizes = specs['Available Sizes'] || {};
        const widthRange = sizes['Width Range'] || '';
        const heightRange = sizes['Height Range'] || '';
        
        return `${type} ${material} - Size: ${widthRange} × ${heightRange}`;
      }
      
      // Check for Construction info
      if (modelDetails['Construction & Framing'] && modelDetails['Construction & Framing']['CONSTRUCTION']) {
        const construction = modelDetails['Construction & Framing']['CONSTRUCTION'][0];
        if (construction && construction.text) {
          return construction.text;
        }
      }
      
      // Check for Energy & Sustainability
      if (modelDetails['Energy & Sustainability'] && modelDetails['Energy & Sustainability']['SUSTAINABLE SOLUTIONS']) {
        const sustainability = modelDetails['Energy & Sustainability']['SUSTAINABLE SOLUTIONS'][0];
        if (sustainability && sustainability.text) {
          return sustainability.text;
        }
      }
    }
    
    // Fallback to basic info
    return `$${product.price || 'Price available'} - ${product.type || 'Product'} specifications available in detail view`;
  };

  // Handle search functionality
  const handleSearch = async (searchQuery) => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      setError(null);
      
      const response = await fetchProductsByEmbeddingFromAPI(searchQuery.trim(), 'products');
      
      if (response.code === 200 && response.data) {
        // Transform the single product result to match our component format
        const transformedProduct =response.data.map(item => ({
          id: item.id,
          name: item.productName || item.name || 'Unknown Product',
          specifications: getProductSummary(response.data),
          image: item.image || "/api/placeholder/120/120",
          type: item.type || item.productType,
          price: item.price,
          originalData: item
        }));
        navigate(`/home?searchQuery=${encodeURIComponent(searchQuery.trim())}`, { replace: true });
        productCacheService.setCachedSearchResults(searchQuery.trim(), 'products', transformedProduct);
        setSearchResults(transformedProduct);
      } else {
        setSearchResults([]);
        setError('No products found matching your search.');
      }
    } catch (err) {
      console.error('Error searching for product:', err);
      setSearchResults([]);
      
      if (err.message && err.message.includes('TOKEN_EXPIRED')) {
        setError('Your session has expired. Please log in again.');
      } else if (err.message && err.message.includes('Product not found')) {
        setError('No products found matching your search.');
      } else {
        setError('Unable to search products. Please try again.');
      }
    } finally {
      setIsSearching(false);
    }
    const searchCache = new URLSearchParams(location.search).get('searchQuery');
    const cachedResults = productCacheService.getCachedSearchResults(searchCache, 'products');

      if (cachedResults) {
        setSearchResults(cachedResults);
        setIsSearching(true);
       }
  };

  // Handle search input change
  const handleSearchInputChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Clear search results when input is cleared
    if (!query.trim()) {
      setSearchResults([]);
      setError(null);
    }
  };

  // Handle search form submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      handleSearch(searchQuery);
    }
  };

  // Handle view details button click
  const handleViewDetails = (product) => {
    // Navigate to product detail page with product data
    navigate(`/product-detail/${product.id}`, { 
      state: { 
        product: product.originalData || product
      } 
    });
  };

  return (
    <main className="product-area">
      <div className="search-section">
        <form className="search-container" onSubmit={handleSearchSubmit}>
          <input 
            type="text" 
            placeholder="Search for product information"
            className="search-input"
            value={searchQuery}
            onChange={handleSearchInputChange}
          />
          <button 
            type="submit" 
            className="search-button"
            disabled={isSearching}
          >
            {isSearching ? '⏳' : '🔍'}
          </button>
        </form>
      </div>
      
      <section className="suggested-section">
        {searchResults.length > 0 ? (
          <>
            <h2 className="section-title">Search Results:</h2>
            <div className="product-grid">
              {searchResults.map(product => (
                <div key={product.id} className="product-card">
                  <div className="product-image">
                    {product.image && product.image !== "/api/placeholder/120/120" ? (
                      <img 
                        src={product.image} 
                        alt={product.name}
                        className="product-image-img"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'block';
                        }}
                      />
                    ) : null}
                    <div className="image-placeholder" style={{display: product.image && product.image !== "/api/placeholder/120/120" ? 'none' : 'block'}}></div>
                  </div>
                  <div className="product-info">
                    <h3 className="product-name">{product.name}</h3>
                    <p className="product-specs">
                      <strong>Specifications:</strong><br/>
                      {product.specifications}
                    </p>
                    <div className="product-actions">
                      <button 
                        className="btn-outline"
                        onClick={() => handleViewDetails(product)}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <h2 className="section-title">Suggested for you:</h2>
            
            {loading && (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Loading products...</p>
              </div>
            )}
            
            {error && !loading && (
              <div className="error-state">
                <p>⚠️ {error}</p>
              </div>
            )}
            
            {!loading && !error && (
              <div className="product-grid">
                {suggestedProducts.map(product => (
                  <div key={product.id} className="product-card">
                    <div className="product-image">
                      {product.image && product.image !== "/api/placeholder/120/120" ? (
                        <img 
                          src={product.image} 
                          alt={product.name}
                          className="product-image-img"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                          }}
                        />
                      ) : null}
                      <div className="image-placeholder" style={{display: product.image && product.image !== "/api/placeholder/120/120" ? 'none' : 'block'}}></div>
                    </div>
                    <div className="product-info">
                      <h3 className="product-name">{product.name}</h3>
                      <p className="product-specs">
                        <strong>Specifications:</strong><br/>
                        {product.specifications}
                      </p>
                      <div className="product-actions">
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => handleViewDetails(product)}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
};

export default ProductArea;
