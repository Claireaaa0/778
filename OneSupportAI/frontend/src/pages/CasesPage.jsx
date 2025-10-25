import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/pages/CasesPage.css";
import { getAllCases } from "../services/caseService";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "../hooks/useUser";
import { STATUS_MAP, CASE_STATUS } from "../utils/caseUtils";
import { FaSearch } from "react-icons/fa";

const PAGE_SIZE = 3;

const CasesPage = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredCases, setFilteredCases] = useState([]);
  const { token } = useUser();
  const [countByStatus, setCountByStatus] = useState([0, 0, 0]);
  const [fetchedPages, setFetchedPages] = useState({});
  const { isLoading, data, error } = useQuery({
    queryKey: [`all-cases`, page],
    retry: false,
    queryFn: async () => {
      const pagination = { page, limit: PAGE_SIZE, asc: false };
      const lastId = fetchedPages[page - 1] || null;
      if (lastId) {
        pagination.lastId = lastId;
      }
      return await getAllCases(token, pagination).then((res) => {
        fetchedPages[page] = res?.data?.lastId;
        setFetchedPages(fetchedPages);
        return res.data;
      });
    },
  });

  const handlePageChange = useCallback((newPage) => {
    setPage(newPage);
  }, []);
  React.useEffect(() => {
    // Set page
    setTotalPages(Math.ceil((data?.counts["all"] || 1) / PAGE_SIZE));
    setCountByStatus([data?.counts["pending"] || 0, data?.counts["closed"] || 0, data?.counts["alert"] || 0]);
  }, [data]);
  React.useEffect(() => {
    if (!searchTerm) {
      setFilteredCases(data?.Items || []);
      return;
    }
    const filtered =
      data?.Items?.filter((item) => {
        const searchLower = searchTerm.toLowerCase();
        return (
          item.caseId.toLowerCase().includes(searchLower) ||
          item.name.toLowerCase().includes(searchLower)
        );
      }) || [];
    setFilteredCases(filtered);
    setTotalPages(Math.ceil(filtered.length / PAGE_SIZE));
    setPage(1);
  }, [searchTerm, data]);
  return (
    <div className="homepage-layout">
      <div className="cases-page">
        <main className="cases-area">
          <div className="search-section">
            <form
              className="search-container"
              onSubmit={(e) => {
                e.preventDefault();
              }}
            >
              <input
                type="text"
                placeholder="Search cases by ID or customer name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <button type="submit" className="search-button">
                🔍
              </button>
            </form>
          </div>
          <div className="cases-content">
            <div className="case-header-row">
              <div className="case-status-row">
                {CASE_STATUS.map((status, index) => {
                  const route =
                    status.label === "Pending"
                      ? "/cases/pending"
                      : status.label === "Closed"
                      ? "/cases/closed"
                      : "/cases/alert";
                  return (
                    <span
                      key={status.label}
                      className="case-status-item clickable case-status-hover"
                      onClick={() => navigate(route)}
                      style={{ cursor: "pointer" }}
                    >
                      <span
                        className="case-status-dot"
                        style={{ background: status.color }}
                      />
                      {status.label} - {countByStatus[index]}
                    </span>
                  );
                })}
              </div>
              <button
                className="btn-primary"
                onClick={() => navigate("/cases/new")}
              >
                New Case
              </button>
            </div>
            <div className="section-header">
              <h2 className="cases-title">Cases:</h2>
            </div>
            {isLoading ? (
              <div>Loading...</div>
            ) : error ? (
              <div>Error: {error.message}</div>
            ) : (
              <>
                <div className="case-list">
                  {filteredCases.map((c) => (
                    <div
                      key={c.caseId}
                      className="case-card"
                      onClick={() => navigate(`/cases/${c.caseId}`)}
                      style={{ cursor: "pointer", position: "relative" }}
                    >
                      <div className="case-id">
                        <span
                          className="case-status-dot"
                          style={{
                            background:
                              CASE_STATUS[
                                STATUS_MAP[c.status?.toLowerCase()] || 0
                              ].color,
                          }}
                        />{" "}
                        CASE ID {c.caseId}
                      </div>
                      <div className="case-specs">
                        Opened at:{" "}
                        {c.createdAt && new Date(c.createdAt).toLocaleString()}
                      </div>
                      <div className="case-specs">
                        Customer: {c.name} | {c.email}
                      </div>
                      <div className="case-specs">Product: {c.product}</div>
                    </div>
                  ))}
                </div>
                <div className="history-pagination">
                  <button
                    className="pagination-btn"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                  >
                    Previous
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
        </main>
      </div>
    </div>
  );
};

export default CasesPage;
