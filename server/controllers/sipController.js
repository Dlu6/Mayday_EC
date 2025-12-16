// // controllers/sipController.js
// import jwt from "jsonwebtoken";
// import {
//   createPjsipUser,
//   getPjsipEndpointStatus,
//   isAmiEnabled,
// } from "../config/amiClient.js";
// import UserModel from "../models/UsersModel.js";
// import sequelize from "../config/sequelize.js";
// import sequelizePkg from "sequelize";
// import bcrypt from "bcrypt";
// import { ariService } from "../services/ariService.js";

// const { Op } = sequelizePkg;

// // New function for initial softphone login
// export const softphoneLogin = async (req, res) => {
//   console.log("Softphone login called with body:", req.body);
//   try {
//     const { email, password } = req.body;

//     // Debug database connection
//     try {
//       await sequelize.authenticate();
//       console.log("Database connection is OK");
//     } catch (error) {
//       console.error("Database connection failed:", error);
//       return res.status(500).json({
//         message: "Database connection error",
//         error: error.message,
//       });
//     }

//     // Debug UserModel structure
//     // console.log("UserModel attributes:", Object.keys(UserModel.rawAttributes));
//     // console.log("UserModel table name:", UserModel.tableName);

//     // Try to get all users first to verify data access
//     const allUsers = await UserModel.findAll({
//       attributes: ["id", "email", "role", "extension"],
//     });
//     // console.log("Total users in database:", allUsers.length);
//     // console.log("Sample of users:", allUsers.slice(0, 3));

//     // Now try to find the specific user
//     const user = await UserModel.findOne({
//       where: {
//         email,
//         role: {
//           [Op.in]: ["user", "agent"],
//         },
//       },
//       //   logging: (sql, queryObject) => {
//       //     console.log("Generated SQL:", sql);
//       //     console.log("Query parameters:", queryObject);
//       //   },
//     });

//     // console.log(
//     //   "Query result:",
//     //   user
//     //     ? {
//     //         id: user.id,
//     //         email: user.email,
//     //         role: user.role,
//     //         extension: user.extension,
//     //       }
//     //     : "No user found"
//     // );

//     if (!user) {
//       return res.status(401).json({
//         message: "Agent not found",
//         debug: {
//           searchCriteria: { email, role: "agent" },
//           totalUsersInDB: allUsers.length,
//         },
//       });
//     }

//     // Verify password using bcrypt
//     const isValidPassword = await bcrypt.compare(password, user.password);
//     if (!isValidPassword) {
//       return res.status(401).json({
//         message: "Invalid credentials",
//       });
//     }

//     // Verify user has an extension assigned
//     if (!user.extension) {
//       return res.status(400).json({
//         message:
//           "No extension assigned to this agent. Please contact your administrator.",
//       });
//     }

//     // Generate JWT token
//     const token = jwt.sign(
//       {
//         userId: user.id,
//         role: user.role,
//         extension: user.extension, // Include extension in token
//       },
//       process.env.JWT_SECRET,
//       { expiresIn: "24h" }
//     );

//     if (isAmiEnabled()) {
//       try {
//         const peerCreated = await createPjsipUser(
//           user.extension,
//           user.secret,
//           user.fullName
//         );

//         if (!peerCreated) {
//           console.error("Failed to create PJSIP endpoint");
//           return res.status(503).json({
//             message:
//               "Failed to configure SIP extension. Please contact administrator.",
//             error: "PJSIP endpoint creation failed",
//           });
//         }

//         // Get the endpoint status
//         const status = await getPjsipEndpointStatus(user.extension);
//         console.log(`PJSIP endpoint status for ${user.extension}: ${status}`);
//       } catch (amiError) {
//         console.error("AMI Error:", amiError);
//         return res.status(503).json({
//           message:
//             "Asterisk service unavailable. Please contact administrator.",
//           error: amiError.message,
//         });
//       }
//     } else {
//       console.log("Running in development mode - skipping PJSIP configuration");
//     }

//     // Update registration status
//     user.sipRegistered = true;
//     await user.save();

//     res.json({
//       token, // Include JWT token in response
//       sipCredentials: {
//         username: user.extension,
//         password: user.secret,
//         domain: process.env.SIP_DOMAIN || "localhost",
//         wsServers: process.env.WS_SERVERS || "ws://localhost:8088/ws",
//         register: true,
//         registerExpires: 300,
//         userAgentString: `${user.fullName} WebPhone`,
//         traceSip: process.env.NODE_ENV !== "production",
//         log: {
//           level: process.env.NODE_ENV !== "production" ? "debug" : "error",
//         },
//       },
//       agentInfo: {
//         id: user.id,
//         extension: user.extension,
//         name: user.fullName,
//         email: user.email,
//       },
//       endpoints: {
//         registrationStatus: "/api/sip/registration-status",
//         status: "/api/sip/status",
//         register: "/api/sip/register",
//       },
//       mode: isAmiEnabled() ? "production" : "development",
//     });
//   } catch (error) {
//     console.error("Softphone login error:", error);
//     res.status(500).json({
//       message: "Server error during softphone login",
//       error: error.message,
//     });
//   }
// };

