/**
 * Phone number utility functions
 */

/**
 * Parse phone number to separate country code and local number
 * @param {string} phoneNumber - Full phone number (e.g., "+64273873920" or "0273873920")
 * @returns {Object} - { contactCode: string, contactNumber: string }
 */
export function parsePhoneNumber(phoneNumber) {
  if (!phoneNumber) return { contactCode: '+64', contactNumber: '' };
  
  // Remove any non-digit characters except +
  let cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
  
  // If starts with +, extract country code and number
  if (cleanNumber.startsWith('+')) {
    // Common country codes
    const countryCodes = ['+64', '+61', '+1', '+86', '+44', '+81'];
    
    for (const code of countryCodes) {
      if (cleanNumber.startsWith(code)) {
        const localNumber = cleanNumber.substring(code.length);
        // For New Zealand (+64), remove leading 0 if present
        const finalLocalNumber = (code === '+64' && localNumber.startsWith('0')) 
          ? localNumber.substring(1) 
          : localNumber;
        return { contactCode: code, contactNumber: finalLocalNumber };
      }
    }
  }
  
  // If no country code found, assume it's a local number
  return { contactCode: '+64', contactNumber: cleanNumber };
}

/**
 * Format phone number for display
 * @param {string} contactCode - Country code (e.g., "+64")
 * @param {string} contactNumber - Local phone number (e.g., "273873920")
 * @returns {string} - Formatted phone number
 */
export function formatPhoneNumber(contactCode, contactNumber) {
  if (!contactNumber) return '';
  return `${contactCode}${contactNumber}`;
}

/**
 * Validate phone number format
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} - Whether the phone number is valid
 */
export function validatePhoneNumber(phoneNumber) {
  if (!phoneNumber) return false;
  
  // Remove all non-digit characters except +
  const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
  
  // Check if it's a valid format
  // Should start with + and have at least 7 digits total
  if (cleanNumber.startsWith('+')) {
    return cleanNumber.length >= 8; // +1 + 7 digits minimum
  }
  
  // Local number should have at least 7 digits
  return cleanNumber.length >= 7;
}
