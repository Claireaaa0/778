import React from 'react';
import ErrorBoundary from '../components/ErrorBoundary';
import FAQDropdown from '../components/FAQDropdown/index';
import { faqs } from '../data/faqData.js';
import '../styles/pages/FAQsPage.css';

const FAQsPage = () => {

  return (
    <div className="faqs-page">
      <ErrorBoundary>
        <div className="faqs-container">
          <h1 className="faqs-title">Frequently Asked Questions (FAQ's)</h1>
          <FAQDropdown faqs={faqs} />
        </div>
      </ErrorBoundary>
    </div>
  );
};

export default FAQsPage;