// export const getSipCredentials = async (req, res) => {
//   try {
//     const userId = req.user.userId;
//     const user = await UserModel.findByPk(userId);

//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     const sipCredentials = {
//       username: user.extension,
//       // Don't send the actual password to the client
//       domain: process.env.SIP_DOMAIN,
//       wsServers: process.env.WS_SERVERS,
//     };

//     res.json(sipCredentials);
//   } catch (error) {
//     console.error("Error fetching SIP credentials:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// export const updateSipRegistrationStatus = async (req, res) => {
//   try {
//     const { status } = req.body;
//     const userId = req.user.userId;

//     const user = await UserModel.findByPk(userId);

//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     const isRegistered = status === "registered";
//     user.sipRegistered = isRegistered;
//     await user.save();

//     if (isRegistered) {
//       const peerCreated = await createPjsipUser(
//         user.extension,
//         user.secret,
//         user.fullName
//       );
//       if (!peerCreated) {
//         return res.status(500).json({ message: "Failed to create SIP peer" });
//       }
//     }

//     const currentStatus = await getPjsipEndpointStatus(user.extension);

//     res.json({
//       message: "SIP registration status updated",
//       status: currentStatus,
//     });
//   } catch (error) {
//     console.error("Error updating SIP registration status:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// export const getSipStatus = async (req, res) => {
//   try {
//     const userId = req.user.userId;
//     const user = await UserModel.findByPk(userId);

//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     const status = await getPjsipEndpointStatus(user.extension);
//     res.json({ status });
//   } catch (error) {
//     console.error("Error fetching SIP status:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// export const checkRegistrationStatus = async (req, res) => {
//   try {
//     const { extension } = req.body;

//     if (!extension) {
//       return res.status(400).json({
//         status: "error",
//         message: "Extension is required",
//       });
//     }

//     // Check if user exists with this extension
//     const user = await UserModel.findOne({
//       where: { extension },
//     });

//     if (!user) {
//       return res.status(404).json({
//         status: "error",
//         message: "Extension not found",
//       });
//     }

//     if (!isAmiEnabled()) {
//       return res.json({
//         status: "success",
//         registered: user.sipRegistered || false,
//         mode: "development",
//         extension,
//       });
//     }

//     const sipStatus = await getPjsipEndpointStatus(extension);

//     // Update user's registration status in database
//     user.sipRegistered = sipStatus === "registered";
//     await user.save();

//     res.json({
//       status: "success",
//       registered: sipStatus === "registered",
//       sipStatus,
//       mode: "production",
//       extension,
//     });
//   } catch (error) {
//     console.error("Error checking registration status:", error);
//     res.status(500).json({
//       status: "error",
//       message: error.message,
//       registered: false,
//     });
//   }
// };

// export const createEndpoint = async (req, res) => {
//   try {
//     const { extension, password } = req.body;

//     // Verify user exists and has permission
//     const user = await UserModel.findOne({
//       where: {
//         extension,
//         disabled: false,
//         deleted_at: null,
//       },
//     });

//     if (!user) {
//       return res.status(404).json({ message: "User not found or inactive" });
//     }

//     // Create/Update the endpoint in Asterisk's realtime database
//     if (isAmiEnabled()) {
//       try {
//         const peerCreated = await createPjsipUser(
//           extension,
//           password || user.secret,
//           user.fullName
//         );

//         if (!peerCreated) {
//           return res.status(503).json({
//             message: "Failed to configure SIP extension",
//             error: "PJSIP endpoint creation failed",
//           });
//         }
//       } catch (amiError) {
//         console.error("AMI Error:", amiError);
//         return res.status(503).json({
//           message: "Asterisk service unavailable",
//           error: amiError.message,
//         });
//       }
//     }

//     // Update user's SIP registration status
//     user.sip_registered = true;
//     await user.save();

//     res.json({
//       message: "Endpoint created successfully",
//       extension,
//       status: "registered",
//     });
//   } catch (error) {
//     console.error("Error creating endpoint:", error);
//     res.status(500).json({
//       message: "Failed to create endpoint",
//       error: error.message,
//     });
//   }
// };

// export const getEndpointStatus = async (req, res) => {
//   try {
//     const { extension } = req.params;

//     // First check if the user exists
//     const user = await UserModel.findOne({
//       where: { extension },
//     });

//     if (!user) {
//       return res.status(404).json({
//         message: "Extension not found",
//         status: "not_found",
//       });
//     }

//     // Get status from Asterisk if AMI is enabled
//     if (isAmiEnabled()) {
//       const status = await getPjsipEndpointStatus(extension);
//       return res.json({
//         extension,
//         state: status,
//         connected: status === "registered",
//         timestamp: new Date(),
//       });
//     }

//     // Return development mode status
//     return res.json({
//       extension,
//       state: "registered", // Default development status
//       connected: true,
//       timestamp: new Date(),
//     });
//   } catch (error) {
//     console.error("Error getting endpoint status:", error);
//     res.status(500).json({
//       message: "Failed to get endpoint status",
//       error: error.message,
//     });
//   }
// };
