// server/routes/ticketRoutes.js
import express from "express";
import {
    getTicketForms,
    getAgentForms,
    getTicketForm,
    createTicketForm,
    updateTicketForm,
    deleteTicketForm,
    toggleTicketFormStatus,
    getFormAgents,
    assignAgentsToForm,
    removeAgentsFromForm,
    submitTicket,
    getSubmissions,
    getSubmission,
    updateSubmission,
    deleteSubmission,
    updateSubmissionStatus,
    getCallerHistory,
    parseGoogleForm,
    syncSubmissionToGoogleForm,
} from "../controllers/ticketController.js";
import { sipAuthMiddleware } from "../middleware/sipAuth.js";

const router = express.Router();

// ============================================
// FORM MANAGEMENT ROUTES (Admin)
// ============================================

/**
 * @swagger
 * /api/tickets/forms:
 *   get:
 *     summary: Get all ticket forms
 *     tags: [Tickets]
 *     parameters:
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *         description: Include inactive forms (admin only)
 *     responses:
 *       200:
 *         description: List of ticket forms
 */
router.get("/forms", sipAuthMiddleware, getTicketForms);

/**
 * @swagger
 * /api/tickets/forms/{id}:
 *   get:
 *     summary: Get a single ticket form
 *     tags: [Tickets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Ticket form details
 */
router.get("/forms/:id", sipAuthMiddleware, getTicketForm);

/**
 * @swagger
 * /api/tickets/forms:
 *   post:
 *     summary: Create a new ticket form (admin only)
 *     tags: [Tickets]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - schema
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               schema:
 *                 type: object
 *               isActive:
 *                 type: boolean
 *               googleSheetId:
 *                 type: string
 *               sortOrder:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Form created successfully
 */
router.post("/forms", sipAuthMiddleware, createTicketForm);

/**
 * @swagger
 * /api/tickets/forms/{id}:
 *   put:
 *     summary: Update a ticket form (admin only)
 *     tags: [Tickets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Form updated successfully
 */
router.put("/forms/:id", sipAuthMiddleware, updateTicketForm);

/**
 * @swagger
 * /api/tickets/forms/{id}:
 *   delete:
 *     summary: Delete a ticket form (admin only)
 *     tags: [Tickets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Form deleted/deactivated successfully
 */
router.delete("/forms/:id", sipAuthMiddleware, deleteTicketForm);

/**
 * @swagger
 * /api/tickets/forms/{id}/toggle:
 *   patch:
 *     summary: Toggle form active/inactive status
 *     tags: [Tickets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Form status toggled
 */
router.patch("/forms/:id/toggle", sipAuthMiddleware, toggleTicketFormStatus);

// ============================================
// GOOGLE FORMS INTEGRATION ROUTES
// ============================================

/**
 * @swagger
 * /api/tickets/parse-google-form:
 *   post:
 *     summary: Parse a Google Form URL and fetch its structure
 *     tags: [Tickets]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 description: Full Google Form URL
 *     responses:
 *       200:
 *         description: Form structure with field IDs
 */
router.post("/parse-google-form", sipAuthMiddleware, parseGoogleForm);

/**
 * @swagger
 * /api/tickets/submissions/{id}/sync-google:
 *   post:
 *     summary: Retry syncing a submission to Google Form
 *     tags: [Tickets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Submission synced to Google Form
 */
router.post("/submissions/:id/sync-google", sipAuthMiddleware, syncSubmissionToGoogleForm);

// ============================================
// AGENT ASSIGNMENT ROUTES
// ============================================

/**
 * @swagger
 * /api/tickets/forms/{id}/agents:
 *   get:
 *     summary: Get agents assigned to a form
 *     tags: [Tickets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of assigned and available agents
 */
router.get("/forms/:id/agents", sipAuthMiddleware, getFormAgents);

