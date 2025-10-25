import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUser } from '../hooks/useUser';

const CallContext = createContext();

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};

export const CallProvider = ({ children }) => {
  const { user } = useUser();
  const [customerInfo, setCustomerInfo] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [lastCallInfo, setLastCallInfo] = useState(null);
  const [caseFormData, setCaseFormData] = useState(null);
  const [showCaseForm, setShowCaseForm] = useState(false);

  // Clear call data when user changes and load new user's data
  useEffect(() => {
    // First clear current call data
    setCustomerInfo(null);
    setPhoneNumber('');
    setLastCallInfo(null);
    setCaseFormData(null);
    setShowCaseForm(false);

    // Then load new user's data if user exists
    if (user?.userID) {
      const savedCustomerInfo = localStorage.getItem(`callCustomerInfo_${user.userID}`);
      const savedPhoneNumber = localStorage.getItem(`callPhoneNumber_${user.userID}`);
      const savedLastCallInfo = localStorage.getItem(`callLastCallInfo_${user.userID}`);
      const savedCaseFormData = localStorage.getItem(`callCaseFormData_${user.userID}`);
      const savedShowCaseForm = localStorage.getItem(`callShowCaseForm_${user.userID}`);
      
      if (savedCustomerInfo) {
        try {
          setCustomerInfo(JSON.parse(savedCustomerInfo));
        } catch (e) {
          console.warn('Failed to load customer info:', e);
        }
      }
      if (savedPhoneNumber) {
        setPhoneNumber(savedPhoneNumber);
      }
      if (savedLastCallInfo) {
        try {
          setLastCallInfo(JSON.parse(savedLastCallInfo));
        } catch (e) {
          console.warn('Failed to load last call info:', e);
        }
      }
      if (savedCaseFormData) {
        try {
          setCaseFormData(JSON.parse(savedCaseFormData));
        } catch (e) {
          console.warn('Failed to load case form data:', e);
        }
      }
      if (savedShowCaseForm) {
        setShowCaseForm(savedShowCaseForm === 'true');
      }
    }
  }, [user?.userID]); // Reload when user changes

  // Save user-specific customer info
  useEffect(() => {
    if (user?.userID) {
      if (customerInfo) {
        localStorage.setItem(`callCustomerInfo_${user.userID}`, JSON.stringify(customerInfo));
      } else {
        localStorage.removeItem(`callCustomerInfo_${user.userID}`);
      }
    }
  }, [customerInfo, user?.userID]);

  // Save user-specific phone number
  useEffect(() => {
    if (user?.userID) {
      if (phoneNumber) {
        localStorage.setItem(`callPhoneNumber_${user.userID}`, phoneNumber);
      } else {
        localStorage.removeItem(`callPhoneNumber_${user.userID}`);
      }
    }
  }, [phoneNumber, user?.userID]);

  // Save user-specific last call info
  useEffect(() => {
    if (user?.userID) {
      if (lastCallInfo) {
        localStorage.setItem(`callLastCallInfo_${user.userID}`, JSON.stringify(lastCallInfo));
      } else {
        localStorage.removeItem(`callLastCallInfo_${user.userID}`);
      }
    }
  }, [lastCallInfo, user?.userID]);

  // Save user-specific case form data
  useEffect(() => {
    if (user?.userID) {
      if (caseFormData) {
        localStorage.setItem(`callCaseFormData_${user.userID}`, JSON.stringify(caseFormData));
      } else {
        localStorage.removeItem(`callCaseFormData_${user.userID}`);
      }
    }
  }, [caseFormData, user?.userID]);

  // Save user-specific show case form state
  useEffect(() => {
    if (user?.userID) {
      if (showCaseForm) {
        localStorage.setItem(`callShowCaseForm_${user.userID}`, 'true');
      } else {
        localStorage.removeItem(`callShowCaseForm_${user.userID}`);
      }
    }
  }, [showCaseForm, user?.userID]);

  const clearCallData = () => {
    setCustomerInfo(null);
    setPhoneNumber('');
    setLastCallInfo(null);
    setCaseFormData(null);
    setShowCaseForm(false);
    if (user?.userID) {
      localStorage.removeItem(`callCustomerInfo_${user.userID}`);
      localStorage.removeItem(`callPhoneNumber_${user.userID}`);
      localStorage.removeItem(`callLastCallInfo_${user.userID}`);
      localStorage.removeItem(`callCaseFormData_${user.userID}`);
      localStorage.removeItem(`callShowCaseForm_${user.userID}`);
    }
  };

  const value = {
    customerInfo,
    setCustomerInfo,
    phoneNumber,
    setPhoneNumber,
    lastCallInfo,
    setLastCallInfo,
    caseFormData,
    setCaseFormData,
    showCaseForm,
    setShowCaseForm,
    clearCallData
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};
