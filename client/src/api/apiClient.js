// src/api/apiClient.js
import axios from "axios";

const getBaseUrl = () => {
  // eslint-disable-next-line no-undef
  if (process.env.NODE_ENV === "production") {
    return "/api"; // Use relative path in production
  }
  // eslint-disable-next-line no-undef
  return process.env.REACT_APP_API_URL;
};

const apiClient = axios.create({
  baseURL: getBaseUrl(),
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Add request interceptor for authentication
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error.message);
    return Promise.reject(error);
  }
);

export default apiClient;
