import sequelize, { Op } from "../config/sequelize.js";
import {
  Contact,
  WhatsAppMessage,
  WhatsAppConfig,
} from "../models/WhatsAppModel.js";
import pkg from "twilio";
import { EventBusService } from "../services/eventBus.js";
const { Twilio } = pkg;

// Get configuration from environment variables
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER;

if (!twilioAccountSid || !twilioAuthToken || !twilioWhatsAppNumber) {
  console.error(
    "Missing required Twilio configuration in environment variables"
  );
}

const client = new Twilio(twilioAccountSid, twilioAuthToken);

// export const sendMessage = async (req, res) => {
//   try {
//     const { to, message, mediaUrl, template } = req.body;
//     console.log("<<<<<sendMessage req.body>>>>>>:", req.body);

//     // Validate phone number format
//     if (!to.match(/^\+[1-9]\d{1,14}$/)) {
//       return res.status(400).json({
//         success: false,
//         error:
//           "Invalid phone number format. Must be E.164 format (+1234567890)",
//       });
//     }

//     const config = await WhatsAppConfig.findOne();
//     if (!config || !config.webhookUrl) {
//       return res.status(400).json({
//         success: false,
//         error: "Webhook URL is required",
//       });
//     }

//     const messageOptions = {
//       from: `whatsapp:${twilioWhatsAppNumber}`,
//       to: `whatsapp:${to}`,
//       body: message,
//       statusCallback: `${config.webhookUrl}/status-callback`,
//     };

//     // If template is provided, use it
//     if (template && template.sid) {
//       messageOptions.contentSid = template.sid;
//       messageOptions.contentVariables = JSON.stringify(
//         template.variables || {}
//       );
//     } else {
//       // For opted-in numbers, we can send regular messages
//       messageOptions.body = message;
//     }

//     if (mediaUrl) {
//       messageOptions.mediaUrl = [mediaUrl];
//     }

//     try {
//       const twilioMessage = await client.messages.create(messageOptions);

//       // Find or create contact
//       const [contact] = await Contact.findOrCreate({
//         where: { phoneNumber: to },
//         defaults: {
//           lastInteraction: new Date(),
//         },
//       });

//       // Create message using Sequelize
//       const newMessage = await WhatsAppMessage.create({
//         messageId: twilioMessage.sid,
//         from: twilioWhatsAppNumber,
//         sender: twilioWhatsAppNumber,
//         to: to,
//         text: message || "Template message",
//         mediaUrl: mediaUrl,
//         status: "sent",
//         contactId: contact.id,
//         template: template || null,
//       });

//       await contact.update({
//         lastInteraction: new Date(),
//       });

//       res.json({
//         success: true,
//         data: {
//           messageId: twilioMessage.sid,
//           status: twilioMessage.status,
//           message: newMessage,
//         },
//       });
//     } catch (twilioError) {
//       if (twilioError.code === 63016) {
//         return res.status(400).json({
//           success: false,
//           error: twilioError.message,
//           details: {
//             recipientNumber: to,
//             whatsappNumber: twilioWhatsAppNumber,
//           },
//         });
//       }
//       throw twilioError;
//     }
//   } catch (error) {
//     console.error("Error sending WhatsApp message:", error);
//     res.status(500).json({
//       success: false,
//       error: "Failed to send message: " + error.message,
//     });
//   }
// };

export const handleWebhook = async (req, res) => {
  const { Body, From, To, MessageSid, ProfileName, MediaUrl0 } = req.body;

  // For incoming messages
  if (Body || MediaUrl0) {
    const fromNumber = From.replace("whatsapp:", "");
    const toNumber = To.replace("whatsapp:", "");

    try {
      const [contact] = await Contact.findOrCreate({
        where: { phoneNumber: fromNumber },
        defaults: {
          lastInteraction: new Date(),
          lastMessage: Body || "Media message",
          name: ProfileName || null,
        },
      });

      const incomingMessage = await WhatsAppMessage.create({
        messageId: MessageSid,
        from: fromNumber,
        to: toNumber,
        text: Body || "",
        mediaUrl: MediaUrl0,
        status: "received",
        contactId: contact.id,
        sender: fromNumber,
        type: "text",
        template: {},
      });

      await contact.update({
        lastInteraction: new Date(),
        lastMessage: Body || "Media message",
        unreadCount: sequelize.literal("unreadCount + 1"),
      });

      // Emit event for real-time updates with full message data
      EventBusService.emit("whatsapp:message", {
        message: {
          id: incomingMessage.id,
          text: incomingMessage.text,
          mediaUrl: incomingMessage.mediaUrl,
          timestamp: incomingMessage.createdAt,
          sender: incomingMessage.sender,
          status: incomingMessage.status,
          type: incomingMessage.type,
        },
        contact: {
          id: contact.id,
          phoneNumber: contact.phoneNumber,
          name: contact.name,
          lastMessage: contact.lastMessage,
          unreadCount: contact.unreadCount,
        },
      });

      return res.json({ success: true, data: incomingMessage });
    } catch (error) {
      console.error("Error processing webhook:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.json({ success: true });
};

export const getMessages = async (req, res) => {
  try {
    const { contactId } = req.params;
    const messages = await WhatsAppMessage.findAll({
      where: {
        [Op.or]: [{ from: contactId }, { to: contactId }],
      },
      order: [["timestamp", "DESC"]],
      limit: 100,
    });

    res.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch messages",
    });
  }
};

export const getMessageStatus = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await WhatsAppMessage.findOne({
      where: { messageId },
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        error: "Message not found",
      });
    }

    res.json({
      success: true,
      data: {
        messageId: message.messageId,
        status: message.status,
      },
    });
  } catch (error) {
    console.error("Error fetching message status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch message status",
    });
  }
};

