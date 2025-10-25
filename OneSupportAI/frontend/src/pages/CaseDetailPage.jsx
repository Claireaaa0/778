import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/pages/CaseDetailPage.css";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "../hooks/useUser";
import { getCaseById, updateCase } from "../services/caseService";
import { toast } from "react-toastify";
import { useEffect } from "react";

const CaseDetailPage = () => {
  const { id: caseId } = useParams();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editStartTime, setEditStartTime] = useState(null);
  const [oldStatus, setOldStatus] = useState("");
  const { token, user } = useUser();
  const queryClient = useQueryClient();
  const { isFetching, isError, data, error } = useQuery({
    queryKey: ["case", caseId],
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async () => getCaseById(token, caseId),
  });

  const handleChange = () => {
    // const { name, value } = e.target;
    // setCaseData((prev) => ({ ...prev, [name]: value }));
  };
  const handleStatusChange = () => {

  };
  const handleSave = async (formData) => {
    try {
      const endTime = new Date();
      const workingTimeInHours = editStartTime 
        ? (endTime - editStartTime) / (1000 * 60 * 60)
        : 0;

      // Add working time to the form data
      const updatedData = {
        ...formData,
        editHistory: [{
          startTime: editStartTime.toISOString(),
          endTime: endTime.toISOString(),
          workingTimeHours: workingTimeInHours,
          agentId: user.userID,
        }]
      };

      setIsEditing(false);
      setEditStartTime(null);
      await updateCase(token, caseId, updatedData, oldStatus);
      await queryClient.refetchQueries({ queryKey: ["case", caseId] });
      toast.success("Case updated successfully!");
    } catch (error) {
      toast.error(error.message || "Failed to update case");
      setIsEditing(true);
    }
  };

  useEffect(() => {
    if (data?.data?.status) {
      setOldStatus(data.data.status);
    }
  }, [data]);
  const caseData = data?.data;
  return (
    <div className="homepage-layout">
      {isError && error && <>Error: {error.message}</>}
      {isFetching && <>Loading...</>}
      {caseData && (
        <div className="case-detail-page">
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              marginBottom: "0.5rem",
            }}
          >
            <button
              className="btn-secondary"
              style={{ marginRight: "auto" }}
              onClick={() => navigate("/cases")}
            >
              Back
            </button>
            <h2 style={{ flex: 1, textAlign: "center", margin: 0 }}>
              Case {!isFetching  && "#" + data?.data?.caseId}
            </h2>
            <button
              className={isEditing ? "btn-secondary" : "btn-primary"}
              onClick={() => {
                if (!isEditing) {
                  setEditStartTime(new Date());
                  setIsEditing(true);
                } else {
                  setEditStartTime(null);
                  setIsEditing(false);
                }
              }}
            >
              {isEditing ? "Cancel" : "Edit"}
            </button>
          </div>
          <div className="case-detail-card">
            <>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  console.log(formData);
                  handleSave(Object.fromEntries(formData));
                }}
              >
                <div className="detail-section">
                  <strong>Case Details:</strong>
                  <br />
                  Case Status:{" "}
                  {isEditing ? (
                    <select
                      name="status"
                      defaultValue={caseData.status}
                      onChange={handleStatusChange}
                    >
                      <option value="pending">Pending</option>
                      <option value="closed">Closed</option>
                    </select>
                  ) : (
                    caseData.status.charAt(0).toUpperCase() + caseData.status.slice(1)
                  )}
                  &nbsp;&nbsp;Case Id:{" "}
                  {isEditing ? (
                    <input
                      name="caseId"
                      value={caseData.caseId}
                      onChange={handleChange}
                    />
                  ) : (
                    caseData.caseId
                  )}
                  <br />
                  To do:{" "}
                  {isEditing ? (
                    <input
                      name="todo"
                      defaultValue={caseData.todo}
                      onChange={handleChange}
                    />
                  ) : (
                    caseData.todo
                  )}
                  <br />
                  Priority: {isEditing ? (
                    <select
                      name="priority"
                      defaultValue={caseData.priority || ''}
                      onChange={handleChange}
                    >
                      <option value="" disabled hidden={!!caseData.priority}>Select priority</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  ) : (
                    caseData.priority
                      ? caseData.priority.charAt(0).toUpperCase() + caseData.priority.slice(1)
                      : ''
                  )}
                  <br />
                  Date: {caseData.createdAt} {isEditing &&
                    <input
                      name="createdAt"
                      defaultValue={caseData.createdAt}
                      hidden
                    />}
                </div>
                <div className="detail-section">
                  <strong>Customer Details:</strong>
                  <br />
                  Name:{" "}
                  {isEditing ? (
                    <input
                      name="name"
                      defaultValue={caseData.name}
                      onChange={handleChange}
                    />
                  ) : (
                    caseData.name
                  )}
                  <br />
                  Contact Number:{" "}
                  {isEditing ? (
                    <input
                      name="contactCode"
                      defaultValue={caseData.contactCode}
                      onChange={handleChange}
                      style={{ width: 60 }}
                    />
                  ) : (
                    caseData.contactCode
                  )}
                  {isEditing ? (
                    <input
                      name="contactNumber"
                      defaultValue={caseData.contactNumber}
                      onChange={handleChange}
                      style={{ width: 120 }}
                    />
                  ) : (
                    ` ${caseData.contactNumber}`
                  )}
                  <br />
                  E-mail:{" "}
                  {isEditing ? (
                    <input
                      name="email"
                      defaultValue={caseData.email}
                      onChange={handleChange}
                    />
                  ) : (
                    caseData.email
                  )}
                </div>
                <div className="detail-section">
                  <strong>Issue Details:</strong>
                  <br />
                  Product Concerned:{" "}
                  {isEditing ? (
                    <input
                      name="product"
                      defaultValue={caseData.product}
                      onChange={handleChange}
                    />
                  ) : (
                    caseData.product
                  )}
                  <br />
                  Summary of the issue:{" "}
                  {isEditing ? (
                    <textarea
                      name="summary"
                      defaultValue={caseData.summary}
                      onChange={handleChange}
                    />
                  ) : (
                    caseData.summary
                  )}
                  <br />
                  Actions Taken During the call:{" "}
                  {isEditing ? (
                    <textarea
                      name="actions"
                      defaultValue={caseData.actions}
                      onChange={handleChange}
                    />
                  ) : (
                    <span style={{ whiteSpace: "pre-line" }}>
                      {caseData.actions}
                    </span>
                  )}
                </div>
                {isEditing && (
                  <div className="form-actions">
                    <button type="submit" className="btn-primary">
                      Save
                    </button>
                  </div>
                )}
              </form>
            </>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaseDetailPage;
