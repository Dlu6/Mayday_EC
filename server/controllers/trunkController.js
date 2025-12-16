import sequelize, { Op } from "../config/sequelize.js";
import {
  PJSIPEndpoint,
  PJSIPAuth,
  PJSIPAor,
  // PJSIPRegistration,
  // PJSIPEndpointIdentifier,
  // PJSIPIdentify,
} from "../models/pjsipModel.js";
import amiService from "../services/amiService.js";
import { updatePJSIPConfig } from "../utils/asteriskConfigWriter.js";

export const createTrunk = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      name,
      defaultUser,
      password,
      host,
      context,
      transport,
      codecs = "ulaw,alaw",
      endpoint_type = "trunk",
    } = req.body;

    // Validate required fields
    if (!name || !defaultUser || !password || !host) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: name, defaultUser, password, or host",
      });
    }

    const baseId = name;
    const cleanHost = host.replace(/^sip:/, "").replace(/:\d+$/, "");

    // 1. Create Endpoint
    await PJSIPEndpoint.create(
      {
        id: baseId,
        transport,
        context,
        disallow: "all",
        allow: codecs,
        auth: `${baseId}_auth`,
        aors: `${baseId}_aor`,
        send_pai: "yes",
        send_rpid: "yes",
        endpoint_type,
        trunk_id: baseId,
        outbound_proxy: `sip:${cleanHost}:5060`,
        from_domain: cleanHost,
        from_user: defaultUser,
        rtp_symmetric: "yes",
        force_rport: "yes",
        rewrite_contact: "yes",
        direct_media: "no",
      },
      { transaction }
    );

    // 2. Create Auth
    await PJSIPAuth.create(
      {
        id: `${baseId}_auth`,
        auth_type: "userpass",
        username: defaultUser,
        password,
      },
      { transaction }
    );

    // 3. Create AOR
    await PJSIPAor.create(
      {
        id: `${baseId}_aor`,
        contact: `sip:${cleanHost}:5060`,
        qualify_frequency: 60,
        max_contacts: 1,
        remove_existing: "yes",
        support_path: "yes",
      },
      { transaction }
    );

    // Update the PJSIP configuration file
    await updatePJSIPConfig({
      name: baseId,
      username: defaultUser,
      password,
      host: cleanHost,
      transport,
      context,
      codecs,
    });

    await transaction.commit();

    // Reload PJSIP
    await amiService.executeAction({
      Action: "Command",
      Command: "pjsip reload",
    });

    res.status(201).json({
      success: true,
      message: "Trunk created successfully",
      trunk: {
        endpoint: {
          id: baseId,
          active: 1,
          enabled: true,
        },
        auth: {
          id: `${baseId}_auth`,
          username: defaultUser,
        },
        aor: {
          id: `${baseId}_aor`,
          contact: `sip:${cleanHost}:5060`,
        },
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error creating trunk:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create trunk",
      error: error.message,
    });
  }
};

export const updateTrunk = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { trunkId } = req.params;
    const updates = req.body;

    // Fetch the endpoint for the given trunk ID
    const endpoint = await PJSIPEndpoint.findOne({
      where: { trunk_id: trunkId },
      transaction,
    });

    if (!endpoint) {
      return res.status(404).json({
        success: false,
        message: "Trunk not found",
      });
    }

    // Ensure the transport value is properly formatted
    const transportValue = updates.transport || "transport-udp";
    if (!transportValue.startsWith("transport-")) {
      updates.transport = `transport-${transportValue}`;
    }

    // Update the endpoint
    await endpoint.update(
      {
        enabled: Boolean(updates.enabled),
        active: updates.enabled ? 1 : 0,
        transport: updates.transport || "transport-udp",
        context: updates.context || "from-voip-provider",
        allow: updates.codecs || "ulaw,alaw",
        from_user: updates.fromUser || updates.defaultUser,
        from_domain: updates.fromDomain || updates.host,
        direct_media: updates.directMedia || "no",
        outbound_proxy: updates.outboundProxy || "",
        rewrite_contact: updates.rewriteContact || "yes",
        rtp_symmetric: updates.rtpSymmetric || "yes",
        call_counter: updates.callCounter || "yes",
        encryption: updates.encryption || "no",
      },
      { transaction }
    );

    // Update the PJSIP Auth
    await PJSIPAuth.update(
      {
        auth_type: updates.auth_type || "userpass",
        username: updates.defaultUser,
        password: updates.password,
        realm: updates.realm || updates.host,
      },
      {
        where: { id: endpoint.auth },
        transaction,
      }
    );

    // Update the PJSIP AOR
    await PJSIPAor.update(
      {
        contact: updates.host.startsWith("sip:")
          ? updates.host
          : `sip:${updates.host}:5060`,
        qualify_frequency: updates.qualifyFrequency || 60,
        max_contacts: updates.maxContacts || 1,
        remove_existing: updates.removeExisting || "yes",
      },
      {
        where: { id: endpoint.aors },
        transaction,
      }
    );

    // Reload PJSIP configurations via AMI
    await amiService.executeAction({
      Action: "Command",
      Command: "pjsip reload",
    });

    await transaction.commit();

    // Update the PJSIP configuration File in the server
    await updatePJSIPConfig({
      name: trunkId,
      username: updates.defaultUser,
      password: updates.password,
      host: updates.host,
      context: updates.context,
      codecs: updates.codecs,
      transport: updates.transport,
    });

    // Fetch updated configurations
    const [updatedEndpoint, updatedAuth, updatedAor] = await Promise.all([
      PJSIPEndpoint.findOne({
        where: { trunk_id: trunkId },
        attributes: { include: ["enabled", "active"] },
      }),
      PJSIPAuth.findByPk(endpoint.auth),
      PJSIPAor.findByPk(endpoint.aors),
    ]);

    res.json({
      success: true,
      message: "Trunk updated successfully",
      trunk: {
        endpoint: updatedEndpoint,
        auth: updatedAuth,
        aor: updatedAor,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error updating trunk:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update trunk",
      error: error.message,
    });
  }
};