export const getContacts = async (req, res) => {
  try {
    const contacts = await Contact.findAll({
      include: [
        {
          model: WhatsAppMessage,
          as: "messageHistory",
          limit: 1,
          order: [["createdAt", "DESC"]],
          attributes: [
            "id",
            "messageId",
            "text",
            "status",
            "errorCode",
            "errorMessage",
            "createdAt",
          ],
        },
      ],
      order: [["lastInteraction", "DESC"]],
      attributes: [
        "id",
        "phoneNumber",
        "lastInteraction",
        "lastMessage",
        "unreadCount",
      ],
    });

    res.json({
      success: true,
      data: contacts,
    });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch contacts",
    });
  }
};

export const addContact = async (req, res) => {
  try {
    const { phoneNumber, name } = req.body;
    const contact = await Contact.create({
      phoneNumber,
      name,
      lastInteraction: new Date(),
    });

    res.json({
      success: true,
      data: contact,
    });
  } catch (error) {
    console.error("Error adding contact:", error);
    res.status(500).json({
      success: false,
      error: "Failed to add contact",
    });
  }
};

export const updateContact = async (req, res) => {
  try {
    const { contactId } = req.params;
    const updates = req.body;

    const [updated] = await Contact.update(updates, {
      where: { phoneNumber: contactId },
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: "Contact not found",
      });
    }

    const updatedContact = await Contact.findOne({
      where: { phoneNumber: contactId },
    });

    res.json({
      success: true,
      data: updatedContact,
    });
  } catch (error) {
    console.error("Error updating contact:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update contact",
    });
  }
};

export const uploadMedia = async (req, res) => {
  try {
    const { file } = req;
    if (!file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded",
      });
    }

    const mediaResponse = await client.messages.media.create({
      contentType: file.mimetype,
      data: file.buffer,
    });

    res.json({
      success: true,
      data: {
        mediaId: mediaResponse.sid,
        mediaUrl: mediaResponse.uri,
      },
    });
  } catch (error) {
    console.error("Error uploading media:", error);
    res.status(500).json({
      success: false,
      error: "Failed to upload media",
    });
  }
};

export const getMedia = async (req, res) => {
  try {
    const { mediaId } = req.params;
    const media = await client.messages.media(mediaId).fetch();

    if (!media) {
      return res.status(404).json({
        success: false,
        error: "Media not found",
      });
    }

    res.json({
      success: true,
      data: {
        mediaId: media.sid,
        mediaUrl: media.uri,
        contentType: media.contentType,
        size: media.size,
      },
    });
  } catch (error) {
    console.error("Error fetching media:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch media",
    });
  }
};

export const getWhatsAppConfig = async (req, res) => {
  try {
    const config = await WhatsAppConfig.findOne();
    res.json({
      success: true,
      data: config || {
        accountSid: process.env.TWILIO_ACCOUNT_SID || "",
        authToken: process.env.TWILIO_AUTH_TOKEN || "",
        phoneNumber: process.env.TWILIO_WHATSAPP_NUMBER || "",
        enabled: false,
        webhookUrl: process.env.NGROK_URL || "",
        contentSid: process.env.TWILIO_CONTENT_SID || "",
      },
    });
  } catch (error) {
    console.error("Error fetching WhatsApp config:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch WhatsApp configuration",
    });
  }
};

