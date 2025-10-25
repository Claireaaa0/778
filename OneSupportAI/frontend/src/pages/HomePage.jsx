import React from 'react';
import ProductArea from '../components/ProductArea';
import '../styles/pages/HomePage.css';

const HomePage = () => {
  return (
    <div className="homepage-layout">
      <div style={{ position: 'relative' }}>
        <ProductArea />
      </div>
    </div>
  );
};

export default HomePage;
