import express from "express";
import {
  addContact,
  getContacts,
  getMedia,
  getMessages,
  getMessageStatus,
  handleWebhook,
  // sendMessage,
  updateContact,
  uploadMedia,
  getWhatsAppConfig,
  updateWhatsAppConfig,
  getChats,
  getChatMessages,
  sendChatMessage,
  updateMessageStatus,
  getWhatsAppTemplates,
  getTemplateById,
  createTemplate,
  deleteTemplate,
} from "../controllers/whatsappController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Configuration endpoints
router.get("/integrations/whatsapp/config", getWhatsAppConfig);
router.post("/integrations/whatsapp-config", updateWhatsAppConfig);

// Message endpoints
// router.post("/send", authMiddleware, sendMessage);
router.get("/messages/:contactId", getMessages);
router.get("/status/:messageId", getMessageStatus);

// Contact management
router.get("/contacts", getContacts);
router.post("/contacts", authMiddleware, addContact);
router.put("/contacts/:contactId", authMiddleware, updateContact);

// Media handling
router.post("/media", authMiddleware, uploadMedia);
router.get("/media/:mediaId", authMiddleware, getMedia);

// Chat management
router.get("/chats", getChats);
router.get("/chats/:contactId/messages", getChatMessages);
router.post("/chats/:contactId/messages", sendChatMessage);
router.put("/messages/:messageId/status", updateMessageStatus);

// Templates
router.get("/templates", getWhatsAppTemplates);
router.get("/templates/:templateId", getTemplateById);
router.post("/templates", createTemplate);
router.delete("/templates/:templateId", deleteTemplate);

// Webhook routes
router.post("/webhook", handleWebhook);
router.post("/status-callback", handleWebhook);

export default router;