/**
 * @swagger
 * /api/tickets/forms/{id}/agents:
 *   post:
 *     summary: Assign agents to a form
 *     tags: [Tickets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - agentIds
 *             properties:
 *               agentIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Agents assigned successfully
 */
router.post("/forms/:id/agents", sipAuthMiddleware, assignAgentsToForm);

/**
 * @swagger
 * /api/tickets/forms/{id}/agents:
 *   delete:
 *     summary: Remove agents from a form
 *     tags: [Tickets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - agentIds
 *             properties:
 *               agentIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Agents removed successfully
 */
router.delete("/forms/:id/agents", sipAuthMiddleware, removeAgentsFromForm);

/**
 * @swagger
 * /api/tickets/forms/agent/{agentId}:
 *   get:
 *     summary: Get forms assigned to a specific agent
 *     tags: [Tickets]
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of forms for the agent
 */
router.get("/forms/agent/:agentId", sipAuthMiddleware, getAgentForms);

// ============================================
// TICKET SUBMISSION ROUTES
// ============================================

/**
 * @swagger
 * /api/tickets/submissions:
 *   post:
 *     summary: Submit a ticket
 *     tags: [Tickets]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - formId
 *               - responses
 *             properties:
 *               formId:
 *                 type: integer
 *               responses:
 *                 type: object
 *               callId:
 *                 type: string
 *               callerNumber:
 *                 type: string
 *               callTimestamp:
 *                 type: string
 *                 format: date-time
 *               status:
 *                 type: string
 *                 enum: [draft, submitted]
 *     responses:
 *       201:
 *         description: Ticket submitted successfully
 */
router.post("/submissions", sipAuthMiddleware, submitTicket);

/**
 * @swagger
 * /api/tickets/submissions:
 *   get:
 *     summary: Get ticket submissions with filters
 *     tags: [Tickets]
 *     parameters:
 *       - in: query
 *         name: formId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: agentId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, submitted, reviewed, closed]
 *       - in: query
 *         name: callerNumber
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of submissions
 */
router.get("/submissions", sipAuthMiddleware, getSubmissions);

/**
 * @swagger
 * /api/tickets/submissions/{id}:
 *   get:
 *     summary: Get a single submission
 *     tags: [Tickets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Submission details
 */
router.get("/submissions/:id", sipAuthMiddleware, getSubmission);

/**
 * @swagger
 * /api/tickets/submissions/{id}/status:
 *   patch:
 *     summary: Update submission status (supervisor review)
 *     tags: [Tickets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [draft, submitted, reviewed, closed]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated successfully
 */
router.patch("/submissions/:id/status", sipAuthMiddleware, updateSubmissionStatus);

/**
 * @swagger
 * /api/tickets/submissions/{id}:
 *   put:
 *     summary: Update a submission (agent can edit own ticket)
 *     tags: [Tickets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               formValues:
 *                 type: object
 *               callerNumber:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Submission updated successfully
 *       403:
 *         description: Not authorized (not your submission)
 */
router.put("/submissions/:id", sipAuthMiddleware, updateSubmission);

/**
 * @swagger
 * /api/tickets/submissions/{id}:
 *   delete:
 *     summary: Delete a submission (agent can delete own draft tickets)
 *     tags: [Tickets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Submission deleted successfully
 *       403:
 *         description: Not authorized (not your submission)
 *       400:
 *         description: Only draft submissions can be deleted
 */
router.delete("/submissions/:id", sipAuthMiddleware, deleteSubmission);

// ============================================
// CALLER HISTORY ROUTE
// ============================================

/**
 * @swagger
 * /api/tickets/caller/{phoneNumber}:
 *   get:
 *     summary: Get ticket history for a caller
 *     tags: [Tickets]
 *     parameters:
 *       - in: path
 *         name: phoneNumber
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Caller's ticket history
 */
router.get("/caller/:phoneNumber", sipAuthMiddleware, getCallerHistory);

export default router;

