import apiClient from "../api/apiClient";

const licenseService = {
  getLicenses: () => apiClient.get("/license"),
  getLicenseTypes: () => apiClient.get("/license/types"),
  generateLicense: (licenseData) =>
    apiClient.post("/license/generate", licenseData),
  getServerFingerprint: () => apiClient.get("/license/fingerprint"),
  getCurrentLicense: () => apiClient.get("/license/current"),
  getAllFeatures: () => apiClient.get("/license/features"),

  // License management endpoints
  updateLicense: (id, updateData) =>
    apiClient.put(`/license/${id}`, updateData),
  updateLicenseStatus: (id, status) =>
    apiClient.put(`/license/${id}/status`, { status }),

  // WebRTC management endpoints
  getWebRTCSessions: (id) => apiClient.get(`/license/${id}/webrtc-sessions`),
  updateWebRTCAllocation: (id, allocationData) =>
    apiClient.put(`/license/${id}/webrtc-allocation`, allocationData),
  getLicenseUsers: (id) => apiClient.get(`/license/${id}/users`),
  updateUserWebRTCAccess: (licenseId, userId, hasAccess) =>
    apiClient.put(`/license/${licenseId}/users/${userId}/webrtc`, {
      hasAccess,
    }),
};

export default licenseService;
