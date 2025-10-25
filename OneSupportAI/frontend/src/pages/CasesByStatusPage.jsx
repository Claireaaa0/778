import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/pages/CasesPage.css";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "../hooks/useUser";
import { getCasesByStatus } from "../services/caseService";
import { CASE_STATUS, STATUS_MAP } from "../utils/caseUtils";

const PAGE_SIZE = 3;
const CasesByStatusPage = ({ status }) => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [paginatedCases, setPaginatedCases] = useState([]);
  const { token } = useUser();
  const [fetchedPages, setFetchedPages] = useState({});
  
  const { isLoading, data, error } = useQuery({
    queryKey: [`${status}-cases`, page],
    retry: false,
    queryFn: async () => {
      const pagination = { page, limit: PAGE_SIZE, asc: false };
      const lastId = fetchedPages[page - 1] || null;
      if (lastId) {
        pagination.lastId = lastId;
      }
      return getCasesByStatus(token, status, pagination).then((res) => {
        fetchedPages[page] = res?.data?.lastId;
        setFetchedPages(fetchedPages);
        return res.data;
      });
    },
  });

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  React.useEffect(() => {
    setTotalPages(Math.ceil((data?.count || 1) / PAGE_SIZE));
    setPaginatedCases(data?.Items || []);
  }, [page, data]);

  return (
    <div className="cases-content">
      <div className="cases-page">
        <div className="cases-header" style={{ padding: '1rem' }}>
          <button
            className="btn btn-secondary"
            onClick={() => navigate("/cases")}
          >
            Back
          </button>
          <h2 className="cases-title" style={{ marginTop: '1rem' }}>
            Cases: {CASE_STATUS[STATUS_MAP[status]].label}{" "}
          </h2>
        </div>

        {isLoading ? (
          <div style={{ padding: '1rem' }}>Loading...</div>
        ) : error ? (
          <div style={{ padding: '1rem' }}>Error: {error.message}</div>
        ) : (
          <div className="cases-area">
            <div className="case-list">
              {paginatedCases.map((c) => (
                <div
                  key={c.caseId}
                  className="case-card"
                  onClick={() => navigate(`/cases/${c.caseId}`)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="case-id">CASE ID {c.caseId}</div>
                  <div className="case-specs">
                    Opened at:{" "}
                    {c.createdAt && new Date(c.createdAt).toLocaleString()}
                  </div>
                  <div className="case-specs">
                    Customer: {c.name} | {c.email}
                  </div>
                  <div className="case-specs">Product: {c.product}</div>
                  <div className="case-specs">Priority: {c.priority ? c.priority.charAt(0).toUpperCase() + c.priority.slice(1) : '—'}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="history-pagination" style={{ marginTop: 'auto', padding: '1rem 0' }}>
          <button 
            className="btn btn-text"
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
          >
            Previous
          </button>
          
          {(() => {
            const renderPageButton = (pageNum) => (
              <button
                key={pageNum}
                className={`btn btn-text${page === pageNum ? " active" : ""}`}
                onClick={() => handlePageChange(pageNum)}
              >
                {pageNum}
              </button>
            );

            const pages = [];
            
            // Always show first page
            pages.push(renderPageButton(1));
            
            // Calculate range around current page
            let start = Math.max(2, page - 1);
            let end = Math.min(totalPages - 1, page + 1);
            
            // Add ellipsis after first page if needed
            if (start > 2) {
              pages.push(<span key="ellipsis1" className="page-ellipsis">...</span>);
            }
            
            // Add pages around current page
            for (let i = start; i <= end; i++) {
              pages.push(renderPageButton(i));
            }
            
            // Add ellipsis before last page if needed
            if (end < totalPages - 1) {
              pages.push(<span key="ellipsis2" className="page-ellipsis">...</span>);
            }
            
            // Always show last page if there is more than one page
            if (totalPages > 1) {
              pages.push(renderPageButton(totalPages));
            }
            
            return pages;
          })()}

          <button 
            className="btn btn-text"
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default CasesByStatusPage;