export const updateWhatsAppConfig = async (req, res) => {
  try {
    const {
      enabled,
      accountSid,
      authToken,
      phoneNumber,
      webhookUrl,
      contentSid,
    } = req.body;

    let config = await WhatsAppConfig.findOne();

    if (!config) {
      config = await WhatsAppConfig.create({
        enabled,
        accountSid,
        authToken,
        phoneNumber,
        webhookUrl,
        contentSid,
      });
    } else {
      await config.update({
        enabled,
        accountSid,
        authToken,
        phoneNumber,
        webhookUrl,
        contentSid,
      });
    }

    // Test Twilio connection if enabled
    if (enabled) {
      try {
        const client = new Twilio(accountSid, authToken);
        await client.api.accounts(accountSid).fetch();
      } catch (error) {
        return res.status(400).json({
          success: false,
          error:
            "Invalid Twilio credentials. Please check your Account SID and Auth Token.",
        });
      }
    }

    res.json({
      success: true,
      data: {
        enabled: config.enabled,
        accountSid: config.accountSid,
        phoneNumber: config.phoneNumber,
        webhookUrl: config.webhookUrl,
        contentSid: config.contentSid,
      },
    });
  } catch (error) {
    console.error("Error updating WhatsApp config:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update WhatsApp configuration",
    });
  }
};

export const getChats = async (req, res) => {
  try {
    const contacts = await Contact.findAll({
      attributes: [
        "id",
        "name",
        "phoneNumber",
        "lastMessage",
        "lastInteraction",
        "unreadCount",
        "status",
        "isOnline",
        "isBlocked",
        "isGroup",
      ],
      include: [
        {
          model: WhatsAppMessage,
          as: "messageHistory",
          limit: 1,
          order: [["createdAt", "DESC"]],
          attributes: ["text", "timestamp"],
        },
      ],
      order: [["lastInteraction", "DESC"]],
    });

    console.log("Fetched contacts:", JSON.stringify(contacts, null, 2));

    const formattedChats = contacts.map((contact) => {
      const contactData = contact.get({ plain: true });
      console.log("Processing contact:", contactData);

      return {
        id: contactData.id,
        name: contactData.name || contactData.phoneNumber,
        phoneNumber: contactData.phoneNumber,
        avatar: contactData.name
          ? contactData.name.substring(0, 2).toUpperCase()
          : contactData.phoneNumber.substring(0, 2).toUpperCase(),
        lastMessage:
          contactData.messageHistory?.[0]?.text ||
          contactData.lastMessage ||
          "",
        timestamp:
          contactData.messageHistory?.[0]?.timestamp ||
          contactData.lastInteraction,
        unread: contactData.unreadCount || 0,
        status: contactData.status || "offline",
        isOnline: contactData.isOnline || false,
        isBlocked: contactData.isBlocked || false,
        isGroup: contactData.isGroup || false,
      };
    });

    console.log("Formatted chats:", JSON.stringify(formattedChats, null, 2));

    res.json({
      success: true,
      data: formattedChats,
    });
  } catch (error) {
    console.error("Error fetching chats:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch chats",
    });
  }
};

export const getChatMessages = async (req, res) => {
  try {
    const { contactId } = req.params;

    // Find the contact first to get its ID
    const contact = await Contact.findOne({
      attributes: ["id", "phoneNumber", "name"], // Only select needed fields
      where: { phoneNumber: contactId },
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: "Contact not found",
      });
    }

    const messages = await WhatsAppMessage.findAll({
      where: {
        contactId: contact.id,
      },
      order: [["timestamp", "ASC"]],
    });

    const formattedMessages = messages.map((message) => ({
      id: message.id,
      text: message.text,
      timestamp: message.timestamp,
      sender:
        message.sender === process.env.TWILIO_WHATSAPP_NUMBER
          ? "user"
          : "contact",
      status: message.status,
    }));

    res.json({
      success: true,
      data: formattedMessages,
    });
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch chat messages",
    });
  }
};

export const sendChatMessage = async (req, res) => {
  try {
    const { contactId } = req.params;
    const { text } = req.body;

    const contact = await Contact.findOne({
      where: { phoneNumber: contactId },
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: "Contact not found",
      });
    }

    const config = await WhatsAppConfig.findOne();
    if (!config || !config.contentSid) {
      return res.status(400).json({
        success: false,
        error: "Template configuration is required",
      });
    }

    const fromNumber = config.phoneNumber.startsWith("+")
      ? config.phoneNumber
      : `+${config.phoneNumber}`;

    // Format message options according to Twilio's Content API requirements
    const messageOptions = {
      from: `whatsapp:${fromNumber}`,
      to: `whatsapp:${contact.phoneNumber}`,
      contentSid: config.contentSid,
      contentVariables: JSON.stringify({
        1: text, // Make sure the key is a string
      }),
      statusCallback: `${config.webhookUrl}/api/whatsapp/status-callback`,
    };

    console.log("Message options:", messageOptions);

    const client = new Twilio(config.accountSid, config.authToken);
    const twilioMessage = await client.messages.create(messageOptions);

    const message = await WhatsAppMessage.create({
      messageId: twilioMessage.sid,
      from: fromNumber,
      to: contact.phoneNumber,
      text: text,
      status: twilioMessage.status,
      contactId: contact.id,
      sender: fromNumber,
      template: {
        sid: config.contentSid,
        variables: { 1: text },
      },
      type: "text",
    });

    await contact.update({
      lastInteraction: new Date(),
      lastMessage: text,
    });

    return res.json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error("Error sending chat message:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.stack,
    });
  }
};

