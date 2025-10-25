export const CASE_STATUS = [
  { label: "Pending", color: "#fbc02d" },
  { label: "Closed", color: "#9e9e9e" }, // Changed from green to grey
  { label: "Alert", color: "#d32f2f" },
];
export const STATUS_MAP = { 
  pending: 0, 
  closed: 1, 
  alert: 2,
  open: 0,  // Map 'open' to pending status
  active: 0, // Map 'active' to pending status
  resolved: 1, // Map 'resolved' to closed status
  cancelled: 1, // Map 'cancelled' to closed status
};

// Time threshold for alerts (in hours)
export const ALERT_THRESHOLD = 1; // Temporarily set to 1 hour for testing

export const shouldCaseBeAlerted = (caseItem) => {
  if (!caseItem || !caseItem.createdAt) return false;
  
  // If case is already closed, no alert needed
  if (caseItem.status?.toLowerCase() === 'closed') return false;
  
  const createdAt = new Date(caseItem.createdAt);
  // Parse the date in YYYY-MM-DD format for comparison
  const today = new Date();
  const createdDate = createdAt.toISOString().split('T')[0];
  const todayDate = today.toISOString().split('T')[0];
  
  // Calculate days difference
  const daysDifference = Math.floor((today - createdAt) / (1000 * 60 * 60 * 24));
  
  // Alert if case is more than 1 day old
  return daysDifference >= 1;
};