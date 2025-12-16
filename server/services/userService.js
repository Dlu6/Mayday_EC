import sequelize, { Op } from "../config/sequelize.js";
// import bcrypt from "bcrypt";
// import jwt from "jsonwebtoken";
import {
  // createPJSIPConfigs,
  PJSIPAor,
  PJSIPAuth,
  PJSIPEndpoint,
  // PJSIPEndpointIdentifier,
  // PJSIPRegistration,
} from "../models/pjsipModel.js";
import UserModel from "../models/UsersModel.js";
import { socketService } from "./socketService.js";
import { ariService } from "./ariService.js";
import amiService from "./amiService.js";
import VoiceExtension from "../models/voiceExtensionModel.js";
// import { createPjsipUser } from "../config/amiClient.js";

export const checkExtensionStatus = async (extension) => {
  try {
    const [pjsipStatus, ariStatus] = await Promise.all([
      PJSIPEndpoint.findOne({
        where: { id: extension },
        attributes: ["id", "status"],
      }),
      ariService.checkPeer(extension),
    ]);

    return {
      extension,
      pjsip: pjsipStatus?.status || "unknown",
      ari: ariStatus.state,
      online: ariStatus.online,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Error checking extension status for ${extension}:`, error);
    return {
      extension,
      pjsip: "unknown",
      ari: "unknown",
      online: false,
      error: error.message,
    };
  }
};

// Update user/extension status || Not yet implemented
export const updateUserStatus = async (userId, status) => {
  const transaction = await sequelize.transaction();

  try {
    const user = await UserModel.findByPk(userId, {
      attributes: ["id", "extension", "online"],
      transaction,
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Update user status
    await user.update({ online: status === "online" }, { transaction });

    // Update PJSIP endpoint status
    await PJSIPEndpoint.update(
      { status },
      {
        where: { id: user.extension },
        transaction,
      }
    );

    await transaction.commit();

    // Notify connected clients
    socketService.emit(user.extension, "user:status", {
      extension: user.extension,
      status,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      extension: user.extension,
      status,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

export const getAllAgents = async () => {
  try {
    const agents = await UserModel.findAll({
      where: {
        role: {
          [Op.in]: ["agent", "user"],
        },
        disabled: false,
      },
      include: [
        {
          model: PJSIPEndpoint,
          required: false,
          as: "ps_endpoint",
          attributes: ["id", "webrtc", "transport"],
        },
        {
          model: PJSIPAuth,
          required: false,
          as: "ps_auth",
          attributes: ["id", "username"],
        },
        {
          model: PJSIPAor,
          required: false,
          as: "ps_aor",
          attributes: ["id"],
        },
      ],
      attributes: {
        exclude: ["password", "resetPasswordToken", "resetPasswordExpires"],
      },
    });
    return agents;
  } catch (error) {
    console.error("Error fetching agents:", error);
    throw error;
  }
};

export const deletePjsipUser = async (userId, transaction) => {
  try {
    const user = await UserModel.findByPk(userId, { transaction });

    if (!user) {
      throw new Error("User not found");
    }

    console.log("🔴 Deleting PJSIP User:", user.extension);

    // ✅ Delete PJSIP configurations from DB first
    await Promise.all([
      PJSIPAuth.destroy({ where: { id: user.extension }, transaction }),
      PJSIPAor.destroy({ where: { id: user.extension }, transaction }),
      PJSIPEndpoint.destroy({ where: { id: user.extension }, transaction }),
      VoiceExtension.destroy({ where: { exten: user.extension }, transaction }),
    ]);

    // ✅ Delete user record
    await user.destroy({ transaction });

    console.log("✅ PJSIP User Deleted Successfully.");
  } catch (error) {
    console.error("❌ Error Deleting PJSIP User:", error);
    throw error;
  }
};
export const getProfile = async (userId) => {
  const user = await UserModel.findByPk(userId, {
    include: [
      {
        model: PJSIPEndpoint,
        attributes: ["id", "webrtc", "transport", "dtls_auto_generate_cert"],
      },
    ],
    attributes: {
      exclude: ["password", "resetPasswordToken", "resetPasswordExpires"],
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

export const agentLogout = async (userId, extension) => {
  const transaction = await sequelize.transaction();

  try {
    // Update user status in database
    await UserModel.update(
      {
        online: false,
        sipRegistered: false,
        lastLogoutAt: new Date(),
      },
      {
        where: { id: userId },
        transaction,
      }
    );

    // Clean up PJSIP endpoint if using AMI
    if (amiService.getState().connected) {
      try {
        // Force endpoint unregistration
        await amiService.executeAction({
          Action: "PJSIPShowEndpoint",
          Endpoint: extension,
          Command: "contact_delete",
        });

        // Notify endpoint to unregister
        await amiService.executeAction({
          Action: "PJSIPNotify",
          Endpoint: extension,
          Variable: "Event=remove",
        });
      } catch (amiError) {
        console.error("AMI cleanup error:", amiError);
      }
    }

    await transaction.commit();
    return true;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
