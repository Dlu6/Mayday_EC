// routes/users.js
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import mongoose from "mongoose";

// import amiClient from '../config/amiClient.js';
// import SipPeerModel from '../models/SipPeerModel.js';
import UserModel from "../models/UsersModel.js";

import {
  createPJSIPConfigs,
  PJSIPAor,
  // PJSIPAor,
  PJSIPAuth,
  PJSIPEndpoint,
  // PJSIPTransport,
  // updatePJSIPConfigs,
} from "../models/pjsipModel.js";
import sequelize, { Op } from "../config/sequelize.js";
import {
  // agentRegister,
  // createUserWithPJSIP,
  deletePjsipUser,
  getAllAgents,
} from "../services/userService.js";
// import { ariService } from "../services/ariService.js";
import { EventBusService } from "../services/eventBus.js";
import amiService from "../services/amiService.js";
import QueueMember from "../models/queueMemberModel.js";
import VoiceExtension from "../models/voiceExtensionModel.js";
// datatool User model removed - not used in this project

dotenv.config();

const router = express.Router();

// CREATE PJSIP EXTENSION USING DASHBOARD
export const createPJSIPUser = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const requiredFields = ["username", "password", "email", "fullName"];
    const missingFields = requiredFields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
      throw {
        status: 400,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      };
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const extension = await UserModel.generateUniqueExtension();

    const user = await UserModel.create(
      {
        ...req.body,
        password: hashedPassword,
        extension,
        role: req.body.role || "agent",
        type: "friend",
        // context: "from-internal",
      },
      { transaction }
    );

    const pjsipConfigs = await createPJSIPConfigs(
      extension,
      req.body.password,
      user.id,
      transaction,
      {
        isWebRTC: true,
        maxContacts: req.body.maxContacts || 1,
        endpoint: {
          transport: "transport-wss",
          webrtc: "yes",
          dtls_auto_generate_cert: "no",
          //   dtls_cert_file: "/etc/asterisk/keys/asterisk.pem",
          //   dtls_private_key: "/etc/asterisk/keys/asterisk.key",
          direct_media: "no",
          force_rport: "yes",
          ice_support: "yes",
          rtcp_mux: "yes",
          context: "from-internal",
          // context: "from-sip",
          disallow: "all",
          allow: "ulaw,alaw",
          dtls_verify: "fingerprint",
          dtls_setup: "passive",
          use_avpf: "yes",
          media_encryption: "dtls", // Use DTLS for WebRTC (SRTP via DTLS)
          media_use_received_transport: "yes",
          endpoint_type: "user",
        },
      }
    );

    // ✅ Step 3: Create `voice_extensions` Entry
    await VoiceExtension.bulkCreate(
      [
        // ✅ 1️⃣ Set Caller ID
        {
          context: "from-internal",
          exten: extension,
          priority: 1,
          app: "Set",
          appdata: `CALLERID(num)=${extension}`, // ✅ Set Caller ID
          type: "system",
        },
        // ✅ 2️⃣ Set Channel Language
        {
          context: "from-internal",
          exten: extension,
          priority: 2,
          app: "Set",
          appdata: `CHANNEL(language)=en`, // ✅ Set Language
          type: "system",
        },
        // ✅ 3️⃣ Set CDR Account Code (for billing, tracking, and logs)
        {
          context: "from-internal",
          exten: extension,
          priority: 3,
          app: "Set",
          appdata: `CDR(accountcode)=agent-${extension}`, // ✅ Useful for tracking
          type: "system",
        },
        // ✅ 4️⃣ Set Call Timeout
        {
          context: "from-internal",
          exten: extension,
          priority: 4,
          app: "Set",
          appdata: `CALL_TIMEOUT=15`, // ✅ Call timeout before redirecting
          type: "system",
        },
        // ✅ 5️⃣ Check if agent is paused (uses ODBC_AGENT_PAUSED function)
        {
          context: "from-internal",
          exten: extension,
          priority: 5,
          app: "Set",
          appdata: `AGENT_PAUSED=\${ODBC_AGENT_PAUSED(${extension})}`,
          type: "system",
        },
        // ✅ 6️⃣ If agent is paused, go to agent-unavailable handler
        {
          context: "from-internal",
          exten: extension,
          priority: 6,
          app: "GotoIf",
          appdata: `\${AGENT_PAUSED}?agent-unavailable,s,1`, // ✅ Redirect to unavailable context if paused
          type: "system",
        },
        // ✅ 7️⃣ Set Dial Command (only reached if agent is not paused)
        {
          context: "from-internal",
          exten: extension,
          priority: 7,
          app: "Dial",
          appdata: `PJSIP/${extension},15,Tt`, // ✅ 15 seconds ring time, with transfer options (T=caller can transfer, t=callee can transfer)
        },
        // ✅ 8️⃣ Set Hangup Command
        {
          context: "from-internal",
          exten: extension,
          priority: 8,
          app: "Hangup",
          appdata: "",
          type: "system",
        },
        // ✅ 7️⃣ Handle Call Hangup (if needed for IVR or CDR tracking)
        {
          context: "from-internal",
          exten: `hangup-${extension}`,
          priority: 1,
          app: "NoOp",
          appdata: `Call ended for ${extension}`,
          type: "system",
        },
        {
          context: "from-internal",
          exten: `hangup-${extension}`,
          priority: 2,
          app: "Hangup",
          appdata: "",
          type: "system",
        },
      ],
      { transaction }
    );

    // ✅ Step 4: Reload Asterisk Dialplan
    // await amiService.executeAction({
    //   Action: "Command",
    //   Command: "dialplan reload",
    // });

    await transaction.commit();

    // ✅ Dialplan Reload is Asynchronous (Non-blocking)
    setTimeout(async () => {
      try {
        const reloadResponse = await amiService.executeAction({
          Action: "Command",
          Command: "dialplan reload",
        });
        console.log("✅ Dialplan Reloaded Successfully:", reloadResponse);
      } catch (err) {
        console.error("❌ Failed to reload dialplan:", err);
      }
    }, 2000); // Allow DB commit to complete before AMI request

    res.status(201).json({
      success: true,
      message: "Agent created successfully",
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          extension: user.extension,
          role: user.role,
        },
        pjsip: pjsipConfigs,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error creating agent:", error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to create agent",
      error: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

//Get all agents

export const getAllUsers = async (req, res) => {
  try {
    const agents = await getAllAgents();
    res.json({
      success: true,
      data: agents,
    });
  } catch (error) {
    console.error("Error fetching agents:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch agents",
    });
  }
};

