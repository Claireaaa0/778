import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getAlertCases } from "../services/caseService";
import { useUser } from "../hooks/useUser";
import { CASE_STATUS } from "../utils/caseUtils";
import "../styles/pages/CasesPage.css";

const PAGE_SIZE = 3;

const getDaysAgo = (dateString) => {
  const createdAt = new Date(dateString);
  const today = new Date();
  const diffTime = Math.abs(today - createdAt);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const AlertCasesPage = () => {
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [paginatedCases, setPaginatedCases] = useState([]);
  const [fetchedPages, setFetchedPages] = useState({});
  const { token } = useUser();
  const navigate = useNavigate();

  const { isLoading, data, error } = useQuery({
    queryKey: ["alert-cases", page],
    queryFn: async () => {
      const pagination = { page, limit: PAGE_SIZE, asc: false };
      const lastKey = fetchedPages[page - 1] || null;
      if (lastKey) {
        pagination.lastId = lastKey.lastId;
        pagination.createdAt = lastKey.createdAt
      }
      return await getAlertCases(token, pagination).then((res) => {
        fetchedPages[page] = res?.data?.lastKey;
        setFetchedPages(fetchedPages);
        return res.data;
      });
    },
  });

  React.useEffect(() => {
    setTotalPages(
      Math.ceil((data?.count || 0) / PAGE_SIZE)
    );
  }, [data]);

  React.useEffect(() => {
    setPaginatedCases(data?.Items || []);
  }, [page, data]);

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

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
            Cases: Alert{" "}
          </h2>
          <div className="alert-description">
            Cases that have been pending for more than 24 hours
          </div>
        </div>
        <div className="cases-area">
          {isLoading ? (
            <div>Loading...</div>
          ) : error ? (
            <div>Error: {error.message}</div>
          ) : (
            <>
              <div className="case-list">
                {paginatedCases.map((c) => (
                  <div
                    key={c.caseId}
                    className="case-card alert-case"
                    onClick={() => navigate(`/cases/${c.caseId}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="case-id">
                      <span
                        className="case-status-dot"
                        style={{
                          background: CASE_STATUS[2].color,
                        }}
                      />
                      CASE ID {c.caseId}
                    </div>
                    <div className="case-specs">
                      Opened at:{" "}
                      {c.createdAt && new Date(c.createdAt).toLocaleString()} (
                      {getDaysAgo(c.createdAt)} days ago)
                    </div>
                    <div className="case-specs">
                      Customer: {c.name} | {c.email}
                    </div>
                    <div className="case-specs">Product: {c.product}</div>
                    <div className="case-alert-warning">
                      ⚠️ This case has been pending for{" "}
                      {getDaysAgo(c.createdAt)} days and requires immediate
                      attention
                    </div>
                  </div>
                ))}
                {paginatedCases.length === 0 && (
                  <div className="no-cases-message">
                    No cases require immediate attention
                  </div>
                )}
              </div>
              <div className="history-pagination">
                <button
                  className="pagination-btn"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                >
                  Previous {page}
                </button>

                {(() => {
                  const renderPageButton = (pageNum) => (
                    <button
                      key={pageNum}
                      className={`pagination-btn${
                        page === pageNum ? " active" : ""
                      }`}
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
                  let end = Math.min(totalPages, page + 1);

                  // Add ellipsis after first page if needed
                  if (start > 2) {
                    pages.push(
                      <span key="ellipsis1" className="page-ellipsis">
                        ...
                      </span>
                    );
                  }
                  // Add pages around current page
                  for (let i = start; i <= end; i++) {
                    pages.push(renderPageButton(i));
                  }

                  // Add ellipsis before last page if needed
                  if (end < totalPages - 1) {
                    pages.push(
                      <span key="ellipsis2" className="page-ellipsis">
                        ...
                      </span>
                    );
                  }
                  return pages;
                })()}

                <button
                  className="pagination-btn"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertCasesPage;
