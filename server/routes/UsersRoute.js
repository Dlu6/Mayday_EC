import express from "express";
import {
  registerAgent,
  createPJSIPUser,
  deleteAgent,
  getAgentDetailsByExtension,
  getAgentDetailsByExtensionNumber,
  getAllUsers,
  getProfile,
  superUserLogin,
  updateAgentDetails,
  agentOnline,
  agentLogout,
  updateAgentPresence,
  getAgentDialplan,
  regenerateAgentDialplan,
} from "../controllers/usersController.js";
import { sipAuthMiddleware } from "../middleware/sipAuth.js";

const router = express.Router();
/**
 * @swagger
 * components:
 *   schemas:
 *     SipUser:
 *       type: object
 *       required:
 *         - username
 *         - password
 *         - email
 *         - fullName
 *       properties:
 *         username:
 *           type: string
 *           description: Unique username for the SIP user
 *         password:
 *           type: string
 *           description: Password for authentication
 *         email:
 *           type: string
 *           format: email
 *           description: Email address of the user (used for login)
 *         fullName:
 *           type: string
 *           description: Full name of the user
 *     AgentRegistration:
 *       type: object
 *       required:
 *         - username
 *         - password
 *         - isSoftphone
 *       properties:
 *         username:
 *           type: string
 *           description: Email address used during account creation
 *           example: test@example.com
 *         password:
 *           type: string
 *           description: Account password
 *           example: testpass123
 *         isSoftphone:
 *           type: boolean
 *           description: Must be true for PJSIP registration
 *           default: true
 *           example: true
 *   responses:
 *     AgentRegistered:
 *       description: Agent registered successfully with PJSIP
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *                 example: true
 *               message:
 *                 type: string
 *                 example: Login successful
 *               data:
 *                 type: object
 *                 properties:
 *                   token:
 *                     type: string
 *                     description: JWT authentication token
 *                     example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                   user:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                         example: 123e4567-e89b-12d3-a456-426614174000
 *                       username:
 *                         type: string
 *                         example: test@example.com
 *                       email:
 *                         type: string
 *                         example: test@example.com
 *                       role:
 *                         type: string
 *                         example: agent
 *                       extension:
 *                         type: string
 *                         example: 1001
 *                       fullName:
 *                         type: string
 *                         example: Test Agent
 *                       settings:
 *                         type: object
 *                         properties:
 *                           autoAnswer:
 *                             type: boolean
 *                             example: false
 *                           enableRecording:
 *                             type: boolean
 *                             example: false
 *                           ringInUse:
 *                             type: boolean
 *                             example: false
 *                           enableSettings:
 *                             type: boolean
 *                             example: true
 *                   pjsip:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                         example: pjsip
 *                       extension:
 *                         type: string
 *                         description: SIP extension number
 *                         example: 1001
 *                       password:
 *                         type: string
 *                         description: PJSIP authentication password
 *                         example: testpass123
 *                       webSocket:
 *                         type: string
 *                         description: WebSocket URL for SIP connection
 *                         example: wss://asterisk.example.com:8089/ws
 *                       server:
 *                         type: string
 *                         description: Asterisk server hostname
 *                         example: asterisk.example.com
 *                       ice_servers:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             urls:
 *                               type: string
 *                               example: stun:stun.l.google.com:19302
 *                       register_expires:
 *                         type: integer
 *                         description: Registration expiry time in seconds
 *                         example: 120
 *                       user_agent:
 *                         type: string
 *                         description: SIP user agent string
 *                         example: WebPhone 1001
 *                       dtmf_mode:
 *                         type: string
 *                         example: rfc4733
 */

/**
 * @swagger
 * /api/users/agent-login:
 *   post:
 *     summary: Register a SIP agent with Asterisk using PJSIP
 *     description: |
 *       Registers an agent using their email address and password.
 *       The email must match the one used during account creation.
 *       Successful registration will return PJSIP credentials and WebSocket connection details.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AgentRegistration'
 *           example:
 *             username: test@example.com
 *             password: testpass123
 *             isSoftphone: true
 *     responses:
 *       200:
 *         $ref: '#/components/responses/AgentRegistered'
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Access denied (requires agent role)
 *       404:
 *         description: Agent not found
 *       500:
 *         description: Server error
 */
