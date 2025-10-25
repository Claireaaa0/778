import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchProductsByTypeFromAPI, fetchProductByNameFromAPI, fetchProductsByEmbeddingFromAPI } from '../services/productService';
import '../styles/components/WindowsArea.css';
import '../styles/components/ProductCard.css';
import productCacheService from '../services/productCacheService';
// Define itemsPerPage as a constant
const ITEMS_PER_PAGE = 20;

const WindowsArea = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchQueryFromURL = new URLSearchParams(location.search).get('searchQuery') || '';
  const initialCached = productCacheService.getCachedSearchResults(searchQueryFromURL, 'windows')||null;

  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState(() => initialCached ?? []);
  const [filteredProducts, setFilteredProducts] = useState(() => initialCached ?? []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchResult, setIsSearchResult] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: ITEMS_PER_PAGE
  });
  //const searchCache = useRef({query: '', results: []});

  useEffect(() => {
  const loadWindows = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchProductsByTypeFromAPI('windows', page, ITEMS_PER_PAGE);

      if (response.code === 200 && response.data && response.data.products) {
        setProducts(response.data.products);
        setFilteredProducts(response.data.products);
        setIsSearchResult(false);

        if (response.data.pagination) {
          setPagination(prev => ({
            ...prev,
            currentPage: response.data.pagination.page,
            totalPages: response.data.pagination.totalPages,
            totalItems: response.data.pagination.total
          }));
        }
      } else {
        throw new Error(`API returned error: ${response.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error loading windows:', err);
      setError(err.message);
      setProducts([]);
      setFilteredProducts([]);
    } finally {
      setLoading(false);
    }
  };

  if (!initialCached) {
    // 🚨 Only call API when no cache is available
    loadWindows(1);
  } else {
    console.log("✅ Using cached rendering, no API call");
    setLoading(false);
    setIsSearchResult(true);
  }

  console.log('components mounted');
  return () => {
    console.log('components unmounted');
  };
}, [initialCached]);


  const handleSearch = async (searchQuery) => {
    if (!searchQuery.trim()) {
      setFilteredProducts(products);
      setIsSearchResult(false);
      return;
    }

    try {
      setIsSearching(true);
      setError(null);
      
      const response = await fetchProductsByEmbeddingFromAPI(searchQuery.trim(), 'windows');
      if (response.code === 200 && response.data) {
        // Transform the single product result to match our component format
        const transformedProducts = response.data.map(item => ({
          ...item,
        }));
        navigate(`/windows?searchQuery=${encodeURIComponent(searchQuery)}`);
        productCacheService.setCachedSearchResults(searchQuery, 'windows', transformedProducts, Date.now() + 5 * 60 * 1000);
        console.log("Data saved to cache:", transformedProducts);
        setFilteredProducts(transformedProducts);
        setIsSearchResult(true);
      } else {
        setFilteredProducts([]);
        setError('No products found matching your search.');
        setIsSearchResult(true);
      }
    } catch (err) {
      console.error('Error searching for product:', err);
      setFilteredProducts([]);
      setIsSearchResult(true);
      
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
       const cachedResults = productCacheService.getCachedSearchResults(searchCache, 'windows');

       if (cachedResults) {
         setFilteredProducts(cachedResults);
         setIsSearchResult(true);
        }
  };

  const handleSearchInputChange = (e) => {
    const query = e.target.value;
    setSearchTerm(query);
    
    if (!query.trim()) {
      setFilteredProducts(products);
      setError(null);
      setIsSearchResult(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      handleSearch(searchTerm);
    }
  };

  const handlePageChange = async (newPage) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetchProductsByTypeFromAPI('windows', newPage, ITEMS_PER_PAGE);
      
      if (response.code === 200 && response.data && response.data.products) {
        setProducts(response.data.products);
        setFilteredProducts(response.data.products);
        
        if (response.data.pagination) {
          setPagination(prev => ({
            ...prev,
            currentPage: response.data.pagination.page,
            totalPages: response.data.pagination.totalPages,
            totalItems: response.data.pagination.total
          }));
        }
      } else {
        throw new Error(`API returned error: ${response.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(`Error loading page ${newPage}:`, err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="windows-area">
      <div className="search-section">
        <form className="search-container" onSubmit={handleSearchSubmit}>
          <input 
            type="text" 
            placeholder="Search for window products"
            className="search-input"
            value={searchTerm}
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
        <h2 className="section-title">
          {isSearchResult ? 'Search Results:' : 'Window Products:'}
        </h2>
        
        {loading && (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading windows...</p>
          </div>
        )}
        
        {error && !loading && (
          <div className="error-state">
            <p>⚠️ {error}</p>
            <button className="btn-outline" onClick={() => handlePageChange(1)}>
              Try Again
            </button>
          </div>
        )}
        
        {!loading && !error && (
          <>

            {!isSearchResult && (
              <div className="category-buttons">
                <button 
                  className="category-btn active"
                  disabled={loading}
                >
                  All Windows ({pagination.totalItems || 0})
                </button>
              </div>
            )}

            <div className="product-grid">
              {filteredProducts.length === 0 ? (
                <div className="no-results">
                  <p>No windows found matching your criteria.</p>
                  <button className="btn-outline" onClick={() => handlePageChange(1)}>
                    Show All Windows
                  </button>
                </div>
              ) : filteredProducts.map((product, index) => (
                <div key={product.id || index} className="product-card">
                  <div className="product-image">
                    {product.image && product.image !== "/api/placeholder/120/120" ? (
                      <img 
                        src={product.image} 
                        alt={product.productName || product.name}
                        className="product-image-img"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'block';
                        }}
                      />
                    ) : null}
                    <div className="image-placeholder" style={{display: product.image && product.image !== "/api/placeholder/120/120" ? 'none' : 'block'}}>
                      <span className="material-icon">🪟</span>
                    </div>
                  </div>
                  <div className="product-info">
                    <h3 className="product-name">{product.productName || product.name}</h3>
                    
                    <div className="product-meta">
                      <span className="product-type-badge">
                        {product.type ? product.type.replace('-', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : 
                         product.productType ? product.productType.replace('-', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : 
                         'Window'}
                      </span>
                      {product.price && (
                        <span className="product-price-badge">
                          ${product.price}
                        </span>
                      )}
                    </div>

                    {product.specifications && (
                      <div className="quick-specs">
                        {product.specifications.split('|').map((spec, index) => (
                          <span key={index} className="spec-tag">
                            {spec.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    <div className="product-actions">
                      <button 
                        className="btn btn-primary btn-sm" 
                        onClick={async () => {
                          // First try to get the full product details by name
                          try {
                            const response = await fetchProductByNameFromAPI(product.productName || product.name);
                            if (response.code === 200 && response.data) {
                              navigate(`/product-detail/${product.id}`, { 
                                state: { 
                                  product: response.data
                                }
                              });
                            } else {
                              // If we can't get full details, use what we have
                              navigate('/product-detail', { 
                                state: { 
                                  product: {
                                    ...product,
                                    name: product.productName || product.name,
                                    imageUrl: product.image,
                                    productType: product.type || product.productType || 'windows',
                                    specifications: product.specifications
                                  }
                                }
                              });
                            }
                          } catch (err) {
                            console.error('Error fetching product details:', err);
                            // Fall back to using the current product data
                            navigate('/product-detail', { 
                              state: { 
                                product: {
                                  ...product,
                                  name: product.productName || product.name,
                                  imageUrl: product.image,
                                  productType: product.type || product.productType || 'windows',
                                  specifications: product.specifications
                                }
                              }
                            });
                          }
                        }}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        
        {!loading && !error && pagination.totalPages > 1 && !isSearchResult && (
          <div className="pagination-controls">
            <div className="pagination-buttons">
              <button 
                className="pagination-btn"
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1 || loading}
              >
                Previous
              </button>
              
              {(() => {
                const renderPageButton = (pageNum) => (
                  <button
                    key={pageNum}
                    className={`pagination-btn ${pagination.currentPage === pageNum ? 'active' : ''}`}
                    onClick={() => handlePageChange(pageNum)}
                    disabled={loading}
                  >
                    {pageNum}
                  </button>
                );

                const pages = [];
                
                // Always show first page
                pages.push(renderPageButton(1));
                
                // Calculate range around current page
                let start = Math.max(2, pagination.currentPage - 1);
                let end = Math.min(pagination.totalPages - 1, pagination.currentPage + 1);
                
                // Add ellipsis after first page if needed
                if (start > 2) {
                  pages.push(<span key="ellipsis1" className="page-ellipsis">...</span>);
                }
                
                // Add pages around current page
                for (let i = start; i <= end; i++) {
                  pages.push(renderPageButton(i));
                }
                
                // Add ellipsis before last page if needed
                if (end < pagination.totalPages - 1) {
                  pages.push(<span key="ellipsis2" className="page-ellipsis">...</span>);
                }
                
                // Always show last page if there is more than one page
                if (pagination.totalPages > 1) {
                  pages.push(renderPageButton(pagination.totalPages));
                }
                
                return pages;
              })()}
              
              <button 
                className="pagination-btn"
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages || loading}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
};

export default WindowsArea;