// Get Agent Details
export const getAgentDetailsByExtension = async (req, res) => {
  const { id } = req.params;

  try {
    const agent = await UserModel.findOne({
      where: { id },
      include: [
        {
          model: PJSIPEndpoint,
          attributes: ["id", "webrtc", "transport", "allow", "context"],
        },
        {
          model: PJSIPAuth,
          attributes: ["username"],
        },
      ],
    });

    if (agent) {
      res.json({
        success: true,
        data: agent,
      });
    } else {
      res.status(404).json({
        success: false,
        message: "Agent not found",
      });
    }
  } catch (error) {
    console.error("Error fetching agent details:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching agent details",
      error:
        process.env.NODE_ENV === "development" ? error.toString() : undefined,
    });
  }
};

// Get agent details by extension (for registration state verification)
export const getAgentDetailsByExtensionNumber = async (req, res) => {
  const { extension } = req.params;

  try {
    const agent = await UserModel.findOne({
      where: { extension },
      include: [
        {
          model: PJSIPEndpoint,
          attributes: ["id", "webrtc", "transport"],
        },
        {
          model: PJSIPAuth,
          attributes: ["username"],
        },
      ],
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: "Agent not found for extension",
      });
    }

    // Verify actual registration status with AMI
    let isActuallyRegistered = false;
    let amiStatus = null;
    let amiConnected = false;

    try {
      // Check if AMI is connected
      amiConnected = amiService.client && amiService.client.isConnected();

      if (amiConnected) {
        // Get the actual registration status from AMI
        const extensionStatus = amiService.getExtensionStatus(extension);
        isActuallyRegistered = extensionStatus.isRegistered;
        amiStatus = extensionStatus;

        console.log(`[AMI] Extension ${extension} status:`, extensionStatus);
      } else {
        console.warn("[AMI] AMI not connected - server may be down");
        // If AMI is not connected, we can't verify registration
        isActuallyRegistered = false;
        amiStatus = {
          isRegistered: false,
          peerStatus: "Unknown",
          lastSeen: null,
          error: "AMI not connected - server may be down",
        };
      }
    } catch (amiError) {
      console.error(
        `[AMI] Error checking extension ${extension} status:`,
        amiError
      );
      isActuallyRegistered = false;
      amiStatus = {
        isRegistered: false,
        peerStatus: "Error",
        lastSeen: null,
        error: amiError.message,
      };
    }

    // Get the actual agent status from AMI service
    let agentStatus = "Offline";
    let contactUri = null;
    let online = false;
    let currentAgent = null; // Declare at function level

    try {
      if (amiConnected) {
        // Get the actual agent status from the ps_contacts table
        const allAgents = await amiService.getAllExtensionStatuses();

        // Handle both array and object formats safely
        if (Array.isArray(allAgents)) {
          // Array format (new)
          currentAgent = allAgents.find(
            (agent) => agent.extension === extension
          );
        } else if (allAgents && typeof allAgents === "object") {
          // Object format (fallback)
          currentAgent = allAgents[extension];
          if (currentAgent) {
            currentAgent.extension = extension; // Add extension for consistency
          }
        }

        if (currentAgent) {
          agentStatus = currentAgent.status || "Offline";
          contactUri = currentAgent.contactUri || null;
          online = currentAgent.online || false;

          console.log(`[AMI] Agent ${extension} details from ps_contacts:`, {
            status: agentStatus,
            contactUri,
            online,
            amiStatus: currentAgent.amiStatus,
          });
        }
      }
    } catch (statusError) {
      console.warn(
        `[AMI] Error getting agent status for ${extension}:`,
        statusError
      );
    }

    res.json({
      success: true,
      data: {
        id: agent.id,
        username: agent.username,
        email: agent.email,
        extension: agent.extension,
        role: agent.role,
        // AMI registration status
        isRegistered: isActuallyRegistered,
        amiStatus: currentAgent?.amiStatus || amiStatus,
        amiConnected: amiConnected,
        serverStatus: amiConnected ? "online" : "offline",
        // Agent availability status (from ps_contacts table)
        status: agentStatus,
        online: online,
        contactUri: contactUri,
        lastSeen: amiStatus?.lastSeen || null,
      },
    });
  } catch (error) {
    console.error("Error fetching agent details by extension:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching agent details by extension",
      error:
        process.env.NODE_ENV === "development" ? error.toString() : undefined,
    });
  }
};

