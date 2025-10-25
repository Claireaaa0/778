import React, { useState } from 'react';
import PropTypes from 'prop-types';
import ChevronIcon from '../icons/ChevronIcon';
import '../../styles/components/FAQDropdown/FAQDropdown.css';

const FAQDropdown = ({ faqs }) => {
  const [expandedQuestions, setExpandedQuestions] = useState(
    faqs.map(section => Array(section.questions.length).fill(false))
  );

  const handleQuestionToggle = (sectionIdx, qIdx) => {
    setExpandedQuestions(prev => prev.map((arr, i) =>
      i === sectionIdx ? arr.map((v, j) => j === qIdx ? !v : v) : arr
    ));
  };

  return (
    <div className="faqs-list">
      {faqs.map((section, idx) => (
        <div key={section.section} className="faqs-section">
          <div className="faqs-section-title">
            {section.section.startsWith('Product') && '📏'}
            {section.section.startsWith('Door') && '🚪'}
            {section.section.startsWith('Windows') && '🪟'}
            {section.section.startsWith('Installation') && '🛠️'}
            {section.section.startsWith('Warranty') && '📝'}
            <span>{section.section}</span>
          </div>
          <ul className="faqs-qalist">
            {section.questions.map((qa, qidx) => (
              <li key={qidx} className="faqs-qa">
                <div className="faqs-question" onClick={() => handleQuestionToggle(idx, qidx)}>
                  <span className="faqs-question-icon">
                    <ChevronIcon isExpanded={expandedQuestions[idx][qidx]} />
                  </span>
                  {qa.q}
                </div>
                {expandedQuestions[idx][qidx] && (
                  <div className="faqs-answer">A: {qa.a}</div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

FAQDropdown.propTypes = {
  faqs: PropTypes.arrayOf(
    PropTypes.shape({
      section: PropTypes.string.isRequired,
      questions: PropTypes.arrayOf(
        PropTypes.shape({
          q: PropTypes.string.isRequired,
          a: PropTypes.string.isRequired
        })
      ).isRequired
    })
  ).isRequired
};

export default FAQDropdown;