export const deleteTrunk = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { trunkId } = req.params;

    // Find the endpoint using trunk_id
    const endpoint = await PJSIPEndpoint.findOne({
      where: { trunk_id: trunkId },
      transaction,
    });

    if (!endpoint) {
      return res.status(404).json({
        success: false,
        message: "Trunk endpoint not found",
      });
    }

    // Get the actual auth ID from the endpoint
    const authId = endpoint.auth; // This will be the actual auth ID like "Cyber Trunk01_auth"

    // Delete all PJSIP configurations in parallel
    await Promise.all([
      PJSIPEndpoint.destroy({
        where: { trunk_id: trunkId },
        transaction,
      }),
      PJSIPAuth.destroy({
        where: { id: authId }, // Use the actual auth ID from the endpoint
        transaction,
      }),
      PJSIPAor.destroy({
        where: { id: `${trunkId}_aor` },
        transaction,
      }),
      // PJSIPRegistration.destroy({
      //   where: { id: trunkId },
      //   transaction,
      // }),
    ]);

    // Remove configurations from pjsip.conf
    await updatePJSIPConfig({
      name: endpoint.id, // Use the endpoint's actual ID
      delete: true,
    });

    // Reload PJSIP
    await amiService.executeAction({
      Action: "Command",
      Command: "pjsip reload",
    });

    await transaction.commit();

    res.json({
      success: true,
      message: "Trunk and all related configurations deleted successfully",
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error deleting trunk:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete trunk",
      error: error.message,
    });
  }
};

export const getTrunks = async (req, res) => {
  // console.log("getTrunks!!");
  try {
    const trunks = await PJSIPEndpoint.findAll({
      where: {
        endpoint_type: "trunk",
      },
      include: [
        {
          model: PJSIPAor,
          as: "aorConfig",
          required: false,
        },
        {
          model: PJSIPAuth,
          as: "authConfig",
          required: false,
          attributes: ["id", "auth_type", "password", "username"],
        },
        // {
        //   model: PJSIPRegistration,
        //   as: "registration",
        //   required: false,
        //   attributes: [
        //     "id",
        //     "reg_user",
        //     "client_uri",
        //     "server_uri",
        //     "contact_user",
        //     "outbound_auth",
        //     "transport",
        //     "expiration",
        //     "retry_interval",
        //     "max_retries",
        //     "auth_rejection_permanent",
        //     "forbidden_retry_interval",
        //   ],
        // },
      ],
    });
    // console.log(trunks, "Trunks!!");

    const formattedTrunks = trunks.map((trunk) => ({
      trunkId: trunk.trunk_id,
      name: trunk.id,
      endpoint: {
        ...trunk.get(),
        registration: trunk.registration ? trunk.registration.get() : null,
      },
      aor: trunk.aorConfig || null,
      auth: trunk.authConfig || null,
    }));

    res.json({
      success: true,
      trunks: formattedTrunks,
    });
  } catch (error) {
    console.error("Error fetching trunks:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch trunks",
      error: error.message,
    });
  }
};

export const getTrunkById = async (req, res) => {
  try {
    const { trunkId } = req.params;

    // Find all related PJSIP configurations
    const [endpoint, auth, aor] = await Promise.all([
      PJSIPEndpoint.findByPk(`${trunkId}-endpoint`),
      PJSIPAuth.findByPk(`${trunkId}-auth`),
      PJSIPAor.findByPk(trunkId),
    ]);

    if (!endpoint) {
      return res.status(404).json({
        success: false,
        message: "Trunk not found",
      });
    }

    res.json({
      success: true,
      trunk: {
        name: trunkId,
        endpoint,
        auth,
        aor,
      },
    });
  } catch (error) {
    console.error("Error fetching trunk:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch trunk",
      error: error.message,
    });
  }
};