//Update Agent record
export const updateAgentDetails = async (req, res) => {
  const { id } = req.params;
  const { userData, pjsipData } = req.body;
  // console.log(req.body, "PJSIP DATA 🌶️🌶️🌶️🌶️🌶️");
  let transaction;

  try {
    transaction = await sequelize.transaction();

    // Update user data
    const [updated] = await UserModel.update(userData, {
      where: { id },
      transaction,
    });

    if (!updated) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Agent not found",
      });
    }

    // Get the user's extension for PJSIP updates
    const user = await UserModel.findByPk(id);

    if (pjsipData) {
      // Format PJSIP data to match createPJSIPUser structure
      const formattedPjsipData = {
        // Use values from pjsipData if available, otherwise fallback to user values
        transport: pjsipData.transport || user.transport || "transport-ws",
        webrtc: pjsipData.webrtc || (user.typology === "webRTC" ? "yes" : "no"),
        dtls_auto_generate_cert:
          pjsipData.dtls_auto_generate_cert ||
          user.dtls_auto_generate_cert ||
          "no",
        dtls_enabled:
          pjsipData.dtls_enabled !== undefined
            ? Boolean(pjsipData.dtls_enabled) // Ensure it's a boolean
            : user.dtls_enabled === undefined
            ? true
            : user.dtls_enabled, // Default to true
        dtls_cert_file: pjsipData.dtls_cert_file || user.dtls_cert_file,
        dtls_private_key: pjsipData.dtls_private_key || user.dtls_private_key,
        direct_media: pjsipData.direct_media || user.direct_media || "no",
        force_rport: pjsipData.force_rport || user.force_rport || "yes",
        ice_support: pjsipData.ice_support || user.ice_support || "yes",
        rtcp_mux: pjsipData.rtcp_mux || user.rtcp_mux || "yes",
        disallow: pjsipData.disallow || "all",
        allow: pjsipData.allow || user.allow || "ulaw,alaw",
        dtls_verify: pjsipData.dtls_verify || user.dtls_verify || "fingerprint",
        dtls_setup: pjsipData.dtls_setup || user.dtls_setup || "passive",
        use_avpf: pjsipData.use_avpf || user.avpf || "yes",
        media_encryption: pjsipData.media_encryption || "dtls",
        media_use_received_transport:
          pjsipData.media_use_received_transport || "yes",
        endpoint_type: "user",
        rewrite_contact: pjsipData.rewrite_contact || "yes",
        rtp_symmetric: pjsipData.rtp_symmetric || "yes",
      };

      // Update PJSIP endpoint
      await PJSIPEndpoint.update(formattedPjsipData, {
        where: { id: user.extension },
        transaction,
      });

      // Optionally update AOR expiration settings when provided
      const aorUpdates = {};
      if (
        pjsipData.aor_default_expiration !== undefined &&
        Number(pjsipData.aor_default_expiration) > 0
      ) {
        aorUpdates.default_expiration = Number(
          pjsipData.aor_default_expiration
        );
      }
      if (
        pjsipData.aor_maximum_expiration !== undefined &&
        Number(pjsipData.aor_maximum_expiration) > 0
      ) {
        aorUpdates.maximum_expiration = Number(
          pjsipData.aor_maximum_expiration
        );
      }
      if (Object.keys(aorUpdates).length > 0) {
        await PJSIPAor.update(aorUpdates, {
          where: { id: user.extension },
          transaction,
        });
      }
    }

    await transaction.commit();

    // Reload Asterisk Dialplan asynchronously
    setTimeout(async () => {
      try {
        const reloadResponse = await amiService.executeAction({
          Action: "Command",
          Command: "dialplan reload",
        });
        console.log("✅ Dialplan Reloaded Successfully:", reloadResponse);
      } catch (err) {
        console.error("❌ Failed to reload dialplan:", err);
      }
    }, 2000);

    // Fetch updated data
    const updatedAgent = await UserModel.findOne({
      where: { id },
      include: [
        {
          model: PJSIPEndpoint,
          attributes: [
            "id",
            "webrtc",
            "transport",
            "force_rport",
            "ice_support",
            "allow",
            "context",
          ],
        },
        {
          model: PJSIPAuth,
          attributes: ["username"],
        },
      ],
    });

    return res.json({
      success: true,
      message: "Agent updated successfully",
      data: updatedAgent,
    });
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error("Error updating agent:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
      error:
        process.env.NODE_ENV === "development" ? error.toString() : undefined,
    });
  }
};

