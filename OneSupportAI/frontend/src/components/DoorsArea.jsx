import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchProductsByTypeFromAPI, fetchDoorTypeCountsCached, fetchProductByNameFromAPI, fetchProductsByEmbeddingFromAPI, fetchDoorsHomepageCached } from '../services/productService';
import productCacheService from '../services/productCacheService';
import '../styles/components/DoorsArea.css';
import '../styles/components/ProductCard.css';

// Define itemsPerPage as a constant
const ITEMS_PER_PAGE = 20;

const DoorsArea = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchQueryFromURL = new URLSearchParams(location.search).get('searchQuery') || '';
  const initialCached = productCacheService.getCachedSearchResults(searchQueryFromURL, 'doors') || null;

  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState(()=> initialCached ?? []);
  const [filteredProducts, setFilteredProducts] = useState(()=> initialCached ?? []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchResult, setIsSearchResult] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: ITEMS_PER_PAGE
  });
  const [doorCounts, setDoorCounts] = useState({
    all: 0,
    'interior-doors': 0,
    'exterior-doors': 0,
    'patio-doors': 0
  });

  // Function to load all door counts using the unified cache service
  const loadAllDoorCounts = async () => {
    try {
      const response = await fetchDoorTypeCountsCached();
      
      if (response.code === 200 && response.data && response.data.counts) {
        const apiCounts = response.data.counts;
        const counts = {
          all: apiCounts.doors || 0,
          'interior-doors': apiCounts['interior-doors'] || 0,
          'exterior-doors': apiCounts['exterior-doors'] || 0,
          'patio-doors': apiCounts['patio-doors'] || 0
        };
        
        setDoorCounts(counts);
        console.log('✅ Loaded door counts (cached or fresh):', counts);
      } else {
        throw new Error(`API returned error: ${response.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error loading door counts:', err);
      setDoorCounts({
        all: 0,
        'interior-doors': 0,
        'exterior-doors': 0,
        'patio-doors': 0
      });
    }
  };

  useEffect(() => {
    const loadDoors = async (page = 1, filterType = 'all') => {
      try {
        setLoading(true);
        setError(null);
        
        let response;
        const apiType = filterType === 'all' ? 'doors' : filterType;
        if (page === 1 && apiType === 'doors') {
          // Use cached homepage list for All Doors first page
          response = await fetchDoorsHomepageCached(ITEMS_PER_PAGE);
        } else {
          response = await fetchProductsByTypeFromAPI(apiType, page, ITEMS_PER_PAGE);
        }
        
        if (response.code === 200 && response.data && response.data.products) {
          console.log('✅ Loaded doors from API:', response.data.products.length);
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
        console.error('Error loading doors:', err);
        setError(err.message);
        setProducts([]);
        setFilteredProducts([]);
      } finally {
        setLoading(false);
      }
    };
    // Initial load
    if (!initialCached) {
    // No cached data, load from API
    loadDoors(1, 'all');
    loadAllDoorCounts();
  } else {
    console.log("✅ Using cached search results for initial load");
    setLoading(false);
    setIsSearchResult(true);
  }
  }, [initialCached]);

  const handleSearch = async (searchQuery) => {
    if (!searchQuery.trim()) {
      handleFilterChange(activeFilter);
      setIsSearchResult([]);
      return;
    }

    try {
      setIsSearching(true);
      setError(null);

      const response = await fetchProductsByEmbeddingFromAPI(searchQuery.trim(), 'doors');
      if (response.code === 200 && response.data?.length > 0) {
        // Transform the single product result to match our component format
        const transformedProduct = response.data.map(item => ({
          ...item,
        }));
        navigate(`/doors?searchQuery=${encodeURIComponent(searchQuery.trim())}`, { replace: true });
        productCacheService.setCachedSearchResults(searchQuery.trim(), 'doors', transformedProduct);
        setProducts(response.data.products);
        setFilteredProducts(transformedProduct);
      } else {
        setFilteredProducts([]);
        setError('No products found matching your search.');
      }
    } catch (err) {
      console.error('Error searching for product:', err);
      setFilteredProducts([]);
      if (err.message && err.message.includes('TOKEN_EXPIRED')) {
        setError('Your session has expired. Please log in again.');
      } else if (err.message && err.message.includes('Product not found')) {
        setError('No products found matching your search.');
      } else {
        setError('Unable to search products. Please try again.');
      }
    } finally {
      setIsSearching(false);
      setIsSearchResult(true);
    }
     const searchCache = new URLSearchParams(location.search).get('searchQuery');
     const cachedResults = productCacheService.getCachedSearchResults(searchCache, 'doors');

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

  const handleFilterChange = async (filterType) => {
    setActiveFilter(filterType);
    setLoading(true);
    setError(null);
    setIsSearchResult(false);
    
    try {
      let response;
      if (filterType === 'all') {
        response = await fetchProductsByTypeFromAPI('doors', 1, ITEMS_PER_PAGE);
      } else {
        response = await fetchProductsByTypeFromAPI(filterType, 1, ITEMS_PER_PAGE);
      }
      
      if (response.code === 200 && response.data && response.data.products) {
        console.log(`✅ Loaded ${filterType} doors:`, response.data.products.length);
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
      console.error(`Error loading ${filterType} doors:`, err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = async (newPage) => {
    setLoading(true);
    setError(null);
    
    try {
      const filterType = activeFilter === 'all' ? 'doors' : activeFilter;
      const response = await fetchProductsByTypeFromAPI(filterType, newPage, ITEMS_PER_PAGE);
      
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
    <main className="doors-area">
      <div className="search-section">
        <form className="search-container" onSubmit={handleSearchSubmit}>
          <input 
            type="text" 
            placeholder="Search for door products"
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
          {!loading && isSearchResult
            ? 'Search Results:'
            : !loading && activeFilter === 'all'
              ? 'Door Products:'
              : !loading
                ? `${activeFilter.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())} Products:`
                : ''}
        </h2>
        {!isSearchResult && (
          <div className="category-buttons">
            <button 
              className={`category-btn ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => handleFilterChange('all')}
              disabled={loading}
            >
              All Doors ({doorCounts.all || 0})
            </button>
            <button 
              className={`category-btn ${activeFilter === 'interior-doors' ? 'active' : ''}`}
              onClick={() => handleFilterChange('interior-doors')}
              disabled={loading}
            >
              Interior Doors ({doorCounts['interior-doors'] || 0})
            </button>
            <button 
              className={`category-btn ${activeFilter === 'exterior-doors' ? 'active' : ''}`}
              onClick={() => handleFilterChange('exterior-doors')}
              disabled={loading}
            >
              Exterior Doors ({doorCounts['exterior-doors'] || 0})
            </button>
            <button 
              className={`category-btn ${activeFilter === 'patio-doors' ? 'active' : ''}`}
              onClick={() => handleFilterChange('patio-doors')}
              disabled={loading}
            >
              Patio Doors ({doorCounts['patio-doors'] || 0})
            </button>
          </div>
        )}
        {loading && (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading doors...</p>
          </div>
        )}
        
        {error && !loading && (
          <div className="error-state">
            <p>⚠️ {error}</p>
            <button className="btn-outline" onClick={() => handleFilterChange(activeFilter)}>
              Try Again
            </button>
          </div>
        )}
        
        {!loading && !error && (
          <div className="product-grid">
            {filteredProducts.length === 0 ? (
              <div className="no-results">
                <p>No doors found matching your criteria.</p>
                <button className="btn-outline" onClick={() => handleFilterChange('all')}>
                  Show All Doors
                </button>
              </div>
            ) : filteredProducts.map((product, index) => (
              <div key={product.id || index} className="product-card">
                <div className="product-image">
                  {product.image && product.image !== "/api/placeholder/120/120" ? (
                    <img 
                      src={product.image} 
                      alt={product.productName}
                      className="product-image-img"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                  ) : null}
                  <div className="image-placeholder" style={{display: product.image && product.image !== "/api/placeholder/120/120" ? 'none' : 'block'}}>
                    <span className="material-icon">🚪</span>
                  </div>
                </div>
                <div className="product-info">
                  <h3 className="product-name">{product.productName}</h3>
                  
                  <div className="product-meta">
                    <span className="product-type-badge">
                      {product.type ? product.type.replace('-', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : 'Door'}
                    </span>
                    {product.price && (
                      <span className="product-price-badge">
                        ${product.price}
                      </span>
                    )}
                  </div>
                  
                  {product['Model Details & Options']?.['Door Specifications'] && (
                    <div className="quick-specs">
                      {product['Model Details & Options']['Door Specifications'].Material && (
                        <span className="spec-tag">
                          {product['Model Details & Options']['Door Specifications'].Material}
                        </span>
                      )}
                      {product['Model Details & Options']['Door Specifications'].Style && (
                        <span className="spec-tag">
                          {product['Model Details & Options']['Door Specifications'].Style}
                        </span>
                      )}
                      {product['Model Details & Options']['Door Specifications']['Core Type'] && (
                        <span className="spec-tag">
                          {product['Model Details & Options']['Door Specifications']['Core Type'].split(' or ')[0]}
                        </span>
                      )}
                    </div>
                  )}
                  
                  <div className="product-actions">
                    <button 
                      className="btn btn-primary btn-sm" 
                      onClick={async () => {
                        // First try to get the full product details by name
                        try {
                          const response = await fetchProductByNameFromAPI(product.productName);
                          if (response.code === 200 && response.data) {
                            navigate(`/product-detail/${product.id}`, { 
                              state: { 
                                product: response.data
                              }
                            });
                          } else {
                            // If we can't get full details, use what we have
                            navigate(`/product-detail/${product.id}`, { 
                              state: { 
                                product: {
                                  ...product,
                                  name: product.productName,
                                  imageUrl: product.image,
                                  productType: product.type,
                                  specifications: product['Model Details & Options']?.['Door Specifications'] 
                                    ? Object.values(product['Model Details & Options']['Door Specifications']).join(' | ')
                                    : undefined
                                }
                              }
                            });
                          }
                        } catch (err) {
                          console.error('Error fetching product details:', err);
                          // Fall back to using the current product data
                          navigate(`/product-detail/${product.id}`, { 
                            state: { 
                              product: {
                                ...product,
                                name: product.productName,
                                imageUrl: product.image,
                                productType: product.type,
                                specifications: product['Model Details & Options']?.['Door Specifications'] 
                                  ? Object.values(product['Model Details & Options']['Door Specifications']).join(' | ')
                                  : undefined
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

export default DoorsArea;