router.post("/login", superUserLogin);

/**
 * @swagger
 * /api/users/agent-login:
 *   post:
 *     summary: Register and login a SIP user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SipUser'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/LoginSuccess'
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Access denied (invalid role)
 *       500:
 *         description: Server error
 */
router.post("/agent-login", sipAuthMiddleware, registerAgent);

/**
 * @swagger
 * /api/users/agent-online:
 *   post:
 *     summary: Notify that an agent is online
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               extension:
 *                 type: string
 *                 description: Agent extension number
 *               contactUri:
 *                 type: string
 *                 description: SIP contact URI
 *     responses:
 *       200:
 *         description: Agent online status updated successfully
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post("/agent-online", sipAuthMiddleware, agentOnline);

/**
 * @swagger
 * /api/users/logout:
 *   post:
 *     summary: Log out a SIP user
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post("/agent-logout", sipAuthMiddleware, agentLogout);

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Not authenticated
 */
router.get("/profile", getProfile);

/**
 * @swagger
 * /api/users/createAgent:
 *   post:
 *     summary: Create a new SIP user account
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SipUser'
 *     responses:
 *       201:
 *         $ref: '#/components/responses/UserCreated'
 *       400:
 *         description: Invalid input or missing required fields
 *       409:
 *         description: Username or email already exists
 *       500:
 *         description: Server error
 */
router.post("/createAgent", createPJSIPUser);

/**
 * @swagger
 * /api/users/agents/extension/{extension}:
 *   get:
 *     summary: Get agent details by extension
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: extension
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Agent details retrieved successfully
 *       404:
 *         description: Agent not found
 */
router.get("/agents/:id", getAgentDetailsByExtension);
router.get("/agents/extension/:extension", getAgentDetailsByExtensionNumber);

/**
 * @swagger
 * /api/users/agents:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of all users retrieved successfully
 */
router.get("/agents", getAllUsers);

/**
 * @swagger
 * /api/users/agents/{id}:
 *   put:
 *     summary: Update agent details
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Agent details updated successfully
 *       404:
 *         description: Agent not found
 */
router.put("/agents/:id", updateAgentDetails);

/**
 * @swagger
 * /api/users/agents/{id}:
 *   delete:
 *     summary: Delete an agent
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Agent deleted successfully
 *       404:
 *         description: Agent not found
 */
router.delete("/agents/:id", deleteAgent);

/**
 * @swagger
 * /api/users/agent-presence:
 *   post:
 *     summary: Update agent presence status
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - extension
 *               - presence
 *             properties:
 *               extension:
 *                 type: string
 *                 description: Agent extension number
 *               presence:
 *                 type: string
 *                 description: Presence status (BREAK, READY, etc.)
 *     responses:
 *       200:
 *         description: Agent presence updated successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Agent not found
 */
router.post("/agent-presence", updateAgentPresence);

/**
 * @swagger
 * /api/users/agents/{extension}/dialplan:
 *   get:
 *     summary: Get agent dialplan entries
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: extension
 *         required: true
 *         schema:
 *           type: string
 *         description: Agent extension number
 *     responses:
 *       200:
 *         description: Dialplan entries retrieved successfully
 *       400:
 *         description: Extension is required
 */
router.get("/agents/:extension/dialplan", getAgentDialplan);

/**
 * @swagger
 * /api/users/agents/{extension}/dialplan/regenerate:
 *   post:
 *     summary: Regenerate agent dialplan with latest configuration
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: extension
 *         required: true
 *         schema:
 *           type: string
 *         description: Agent extension number
 *     responses:
 *       200:
 *         description: Dialplan regenerated successfully
 *       404:
 *         description: Agent not found
 */
router.post("/agents/:extension/dialplan/regenerate", regenerateAgentDialplan);

export default router;