// // Login Users
export const superUserLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    // console.log(password, "Password From login process>>>")

    // Check if the user exists
    const dbUser = await UserModel.findOne({ where: { username } });
    if (!dbUser) {
      return res
        .status(401)
        .json({ message: "Login failed: User does not exist!" });
    }

    // Check if the password is correct
    const isMatch = await bcrypt.compare(password, dbUser.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "Login failed: Incorrect password!" });
    }

    //Generate token
    const token = jwt.sign(
      { userId: dbUser.id, username: dbUser.username, role: dbUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    return res.json({
      token,
      ...dbUser.profile,
    });

    // Send the token in the response
    // res.json({ message: "Login successful", token });
  } catch (error) {
    res.status(500).json({ message: "Server error during login" });
  }
};

export const getProfile = async (req, res) => {
  try {
    const profile = await getProfile(req.user.id);
    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete an agent
export const deleteAgent = async (req, res) => {
  const { id } = req.params;
  console.log("🔴 Deleting Agent ID:", id);

  const transaction = await sequelize.transaction();

  try {
    const user = await UserModel.findOne({
      where: { id, role: { [Op.in]: ["agent", "user"] } },
      transaction,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Agent not found or user is not an agent",
      });
    }

    const extension = user.extension;

    // ✅ 1. Get Agent's Assigned Queues
    const assignedQueues = await QueueMember.findAll({
      where: { interface: `PJSIP/${extension}` },
      attributes: ["queue_name"], // Get only queue names
      raw: true,
      transaction,
    });

    // ✅ 2. Remove Agent from DB Queues First

    await QueueMember.destroy({
      where: { interface: `PJSIP/${extension}` },
      transaction,
    });

    // ✅ 3. Remove PJSIP User from Database
    await deletePjsipUser(id, transaction);

    // ✅ 4. Commit Transaction First (before AMI)
    await transaction.commit();
    console.log(
      "✅ Database transaction committed. Now executing AMI actions..."
    );

    // ✅ 5. Run AMI Actions Separately (Non-blocking) // Dynamically
    setTimeout(async () => {
      try {
        console.log("⚡ Executing AMI Queue Removal...");

        if (assignedQueues.length > 0) {
          // Remove from all assigned queues
          await Promise.all(
            assignedQueues.map((queue) =>
              amiService.executeAction({
                Action: "QueueRemove",
                Queue: queue.queue_name,
                Interface: `PJSIP/${extension}`,
              })
            )
          );
        }

        console.log("✅ Queue Member Removed from AMI.");

        // ✅ 5. Final Queue Reload (Only if QueueRemove is successful)
        await amiService.executeAction({
          Action: "Command",
          Command: "queue reload all",
        });

        console.log("✅ Queue Reloaded Successfully.");
      } catch (amiError) {
        console.error("❌ AMI Error Removing Queue Member:", amiError.message);
      }
    }, 2000); // Delay ensures DB changes are reflected before AMI execution.

    res.json({
      success: true,
      message: `Agent ${extension} deleted successfully.`,
      data: { userId: id, extension },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("❌ Delete Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete agent",
    });
  }
};

// Agent Login to the phonebar
export const registerAgent = async (req, res) => {
  const { email, password, isSoftphone, name } = req.body;

  const sqlTransaction = await sequelize.transaction();
  const mongoSession = await mongoose.startSession();
  mongoSession.startTransaction();

  try {
    // Fetch user once from SQL
    const user = await UserModel.findOne({
      where: { email, disabled: false },
      include: ["ps_endpoint", "ps_auth", "ps_aor"],
      transaction: sqlTransaction,
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw { status: 401, message: "Invalid credentials" };
    }

    if (isSoftphone && user.role !== "agent") {
      throw { status: 403, message: "Only agents can use the softphone" };
    }

    if (!user.extension) {
      user.extension = await UserModel.generateUniqueExtension();
      await user.save({ transaction: sqlTransaction });
    }

    // Fetch existing MongoDB user first
    let mongoUser = await User.findOne({ email }).session(mongoSession);

    // Determine the correct name to use
    const finalName = mongoUser?.name || name || "Unnamed User";

    // Upsert MongoDB user with ensured name
    mongoUser = await User.findOneAndUpdate(
      { email },
      {
        $setOnInsert: {
          name: finalName,
          email,
          password: await bcrypt.hash(password, 12),
          user_role: user.role === "agent" ? "CREATOR" : "ADMIN",
          firstName: finalName.split(" ")[0],
          lastName: finalName.split(" ")[1] || "",
        },
      },
      { upsert: true, new: true, session: mongoSession }
    );

    // console.log(user, "USER TRANSPORT 🌶️🌶️🌶️🌶️🌶️");

    // Upsert PJSIP configurations concurrently
    await Promise.all([
      PJSIPEndpoint.upsert(
        {
          id: user.extension,
          transport: user.transport || "transport-wss",
          webrtc: user.typology === "webRTC" ? "yes" : "no",
          auth: user.extension,
          aors: user.extension,
          outbound_auth: user.extension,
          context: user.context,
          disallow: "all",
          allow: "ulaw,alaw,opus,g729 ",
          endpoint_type: "user",
          direct_media: "no",
          force_rport: "yes",
          rewrite_contact: "yes",
          ice_support: user.ice_support || "yes",
          rtcp_mux: user.rtcp_mux || "yes",
          dtls_verify: user.dtls_verify || "fingerprint",
          dtls_setup: user.dtls_setup || "passive",
          dtls_enabled: user.dtls_enabled !== false,
          dtls_auto_generate_cert: user.dtls_auto_generate_cert || "no",
          use_avpf: "yes",
          media_encryption: "dtls",
          media_use_received_transport: "yes",
          identify_by: "auth,username",
          rtp_symmetric: "yes",
          send_pai: "no",
        },
        { transaction: sqlTransaction }
      ),
      PJSIPAuth.upsert(
        {
          id: user.extension,
          auth_type: "userpass",
          password: user.ps_auth?.password || bcrypt.hashSync(password, 10),
          username: user.extension,
        },
        { transaction: sqlTransaction }
      ),
      PJSIPAor.upsert(
        {
          id: user.extension,
          max_contacts: 1,
          remove_existing: "yes",
          default_expiration: 3600,
          qualify_frequency: 30,
          support_path: "yes",
        },
        { transaction: sqlTransaction }
      ),
    ]);

    // Removed: application-level writes to ps_contacts (Asterisk is source of truth)

    // Generate tokens concurrently
    const [sipToken, mongoToken] = await Promise.all([
      jwt.sign(
        {
          userId: user.id,
          username: user.username,
          role: user.role,
          extension: user.extension,
          sipEnabled: true,
        },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      ),
      jwt.sign(
        {
          email: mongoUser.email,
          id: mongoUser._id,
          role: mongoUser.user_role,
        },
        "testhjzvdbnfvADHG878HM5@#$",
        { expiresIn: "24h" }
      ),
    ]);

    await Promise.all([
      mongoSession.commitTransaction(),
      sqlTransaction.commit(),
    ]);

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          extension: user.extension,
          typology: user.typology,
          wss_port: user.wss_port || 8089,
          pjsip: {
            type: user.ps_endpoint?.type,
            extension: user.extension,
            password: user.ps_auth?.password,
            server: process.env.ASTERISK_HOST,
            transport: user.transport,
            // Include all WebRTC-related configurations from both user and ps_endpoint
            rtp_symmetric: user.ps_endpoint?.rtp_symmetric === "yes" || true,
            media_use_received_transport:
              user.ps_endpoint?.mediaUseReceivedTransport === "yes" ||
              user.ps_endpoint?.media_use_received_transport === "yes" ||
              true,
            rewrite_contact:
              user.ps_endpoint?.rewrite_contact === "yes" || true,
            force_rport: user.ps_endpoint?.force_rport === "yes" || true,
            dtls_enabled: user.dtlsenable === "yes" || true,
            ice_support:
              user.ice_support === "yes" ||
              user.ps_endpoint?.ice_support === "yes" ||
              true,
            rtcp_mux:
              user.rtcp_mux === "yes" ||
              user.ps_endpoint?.rtcpMux === "yes" ||
              true,
            avpf:
              user.avpf === "yes" ||
              user.ps_endpoint?.useAvpf === "yes" ||
              true,
            dtls_setup:
              user.dtls_setup || user.ps_endpoint?.dtlsSetup || "passive",
            dtls_verify:
              user.dtlsverify === "yes" ||
              user.ps_endpoint?.dtlsVerify === "yes" ||
              "fingerprint",
            media_encryption: user.ps_endpoint?.mediaEncryption || "dtls",
            force_avp:
              user.force_avp === "yes" ||
              user.ps_endpoint?.forceAvp === "yes" ||
              false,
            webrtc: user.typology === "webRTC", // Use typology to determine if WebRTC is enabled
            ws_servers: [
              {
                uri: process.env.WS_SERVERS || `ws://${process.env.PUBLIC_IP}:8088/ws`,
                sip_transport:
                  user.transport?.replace("transport-", "") || "wss",
                protocols: ["sip"],
              },
            ],
            ice_servers: [
              { urls: process.env.STUN_SERVER || "stun:stun.l.google.com:19302" },
            ],
          },
        },
        mongoUser: {
          id: mongoUser._id,
          name: mongoUser.name,
          email: mongoUser.email,
          role: mongoUser.user_role,
        },
        tokens: {
          sip: `Bearer ${sipToken}`,
          mongo: `Bearer ${mongoToken}`,
        },
      },
    });
  } catch (error) {
    await Promise.all([
      mongoSession.abortTransaction(),
      sqlTransaction.rollback(),
    ]);
    console.error("❌ Register Agent Error:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Registration failed",
    });
  } finally {
    mongoSession.endSession();
  }
};
// Agent Online Notification
export const agentOnline = async (req, res) => {
  const { extension, contactUri } = req.body;
  const { id: userId } = req.user.dataValues;

  try {
    // Validate extension
    if (!extension) {
      return res.status(400).json({
        success: false,
        message: "Extension is required",
      });
    }

    // Update user status in database
    await UserModel.update(
      {
        online: true,
        sipRegistered: true,
        lastLoginAt: new Date(),
      },
      {
        where: { id: userId },
      }
    );

    // Removed: application-level writes to ps_contacts (Asterisk is source of truth)

    // Emit status events
    EventBusService.emit("agent:status", {
      extension,
      userId,
      data: {
        status: "online",
        timestamp: new Date().toISOString(),
      },
    });

    return res.json({
      success: true,
      message: "Agent online status updated",
      data: {
        userId,
        extension,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Agent online error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update agent online status",
    });
  }
};

// Agent Logout
export const agentLogout = async (req, res) => {
  const { id: userId, extension } = req.user.dataValues;
  const sqlTransaction = await sequelize.transaction();
  const mongoSession = await mongoose.startSession();

  try {
    mongoSession.startTransaction();

    // Find user with their PJSIP configurations
    const user = await UserModel.findOne({
      where: { id: userId, disabled: false },
      include: [
        { model: PJSIPEndpoint, as: "ps_endpoint", required: false },
        { model: PJSIPAuth, as: "ps_auth", required: false },
        { model: PJSIPAor, as: "ps_aor", required: false },
      ],
      transaction: sqlTransaction,
    });

    if (!user) {
      throw { status: 404, message: "User not found" };
    }

    // Update SQL user status
    await UserModel.update(
      {
        online: false,
        sipRegistered: false,
        lastLogoutAt: new Date(),
      },
      {
        where: { id: userId },
        transaction: sqlTransaction,
      }
    );

    // Update MongoDB user status
    await User.findOneAndUpdate(
      { email: user.email },
      {
        lastLogoutAt: new Date(),
        online: false,
      },
      { session: mongoSession }
    );

    // Handle SIP cleanup
    await cleanupSIPRegistration(extension, sqlTransaction);

    // Removed: application-level writes to ps_contacts (Asterisk is source of truth)

    // Emit status events
    EventBusService.emit("agent:status", {
      extension,
      userId,
      data: {
        status: "offline",
        timestamp: new Date().toISOString(),
      },
    });

    await mongoSession.commitTransaction();
    await sqlTransaction.commit();

    return res.json({
      success: true,
      message: "Logged out successfully",
      data: {
        userId,
        extension,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    await mongoSession.abortTransaction();
    await sqlTransaction.rollback();
    console.error("❌ Agent Logout Error:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to logout",
    });
  } finally {
    mongoSession.endSession();
  }
};

// Helper function for SIP cleanup
async function cleanupSIPRegistration(extension, transaction) {
  // Update AOR to initial state
  await PJSIPAor.update(
    {
      contact: null,
      remove_existing: "yes",
      max_contacts: 0,
      qualify_frequency: 0,
      support_path: "no",
    },
    {
      where: { id: extension },
      transaction,
    }
  );

  // Force remove existing contacts using AMI client's sendAction
  const contacts = await amiService.client.sendAction({
    Action: "PJSIPShowContacts",
  });

  if (contacts.events) {
    for (const event of contacts.events) {
      if (event.AOR === extension) {
        await amiService.client.sendAction({
          Action: "Command",
          Command: `pjsip send remove contact ${event.ContactUri}`,
        });
      }
    }
  }

  // Send unregister command
  await amiService.client.sendAction({
    Action: "PJSIPUnregister",
    Endpoint: extension,
  });

  // Wait for contacts cleanup
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Reset AOR settings
  await PJSIPAor.update(
    {
      max_contacts: 1,
      qualify_frequency: 30,
      support_path: "yes",
    },
    {
      where: { id: extension },
      transaction,
    }
  );
}

// Update agent presence status
export const updateAgentPresence = async (req, res) => {
  const { extension, presence } = req.body;

  if (!extension || !presence) {
    return res.status(400).json({
      success: false,
      message: "Extension and presence status are required",
    });
  }

  try {
    console.log(
      `[Agent Presence] Updating extension ${extension} to status: ${presence}`
    );

    // Update agent presence in the database
    const existingUser = await UserModel.findOne({
      where: { extension },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "Agent not found for the given extension",
      });
    }

    // Update the user directly
    await existingUser.update({
      presence: presence,
      lastPresenceUpdate: new Date().toISOString(),
    });

    // Emit presence change event
    EventBusService.emit("agent:presence", {
      extension,
      presence,
      timestamp: new Date().toISOString(),
    });

    // If setting to BREAK, also update queue member status
    if (presence === "BREAK") {
      try {
        // Set queue member to unavailable
        await amiService.executeAction({
          Action: "QueuePause",
          Queue: "default", // You might want to make this configurable
          Interface: `PJSIP/${extension}`,
          Paused: "1",
          Reason: "Agent on break",
        });
        console.log(`[Agent Presence] Set queue member ${extension} to paused`);
      } catch (amiError) {
        console.warn(
          `[Agent Presence] Failed to update queue status:`,
          amiError.message
        );
      }
    } else if (presence === "READY") {
      try {
        // Set queue member to available
        await amiService.executeAction({
          Action: "QueuePause",
          Queue: "default", // You might want to make this configurable
          Interface: `PJSIP/${extension}`,
          Paused: "0",
        });
        console.log(
          `[Agent Presence] Set queue member ${extension} to available`
        );
      } catch (amiError) {
        console.warn(
          `[Agent Presence] Failed to update queue status:`,
          amiError.message
        );
      }
    }

    res.json({
      success: true,
      message: "Agent presence updated successfully",
      data: {
        extension,
        presence,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[Agent Presence] Error updating presence:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update agent presence",
      error:
        process.env.NODE_ENV === "development" ? error.toString() : undefined,
    });
  }
};

/**
 * Get agent dialplan entries
 */
export const getAgentDialplan = async (req, res) => {
  try {
    const { extension } = req.params;

    if (!extension) {
      return res.status(400).json({
        success: false,
        message: "Extension is required",
      });
    }

    // Fetch dialplan entries for this extension
    const dialplanEntries = await VoiceExtension.findAll({
      where: {
        context: "from-internal",
        [Op.or]: [
          { exten: extension },
          { exten: `hangup-${extension}` },
        ],
      },
      order: [["exten", "ASC"], ["priority", "ASC"]],
    });

    res.json({
      success: true,
      data: dialplanEntries,
    });
  } catch (error) {
    console.error("[Agent Dialplan] Error fetching dialplan:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch agent dialplan",
      error: process.env.NODE_ENV === "development" ? error.toString() : undefined,
    });
  }
};

/**
 * Regenerate agent dialplan with latest configuration (including pause check)
 */
export const regenerateAgentDialplan = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { extension } = req.params;

    if (!extension) {
      return res.status(400).json({
        success: false,
        message: "Extension is required",
      });
    }

    // Verify the agent exists
    const agent = await UserModel.findOne({
      where: { extension },
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: "Agent not found for the given extension",
      });
    }

    // Delete existing dialplan entries for this extension
    await VoiceExtension.destroy({
      where: {
        context: "from-internal",
        [Op.or]: [
          { exten: extension },
          { exten: `hangup-${extension}` },
        ],
      },
      transaction,
    });

    // Create new dialplan entries with pause check
    await VoiceExtension.bulkCreate(
      [
        // 1️⃣ Set Caller ID
        {
          context: "from-internal",
          exten: extension,
          priority: 1,
          app: "Set",
          appdata: `CALLERID(num)=${extension}`,
          type: "system",
        },
        // 2️⃣ Set Channel Language
        {
          context: "from-internal",
          exten: extension,
          priority: 2,
          app: "Set",
          appdata: `CHANNEL(language)=en`,
          type: "system",
        },
        // 3️⃣ Set CDR Account Code
        {
          context: "from-internal",
          exten: extension,
          priority: 3,
          app: "Set",
          appdata: `CDR(accountcode)=agent-${extension}`,
          type: "system",
        },
        // 4️⃣ Set Call Timeout
        {
          context: "from-internal",
          exten: extension,
          priority: 4,
          app: "Set",
          appdata: `CALL_TIMEOUT=15`,
          type: "system",
        },
        // 5️⃣ Check if agent is paused
        {
          context: "from-internal",
          exten: extension,
          priority: 5,
          app: "Set",
          appdata: `AGENT_PAUSED=\${ODBC_AGENT_PAUSED(${extension})}`,
          type: "system",
        },
        // 6️⃣ If agent is paused, go to agent-unavailable handler
        {
          context: "from-internal",
          exten: extension,
          priority: 6,
          app: "GotoIf",
          appdata: `\${AGENT_PAUSED}?agent-unavailable,s,1`,
          type: "system",
        },
        // 7️⃣ Dial Command (only reached if agent is not paused)
        {
          context: "from-internal",
          exten: extension,
          priority: 7,
          app: "Dial",
          appdata: `PJSIP/${extension},15,Tt`,
        },
        // 8️⃣ Hangup Command
        {
          context: "from-internal",
          exten: extension,
          priority: 8,
          app: "Hangup",
          appdata: "",
          type: "system",
        },
        // 9️⃣ Handle Call Hangup context
        {
          context: "from-internal",
          exten: `hangup-${extension}`,
          priority: 1,
          app: "NoOp",
          appdata: `Call ended for ${extension}`,
          type: "system",
        },
        {
          context: "from-internal",
          exten: `hangup-${extension}`,
          priority: 2,
          app: "Hangup",
          appdata: "",
          type: "system",
        },
      ],
      { transaction }
    );

    await transaction.commit();

    // Reload dialplan asynchronously
    setTimeout(async () => {
      try {
        await amiService.executeAction({
          Action: "Command",
          Command: "dialplan reload",
        });
        console.log(`✅ Dialplan reloaded for extension ${extension}`);
      } catch (err) {
        console.error("❌ Failed to reload dialplan:", err);
      }
    }, 1000);

    // Fetch the newly created entries
    const newDialplanEntries = await VoiceExtension.findAll({
      where: {
        context: "from-internal",
        [Op.or]: [
          { exten: extension },
          { exten: `hangup-${extension}` },
        ],
      },
      order: [["exten", "ASC"], ["priority", "ASC"]],
    });

    res.json({
      success: true,
      message: `Dialplan regenerated successfully for extension ${extension}`,
      data: newDialplanEntries,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("[Agent Dialplan] Error regenerating dialplan:", error);
    res.status(500).json({
      success: false,
      message: "Failed to regenerate agent dialplan",
      error: process.env.NODE_ENV === "development" ? error.toString() : undefined,
    });
  }
};

export default router;
