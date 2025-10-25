import React from 'react';
import PropTypes from 'prop-types';

const ChevronIcon = ({ isExpanded }) => (
  <svg 
    width="20" 
    height="20" 
    viewBox="0 0 24 24" 
    style={{
      display: 'block',
      transform: isExpanded ? 'none' : 'rotate(-90deg)'
    }}
  >
    <polyline 
      points="6 9 12 15 18 9" 
      fill="none" 
      stroke="#181818" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
  </svg>
);

ChevronIcon.propTypes = {
  isExpanded: PropTypes.bool.isRequired
};

export default ChevronIcon;