export const updateMessageStatus = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { status } = req.body;

    const [updated] = await WhatsAppMessage.update(
      { status },
      { where: { messageId } }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: "Message not found",
      });
    }

    const updatedMessage = await WhatsAppMessage.findOne({
      where: { messageId },
      include: [
        {
          model: WhatsAppMessage,
          as: "replyMessage",
          attributes: ["id", "text", "sender", "timestamp"],
        },
      ],
    });

    res.json({
      success: true,
      data: {
        id: updatedMessage.id,
        messageId: updatedMessage.messageId,
        status: updatedMessage.status,
        timestamp: updatedMessage.timestamp,
        replyTo: updatedMessage.replyMessage || null,
      },
    });
  } catch (error) {
    console.error("Error updating message status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update message status",
    });
  }
};

export const getWhatsAppTemplates = async (req, res) => {
  try {
    const config = await WhatsAppConfig.findOne();
    if (!config) {
      return res.status(404).json({
        success: false,
        error: "WhatsApp configuration not found",
      });
    }

    const client = new Twilio(config.accountSid, config.authToken);
    // Using the Content API endpoint
    const templates = await client.content.v1.contents.list();

    // console.log("Raw templates response:", templates);

    const formattedTemplates = templates.map((template) => ({
      sid: template.sid,
      name: template.friendlyName || template.sid,
      status: template.status || "active",
      category: template.category || "MARKETING",
      language: template.language || "en",
      created: template.dateCreated,
      variables: template.variables || [],
      content: template.content || {},
    }));

    res.json({
      success: true,
      data: formattedTemplates,
    });
  } catch (error) {
    console.error("Error fetching WhatsApp templates:", error);
    res.status(500).json({
      success: false,
      error: `Failed to fetch templates: ${error.message}`,
      details: error.stack,
    });
  }
};

export const getTemplateById = async (req, res) => {
  try {
    const { templateId } = req.params;
    const config = await WhatsAppConfig.findOne();

    if (!config) {
      return res.status(404).json({
        success: false,
        error: "WhatsApp configuration not found",
      });
    }

    const client = new Twilio(config.accountSid, config.authToken);
    const template = await client.messages.v1.templates(templateId).fetch();

    res.json({
      success: true,
      data: {
        sid: template.sid,
        name: template.friendlyName,
        status: template.status,
        category: template.category,
        language: template.language,
        created: template.dateCreated,
        content: template.content,
      },
    });
  } catch (error) {
    console.error("Error fetching template:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch template",
    });
  }
};

export const createTemplate = async (req, res) => {
  try {
    const config = await WhatsAppConfig.findOne();
    if (!config) {
      return res.status(404).json({
        success: false,
        error: "WhatsApp configuration not found",
      });
    }

    const client = new Twilio(config.accountSid, config.authToken);
    const template = await client.content.v1.contents.create(req.body);

    res.json({
      success: true,
      data: {
        sid: template.sid,
        name: template.friendlyName,
        status: template.status || "pending",
        language: template.language,
        created: template.dateCreated,
        variables: template.variables,
      },
    });
  } catch (error) {
    console.error("Error creating template:", error);
    res.status(500).json({
      success: false,
      error: `Failed to create template: ${error.message}`,
    });
  }
};

export const deleteTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const config = await WhatsAppConfig.findOne();

    if (!config) {
      return res.status(404).json({
        success: false,
        error: "WhatsApp configuration not found",
      });
    }

    const client = new Twilio(config.accountSid, config.authToken);
    await client.content.v1.contents(templateId).remove();

    res.json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting template:", error);
    res.status(500).json({
      success: false,
      error: `Failed to delete template: ${error.message}`,
    });
  }
};

export const handleMessageStatus = async (messageId, status) => {
  try {
    const message = await WhatsAppMessage.findByPk(messageId);
    if (message) {
      // Map Twilio status to our status
      const mappedStatus =
        {
          queued: "pending",
          sent: "sent",
          delivered: "delivered",
          read: "read",
          failed: "failed",
        }[status] || status;

      await message.update({ status: mappedStatus });

      // Emit status update through socket
      EventBusService.emit("whatsapp:status_update", {
        messageId,
        status: mappedStatus,
        contactId: message.contactId,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Error updating message status:", error);
  }
};
