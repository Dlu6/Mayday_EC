import sequelizePkg from "sequelize";
const { DataTypes } = sequelizePkg;
import sequelize from "../config/sequelize.js";

const Contact = sequelize.define(
  "whatsapp_contact",
  {
    // Core contact information
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        // E.164 format validation for WhatsApp
        is: /^\+[1-9]\d{1,14}$/,
      },
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },

    // WhatsApp specific fields
    unreadCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    lastMessage: DataTypes.TEXT,
    lastInteraction: DataTypes.DATE,
    isBlocked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isOnline: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    avatar: DataTypes.STRING,
    status: {
      type: DataTypes.STRING,
      defaultValue: "offline",
    },

    // Customer interaction fields
    customerType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    tags: {
      type: DataTypes.TEXT,
      defaultValue: "[]",
      get() {
        const rawValue = this.getDataValue("tags");
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(value) {
        this.setDataValue("tags", JSON.stringify(value || []));
      },
    },
    preferredLanguage: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // Contact center specific
    assignedAgentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    },
    lastContactChannel: {
      type: DataTypes.ENUM("whatsapp", "call", "email"),
      allowNull: true,
    },

    // Custom fields
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
    },

    // Timestamps are handled automatically by sequelize
    isGroup: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    timestamps: true, // enables createdAt and updatedAt
  }
);

const WhatsAppMessage = sequelize.define("whatsapp_message", {
  messageId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  from: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  sender: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  to: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  template: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
    validate: {
      hasRequiredFields(value) {
        if (value && Object.keys(value).length > 0 && !value.sid) {
          throw new Error("Template SID is required when template is provided");
        }
      },
    },
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: "sent",
    validate: {
      isIn: [
        [
          "queued",
          "sending",
          "sent",
          "delivered",
          "undelivered",
          "failed",
          "read",
          "received",
        ],
      ],
    },
  },
  replyTo: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: "whatsapp_messages",
      key: "id",
    },
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "text",
    validate: {
      isIn: [["text", "file", "image", "poll"]],
    },
  },
});

WhatsAppMessage.belongsTo(WhatsAppMessage, {
  as: "replyMessage",
  foreignKey: "replyTo",
});

const WhatsAppConfig = sequelize.define(
  "whatsapp_config",
  {
    accountSid: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    authToken: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    webhookUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    contentSid: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    templates: {
      type: DataTypes.JSON,
      defaultValue: [],
      allowNull: false,
    },
  },
  {
    tableName: "whatsapp_configs",
  }
);

// Define associations
Contact.hasMany(WhatsAppMessage, {
  foreignKey: "contactId",
  as: "messageHistory",
});

WhatsAppMessage.belongsTo(Contact, {
  foreignKey: "contactId",
});

export { Contact, WhatsAppMessage, WhatsAppConfig };
