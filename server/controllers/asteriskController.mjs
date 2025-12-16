// import express from "express";
// import fs from "fs/promises";
// import dotenv from "dotenv";
// import { Network } from "../models/networkModel.js";
// import amiClient, { isAmiEnabled } from "../config/amiClient.js";
// import { EventBusService } from "../services/eventBus.js";

// dotenv.config();
// const router = express.Router();

// // POST /api/asterisk/add-networks
// export const addNetworkConfig = async (req, res) => {
//   try {
//     console.log(req.body, "Body of addNetworkConfig?");
//     if (!req.body.type || !req.body.address) {
//       return res.status(400).send({
//         message: "Network type and address are required!",
//       });
//     }

//     const { type, address, username, password } = req.body;

//     const networkConfig = {
//       type,
//       value: address,
//       username: username || null,
//       password: password || null,
//     };

//     const network = await Network.create(networkConfig);
//     const configFile =
//       type === "external_media_address"
//         ? "/etc/asterisk/pjsip_mayday_external.conf"
//         : "/etc/asterisk/pjsip_mayday_local.conf";

//     const configContent =
//       type === "external_media_address"
//         ? `external_media_address = ${address}\n`
//         : `local_net = ${address}\n`;

//     try {
//       await fs.access(configFile);
//     } catch (error) {
//       await fs.writeFile(configFile, "");
//     }

//     await fs.writeFile(configFile, configContent);

//     res.status(201).json({
//       ...network.toJSON(),
//       address: network.value,
//       message: `${networkConfig.type} network configuration added successfully!`,
//     });
//   } catch (error) {
//     res.status(500).send({
//       message:
//         error.message ||
//         "Some error occurred while creating the Network configuration.",
//     });
//   }
// };

// export const updateNetworkConfig = async (req, res) => {
//   const { id, type, address } = req.body;

//   console.log(req.body, "This is the body for update");
//   try {
//     const [updateCount] = await Network.update(
//       { value: address },
//       { where: { id, type } }
//     );

//     console.log(`${updateCount} record(s) updated.`);

//     if (updateCount === 0) {
//       return res
//         .status(404)
//         .send({ message: "Network configuration not found or unchanged." });
//     }

//     const updatedNetworkConfig = await Network.findOne({ where: { id, type } });

//     if (!updatedNetworkConfig) {
//       return res
//         .status(404)
//         .json({ message: "Updated network configuration not found." });
//     }

//     const updatedConfigData = {
//       id: updatedNetworkConfig.id,
//       type: updatedNetworkConfig.type,
//       address: updatedNetworkConfig.value,
//       createdAt: updatedNetworkConfig.createdAt,
//       updatedAt: updatedNetworkConfig.updatedAt,
//     };

//     EventBusService.emit("network:updated", updatedConfigData);

//     const configFileContent = `${type} = ${address}\n`;
//     let configFilePath =
//       type === "external_media_address"
//         ? "/etc/asterisk/pjsip_mayday_external.conf"
//         : "/etc/asterisk/pjsip_mayday_local.conf";

//     await fs.writeFile(configFilePath, configFileContent);
//     console.log("Configuration file updated successfully.");

//     res.json({
//       message: "Network configuration updated successfully!",
//       data: updatedConfigData,
//     });
//   } catch (error) {
//     console.error("Failed to update network configuration:", error);
//     res.status(500).json({
//       message: "Failed to update network configuration.",
//       error: error.toString(),
//     });
//   }
// };

// export const readNetworkConfigs = async (req, res) => {
//   try {
//     const externalConfig = await Network.findOne({
//       where: { type: "external_media_address" },
//     });
//     const localNetConfig = await Network.findOne({
//       where: { type: "local_net" },
//     });
//     const stunConfig = await Network.findOne({
//       where: { type: "stun_server" },
//     });

//     const networkConfigs = [];

//     if (externalConfig) {
//       networkConfigs.push({
//         id: externalConfig.id,
//         type: externalConfig.type,
//         address: externalConfig.value,
//         createdAt: externalConfig.createdAt,
//         updatedAt: externalConfig.updatedAt,
//       });
//     }

//     if (localNetConfig) {
//       networkConfigs.push({
//         id: localNetConfig.id,
//         type: localNetConfig.type,
//         address: localNetConfig.value,
//         createdAt: localNetConfig.createdAt,
//         updatedAt: localNetConfig.updatedAt,
//       });
//     }

//     if (stunConfig) {
//       networkConfigs.push({
//         id: stunConfig.id,
//         type: stunConfig.type,
//         address: stunConfig.value,
//         createdAt: stunConfig.createdAt,
//         updatedAt: stunConfig.updatedAt,
//       });
//     }

//     if (networkConfigs.length === 0) {
//       return res
//         .status(404)
//         .json({ message: "No network configurations found." });
//     }

//     res.status(200).json(networkConfigs);
//   } catch (error) {
//     console.error("Failed to get network configurations:", error);
//     res.status(500).json({ message: "Failed to get network configurations" });
//   }
// };

// export const deleteNetworkConfig = async (req, res) => {
//   const { id } = req.params;

//   try {
//     const deleteCount = await Network.destroy({ where: { id } });

//     if (deleteCount === 0) {
//       return res
//         .status(404)
//         .json({ message: "Network configuration not found." });
//     }

//     EventBusService.emit("network:deleted", { id });

//     res
//       .status(200)
//       .json({ id, message: "Network configuration deleted successfully!" });
//   } catch (error) {
//     console.error("Failed to delete network configuration:", error);
//     res.status(500).json({
//       message: "Failed to delete network configuration.",
//       error: error.toString(),
//     });
//   }
// };

// export const testAmiConnection = async (req, res) => {
//   try {
//     if (!isAmiEnabled()) {
//       return res.status(503).json({
//         status: "error",
//         message: "AMI is not enabled",
//         connected: false,
//       });
//     }

//     const response = await amiClient.action({
//       Action: "Command",
//       Command: "core show version",
//     });

//     res.json({
//       status: "success",
//       connected: true,
//       version: response,
//       details: {
//         host: process.env.ASTERISK_HOST,
//         port: process.env.ASTERISK_AMI_PORT,
//         username: process.env.ASTERISK_AMI_USERNAME,
//       },
//     });
//   } catch (error) {
//     console.error("AMI Test Error:", error);
//     res.status(500).json({
//       status: "error",
//       message: error.message,
//       connected: false,
//       details: {
//         host: process.env.ASTERISK_HOST,
//         port: process.env.ASTERISK_AMI_PORT,
//         username: process.env.ASTERISK_AMI_USERNAME,
//       },
//     });
//   }
// };

// export default router;
