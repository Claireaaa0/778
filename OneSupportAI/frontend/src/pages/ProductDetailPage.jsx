import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import '../styles/pages/ProductDetail.css';
import productCacheService from '../services/productCacheService';


export default function ProductDetailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();

  const [activeTab, setActiveTab] = React.useState('overview');
  const [activeImage, setActiveImage] = React.useState(0);
  const [showZoom, setShowZoom] = React.useState(false);

  // Remove useState, use useMemo instead
  const product = React.useMemo(() => {
    let cached = productCacheService.getCachedProductDetail(id);
    const { product: locationProduct } = location.state || {};
    
    if (!cached && locationProduct) {
      productCacheService.setCachedProductDetail(id, locationProduct);
      cached = locationProduct;
    }
    
    return cached;
  }, [id, location.state]); // Dependencies array ensures update when id or location.state changes


  const productImages = React.useMemo(() => {
    if (!product) return [];
    
    const formatImageUrl = (url) => {
      if (!url) return null;
      if (url.includes('s3.ap-southeast-2.amazonaws.com')) {
        return url.startsWith('https://') ? url : `https://${url}`;
      }
      return url;
    };

    let images = [];
    
    const mainImage = formatImageUrl(product.imageUrl);
    if (mainImage) {
      images.push(mainImage);
    }

    const additionalImages = (product.additionalImages || [])
      .map(img => formatImageUrl(img.url))
      .filter(Boolean);
    
    images = [...images, ...additionalImages];
    
    return images;
  }, [product]);

  React.useEffect(() => {
    productImages.forEach((src) => {
      if (src) {
        const img = new Image();
        img.src = src;
      }
    });
  }, [productImages]);

  if (!product) {
    return (
      <div className="product-detail-container">
        <button onClick={() => navigate(-1)} className="btn btn-secondary">
          ← Back
        </button>
        <div className="no-product">
          <h2>No Product Data</h2>
          <p>Unable to find product details.</p>
        </div>
      </div>
    );
  }

  const toggleZoom = () => {
    setShowZoom(!showZoom);
  };

  const nextImage = () => {
    setActiveImage((prev) => (prev + 1) % productImages.length);
  };

  const previousImage = () => {
    setActiveImage((prev) => (prev - 1 + productImages.length) % productImages.length);
  };

  return (
    <div className="product-detail-container">
      <div className="back-button-container">
        <button 
          onClick={() => navigate(-1)} 
          className="btn btn-secondary"
        >
          Back to Products
        </button>
      </div>
      <div className="scrollable-content">
        <div className="product-detail-content">
          {/* Left Side - Product Image */}
          <div className="product-image-section">
            {(product.image && product.image !== "/api/placeholder/120/120") || 
             (product.imageUrl && product.imageUrl !== "/api/placeholder/120/120") ? (
              <div className="main-product-image">
                <img 
                  src={product.image || product.imageUrl} 
                  alt={product.productName || product.name}
                  className="product-image-main"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                <div className="image-placeholder" style={{display: 'none'}}>
                  <span className="material-icon">🚪</span>
                </div>
              </div>
            ) : (
              <div className="main-product-image">
                <div className="image-placeholder" style={{display: 'block'}}>
                  <span className="material-icon">
                    {product.productType?.toLowerCase().includes('window') ? '🪟' : '🚪'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right Side - Product Info */}
          <div className="product-info-section">
            <h1>{product.productName || product.name}</h1>
            
            {/* Product Type and Price Badges */}
            <div className="product-badges">
              <span className="product-type-badge">
                {product.type ? product.type.replace('-', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : 
                 product.productType ? product.productType.replace('-', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : 
                 'Product'}
              </span>
              {product.price && (
                <span className="product-price-badge">
                  ${product.price}
                </span>
              )}
            </div>
            
            {/* Quick Specs */}
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
            
            {/* For Windows products, show specifications */}
            {product.specifications && !product['Model Details & Options'] && (
              <div className="quick-specs">
                <span className="spec-tag">
                  {product.specifications.split('|')[0]?.trim() || 'Standard'}
                </span>
                {product.specifications.split('|')[1] && (
                  <span className="spec-tag">
                    {product.specifications.split('|')[1]?.trim()}
                  </span>
                )}
                {product.specifications.split('|')[2] && (
                  <span className="spec-tag">
                    {product.specifications.split('|')[2]?.trim()}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Zoom Overlay */}
        {showZoom && productImages.length > 0 && (
          <div 
            className="zoom-overlay active"
            onClick={toggleZoom}
          >
            <img
              className="zoom-image"
              src={productImages[activeImage]}
              alt={`${product.productName} - Enlarged View`}
              onClick={(e) => e.stopPropagation()}
            />
            <button 
              className="close-zoom"
              onClick={toggleZoom}
              aria-label="Close zoom view"
            >
              ×
            </button>
            {productImages.length > 1 && (
              <div className="image-navigation">
                <button
                  className="nav-button prev"
                  onClick={(e) => {
                    e.stopPropagation();
                    previousImage();
                  }}
                  disabled={activeImage === 0}
                  aria-label="Previous image"
                >
                  ←
                </button>
                <span>{activeImage + 1} / {productImages.length}</span>
                <button
                  className="nav-button next"
                  onClick={(e) => {
                    e.stopPropagation();
                    nextImage();
                  }}
                  disabled={activeImage === productImages.length - 1}
                  aria-label="Next image"
                >
                  →
                </button>
              </div>
            )}
          </div>
        )}

        <div className="product-navigation">
          <button 
            className={`nav-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          {Object.entries(product['Model Details & Options'] || {}).map(([section, content]) => {
            if (!content || Object.keys(content).length === 0) return null;
            const sectionKey = section.toLowerCase().replace(/[&\s]+/g, '-');
            return (
              <button
                key={section}
                className={`nav-button ${activeTab === sectionKey ? 'active' : ''}`}
                onClick={() => setActiveTab(sectionKey)}
              >
                {section}
              </button>
            );
          })}
        </div>

        <div className="product-content">
          {activeTab === 'overview' && (
            <section className="model-overview">
              <h2>Model Overview</h2>
              <div className="overview-grid">
                {product['Model Overview'] && Object.entries(product['Model Overview'])
                  .filter(([key]) => key !== 'Image')
                  .sort(([keyA], [keyB]) => {
                    const orderMap = {
                      'PROJECT TYPE': 1,
                      'COLORS & FINISHES': 2,
                      'CONSTRUCTION': 3,
                      'GLASS': 4,
                      'MAINTENANCE LEVEL': 5,
                      'PANEL OPTIONS': 6,
                      'DIVIDED LITES': 7,
                      'EXTRAS': 8,
                      'WARRANTY': 999
                    };
                    return (orderMap[keyA] || 500) - (orderMap[keyB] || 500);
                  })
                  .map(([key, value]) => (
                    <div key={key} className="overview-item">
                      <h3>{key}</h3>
                      <div className="overview-content">
                        {Array.isArray(value) ? (
                          <ul className="overview-list">
                            {value.map((item, index) => (
                              <li key={index}>{item}</li>
                            ))}
                          </ul>
                        ) : (
                          <p>{value}</p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          )}

          {Object.entries(product['Model Details & Options'] || {}).map(([section, content]) => {
            if (!content || Object.keys(content).length === 0) return null;
            const sectionKey = section.toLowerCase().replace(/[&\s]+/g, '-');
            
            if (activeTab !== sectionKey) return null;

            return (
              <section key={section} className={sectionKey}>
                <h2>{section}</h2>
                <div className={`${sectionKey}-content`}>
                  {Object.entries(content).map(([category, options]) => (
                    <div key={category} className={`${sectionKey}-category`}>
                      <h3>{category}</h3>
                      <div className="color-options-grid">
                        {Array.isArray(options) ? (
                          options.map((option, index) => (
                            <div key={index} className="color-option">
                              {option.image && (
                                <div className="color-image">
                                  <img 
                                    src={option.image} 
                                    alt={option.text || option}
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'block';
                                    }}
                                  />
                                  <div className="image-placeholder" style={{display: 'none'}}>
                                    <span className="material-icon">
                                      {section === 'Colors & Finishes' ? '🎨' : 
                                       section === 'Glass' ? '🪟' : 
                                       section === 'Hardware' ? '🔧' : 
                                       section === 'Installation' ? '🔨' : 
                                       section === 'Warranty' ? '🛡️' : '🏗️'}
                                    </span>
                                  </div>
                                </div>
                              )}
                              <div className="color-info">
                                <h4 className="color-name">{option.text || option}</h4>
                                {option.description && (
                                  <p className="color-description">{option.description}</p>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className={`${sectionKey}-option`}>
                            <div className={`${sectionKey}-info`}>
                              <h4>{options}</h4>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
