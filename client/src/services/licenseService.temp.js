import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8004/api";

const licenseService = {
  // Get all licenses (admin)
  getLicenses: async () => {
    const response = await axios.get(`${API_URL}/license`, {
      withCredentials: true,
    });
    return response;
  },

  // Get license types
  getLicenseTypes: async () => {
    const response = await axios.get(`${API_URL}/license/types`, {
      withCredentials: true,
    });
    return response;
  },

  // Generate a new license
  generateLicense: async (licenseData) => {
    const response = await axios.post(`${API_URL}/license/generate`, licenseData, {
      withCredentials: true,
    });
    return response;
  },

  // Get all available features
  getAllFeatures: async () => {
    const response = await axios.get(`${API_URL}/license/features`, {
      withCredentials: true,
    });
    return response;
  },

  // Get current license status
  getCurrentLicense: async () => {
    const response = await axios.get(`${API_URL}/license/current`, {
      withCredentials: true,
    });
    return response;
  },

  // Manual sync from master server
  syncLicense: async () => {
    const response = await axios.post(`${API_URL}/license/sync`, {}, {
      withCredentials: true,
    });
    return response;
  },

  // Get server fingerprint for license request
  getServerFingerprint: async () => {
    const response = await axios.get(`${API_URL}/license/fingerprint`, {
      withCredentials: true,
    });
    return response;
  },

  // Get fingerprint history
  getFingerprintHistory: async () => {
    const response = await axios.get(`${API_URL}/license/fingerprint/history`, {
      withCredentials: true,
    });
    return response;
  },

  // Validate license with master server
  validateLicense: async (data) => {
    const response = await axios.post(`${API_URL}/license/validate`, data, {
      withCredentials: true,
    });
    return response;
  },

  // Session management
  createSession: async (sessionData) => {
    const response = await axios.post(`${API_URL}/license/sessions/create`, sessionData, {
      withCredentials: true,
    });
    return response;
  },

  atomicSessionSetup: async (sessionData) => {
    const response = await axios.post(`${API_URL}/license/sessions/atomic-setup`, sessionData, {
      withCredentials: true,
    });
    return response;
  },

  endSession: async (sessionData) => {
    const response = await axios.post(`${API_URL}/license/sessions/end`, sessionData, {
      withCredentials: true,
    });
    return response;
  },

  getSessionCount: async () => {
    const response = await axios.get(`${API_URL}/license/sessions/count`, {
      withCredentials: true,
    });
    return response;
  },

  // WebRTC sessions
  getWebRTCSessions: async () => {
    const response = await axios.get(`${API_URL}/license/webrtc-sessions`, {
      withCredentials: true,
    });
    return response;
  },

  // License users
  getLicenseUsers: async () => {
    const response = await axios.get(`${API_URL}/license/users`, {
      withCredentials: true,
    });
    return response;
  },

  updateUserWebRTCAccess: async (userId, accessData) => {
    const response = await axios.put(`${API_URL}/license/users/${userId}/webrtc-access`, accessData, {
      withCredentials: true,
    });
    return response;
  },
};

export default licenseService;
