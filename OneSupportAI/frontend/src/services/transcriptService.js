import { API_CONFIG, API_ENDPOINTS } from "../config/api";

/**
 * Generate AI case from call transcript
 * @param {string} token - Authentication token
 * @param {string} contactId - Contact ID from the call
 * @param {string} contactNumber - Contact phone number
 * @returns {Promise<Object>} Generated case data
 */
export async function generateAICase(token, contactId, contactNumber) {
  const resp = await fetch(
    `${API_CONFIG.BASE_URL}${API_ENDPOINTS.TRANSCRIPT_GENERATE_CASE}/generate-case`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        contactId,
        contactNumber
      }),
    }
  );
  
  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({}));
    throw new Error(`Failed to generate AI case: ${errorData.message || 'Unknown error'}`);
  }
  
  return await resp.json();
}

/**
 * Get call transcript
 * @param {string} token - Authentication token
 * @param {string} contactId - Contact ID from the call
 * @returns {Promise<Object>} Call transcript data
 */
export async function getCallTranscript(token, contactId) {
  const resp = await fetch(
    `${API_CONFIG.BASE_URL}${API_ENDPOINTS.TRANSCRIPT_GET}/${contactId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );
  
  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({}));
    throw new Error(`Failed to get call transcript: ${errorData.message || 'Unknown error'}`);
  }
  
  return await resp.json();
}
