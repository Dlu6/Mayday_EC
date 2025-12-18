import axios from "axios";
import logoutManager from "./logoutManager";
import serverConfig from "../config/serverConfig";

// Use centralized server configuration
const API_BASE_URL = `${serverConfig.apiUrl}/api/whatsapp`;

// Register this service with the logout manager for automatic cleanup
logoutManager.registerService("WhatsAppService", async () => {
  console.log("🧹 Cleaning up WhatsApp service...");
  // Cancel any ongoing requests
  if (window.axiosCancelTokenSource) {
    window.axiosCancelTokenSource.cancel("Logout in progress");
  }
});

// Helper function to safely make API calls using centralized logout manager
const safeApiCall = async (apiFunction, ...args) => {
  if (logoutManager.shouldBlockApiCalls()) {
    console.log("🔒 WhatsApp API call blocked during logout");
    throw new Error("API call blocked during logout");
  }

  try {
    return await apiFunction(...args);
  } catch (error) {
    if (logoutManager.shouldBlockApiCalls()) {
      console.log("🔒 WhatsApp API call failed due to logout");
      throw new Error("API call failed due to logout");
    }
    throw error;
  }
};

const whatsAppService = {
  getChats: async () => {
    return safeApiCall(async () => {
      const response = await axios.get(`${API_BASE_URL}/chats`);
      return response.data;
    });
  },

  getChatMessages: async (contactId) => {
    return safeApiCall(async () => {
      const encodedContactId = encodeURIComponent(contactId);
      const response = await axios.get(
        `${API_BASE_URL}/chats/${encodedContactId}/messages`
      );
      return response.data;
    });
  },

  sendChatMessage: async (contactId, messageData) => {
    return safeApiCall(async () => {
      const encodedContactId = encodeURIComponent(contactId);
      const response = await axios.post(
        `${API_BASE_URL}/chats/${encodedContactId}/messages`,
        messageData
      );
      return response.data;
    });
  },

  updateMessageStatus: async (messageId, status) => {
    return safeApiCall(async () => {
      const response = await axios.put(
        `${API_BASE_URL}/messages/${messageId}/status`,
        { status }
      );
      return response.data;
    });
  },

  sendTemplateMessage: async (contactId, messageData) => {
    return safeApiCall(async () => {
      const encodedContactId = encodeURIComponent(contactId);
      const response = await axios.post(
        `${API_BASE_URL}/chats/${encodedContactId}/template-message`,
        messageData
      );
      return response.data;
    });
  },

  getWhatsAppConfig: async () => {
    return safeApiCall(async () => {
      const response = await axios.get(
        `${API_BASE_URL}/integrations/whatsapp/config`
      );
      return response.data;
    });
  },

  // Cancel all ongoing requests when logout starts
  cancelAllRequests: () => {
    if (window.axiosCancelTokenSource) {
      window.axiosCancelTokenSource.cancel("Logout in progress");
    }
  },
};

export default whatsAppService;
