import { API_CONFIG, API_ENDPOINTS } from "../config/api";

export async function getCaseById(token, caseId) {
  const resp = await fetch(
    `${API_CONFIG.BASE_URL}${API_ENDPOINTS.CASES}/${caseId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (!resp.ok) {
    if (resp.status === 404) {
      throw new Error(`Case ${caseId} not found `);
    }
    throw new Error(`Failed to get case by caseId ${caseId}: ${resp.body.message}`);
  }
  return await resp.json();
}

export async function getAllCases(token, pagination) {
  const resp = await fetch(
    `${API_CONFIG.BASE_URL}${API_ENDPOINTS.CASES}?${new URLSearchParams(pagination)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (!resp.ok) {
    if (resp.status === 404) {
      throw new Error("No cases found");
    }
    throw new Error(`Failed to get cases: ${resp.body.message}`);
  }
  return await resp.json();
}

export async function getCasesByStatus(token, status, pagination) {
  const resp = await fetch(
    `${API_CONFIG.BASE_URL}${API_ENDPOINTS.CASES}/status/${status}?${new URLSearchParams(pagination)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (!resp.ok) {
    if (resp.status === 404) {
      throw new Error(`No cases with status ${status} found`);
    }
    throw new Error(`Failed to get cases with status ${status}: ${resp.body.message}`);
  }
  return await resp.json();
}

export async function createCase(token, newCase) {
  const resp = await fetch(
    `${API_CONFIG.BASE_URL}${API_ENDPOINTS.CASES}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(newCase),
    }
  );
  if (!resp.ok) {
    throw new Error(`Failed to create case: ${resp.body.message}`);
  }
  return await resp.json();
}


export async function updateCase(token, caseId, updateData, oldStatus) {
  const resp = await fetch(
    `${API_CONFIG.BASE_URL}${API_ENDPOINTS.CASES}/${caseId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ...updateData, oldStatus }),
    }
  );
  if (!resp.ok) {
    throw new Error(`Failed to update case ${caseId}: ${resp.body.message}`);
  }
  return await resp.json();
}
export async function getCasesByPhoneNumber(token, phoneNumber) {
  const resp = await fetch(
    `${API_CONFIG.BASE_URL}${API_ENDPOINTS.CASES}/phone`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ phoneNumber }),
    }
  );
  if (!resp.ok) {
    if (resp.status === 404) {
      throw new Error(`No cases found for phone number ${phoneNumber}`);
    }
    throw new Error(`Failed to get cases for phone number ${phoneNumber}: ${resp.body.message}`);
  }
  return await resp.json();
}

export async function getAlertCases(token, pagination) {
  const resp = await fetch(
    `${API_CONFIG.BASE_URL}${API_ENDPOINTS.CASES}/alert?${new URLSearchParams(pagination)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (!resp.ok) {
    if (resp.status === 404) {
      throw new Error("No cases found");
    }
    throw new Error(`Failed to get cases: ${resp.body.message}`);
  }
  return await resp.json();
}

export async function getCaseDashboardData(token, userId, startDate) {
  const resp = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.CASES}/dashboard?${new URLSearchParams({userId, startDate})}`, {
    method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
  });
  if (!resp.ok) {
    if (resp.status === 404) {
      throw new Error("Dashboard data not found");
    }
    throw new Error(`Failed to get dashboard data: ${resp.body.message}`);
  }
  return await resp.json();
}