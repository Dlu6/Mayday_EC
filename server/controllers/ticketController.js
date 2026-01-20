// server/controllers/ticketController.js
import { TicketForm, TicketFormAgent, TicketSubmission } from "../models/ticketFormModel.js";
import UserModel from "../models/UsersModel.js";
import { socketService } from "../services/socketService.js";
import googleFormsService from "../services/googleFormsService.js";
import sequelizePkg from "sequelize";
const { Op } = sequelizePkg;

/**
 * Get all ticket forms
 * Admin: gets all forms
 * Agent: gets only assigned active forms
 */
export const getTicketForms = async (req, res) => {
    try {
        const { role, id: userId } = req.user || {};
        const { includeInactive } = req.query;

        let forms;

        if (role === "admin" || role === "superadmin") {
            // Admin sees all forms
            const whereClause = includeInactive === "true" ? {} : { isActive: true };
            forms = await TicketForm.findAll({
                where: whereClause,
                include: [
                    {
                        model: TicketFormAgent,
                        as: "assignedAgents",
                        attributes: ["agentId"],
                    },
                ],
                order: [["sortOrder", "ASC"], ["name", "ASC"]],
            });

            // Add agent count to each form
            forms = forms.map((form) => ({
                ...form.toJSON(),
                agentCount: form.assignedAgents?.length || 0,
            }));
        } else {
            // Agent sees only assigned active forms
            const assignments = await TicketFormAgent.findAll({
                where: { agentId: userId },
                include: [
                    {
                        model: TicketForm,
                        as: "form",
                        where: { isActive: true },
                    },
                ],
            });

            forms = assignments.map((a) => a.form);
        }

        res.json({
            success: true,
            forms,
        });
    } catch (error) {
        console.error("Error fetching ticket forms:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch ticket forms",
            error: error.message,
        });
    }
};

/**
 * Get forms assigned to a specific agent
 */
export const getAgentForms = async (req, res) => {
    try {
        const { agentId } = req.params;

        const assignments = await TicketFormAgent.findAll({
            where: { agentId: parseInt(agentId) },
            include: [
                {
                    model: TicketForm,
                    as: "form",
                    where: { isActive: true },
                },
            ],
        });

        const forms = assignments.map((a) => a.form).filter(Boolean);

        res.json({
            success: true,
            forms,
        });
    } catch (error) {
        console.error("Error fetching agent forms:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch agent forms",
            error: error.message,
        });
    }
};

/**
 * Get a single ticket form by ID
 */
export const getTicketForm = async (req, res) => {
    try {
        const { id } = req.params;

        const form = await TicketForm.findByPk(id, {
            include: [
                {
                    model: TicketFormAgent,
                    as: "assignedAgents",
                    attributes: ["agentId", "assignedAt"],
                },
            ],
        });

        if (!form) {
            return res.status(404).json({
                success: false,
                message: "Form not found",
            });
        }

        res.json({
            success: true,
            form,
        });
    } catch (error) {
        console.error("Error fetching ticket form:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch ticket form",
            error: error.message,
        });
    }
};

/**
 * Create a new ticket form
 */
export const createTicketForm = async (req, res) => {
    try {
        const { name, description, schema, isActive, googleSheetId, sortOrder } = req.body;
        const createdBy = req.user?.id;

        if (!name || !schema) {
            return res.status(400).json({
                success: false,
                message: "Name and schema are required",
            });
        }

        const form = await TicketForm.create({
            name,
            description,
            schema,
            isActive: isActive !== false,
            googleSheetId,
            sortOrder: sortOrder || 0,
            createdBy,
            version: 1,
        });

        // Emit WebSocket event
        const io = socketService.getIO();
        if (io) {
            io.emit("ticket:form_updated", { formId: form.id, action: "created" });
        }

        res.status(201).json({
            success: true,
            message: "Ticket form created successfully",
            form,
        });
    } catch (error) {
        console.error("Error creating ticket form:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create ticket form",
            error: error.message,
        });
    }
};

/**
 * Update a ticket form
 */
export const updateTicketForm = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, schema, isActive, googleSheetId, sortOrder } = req.body;

        const form = await TicketForm.findByPk(id);

        if (!form) {
            return res.status(404).json({
                success: false,
                message: "Form not found",
            });
        }

        // Increment version if schema changed
        const schemaChanged = JSON.stringify(form.schema) !== JSON.stringify(schema);
        const newVersion = schemaChanged ? form.version + 1 : form.version;

        await form.update({
            name: name || form.name,
            description: description !== undefined ? description : form.description,
            schema: schema || form.schema,
            isActive: isActive !== undefined ? isActive : form.isActive,
            googleSheetId: googleSheetId !== undefined ? googleSheetId : form.googleSheetId,
            sortOrder: sortOrder !== undefined ? sortOrder : form.sortOrder,
            version: newVersion,
        });

        // Emit WebSocket event
        const io = socketService.getIO();
        if (io) {
            io.emit("ticket:form_updated", { formId: form.id, action: "updated" });
        }

        res.json({
            success: true,
            message: "Ticket form updated successfully",
            form,
        });
    } catch (error) {
        console.error("Error updating ticket form:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update ticket form",
            error: error.message,
        });
    }
};

/**
 * Delete a ticket form
 */
export const deleteTicketForm = async (req, res) => {
    try {
        const { id } = req.params;

        const form = await TicketForm.findByPk(id);

        if (!form) {
            return res.status(404).json({
                success: false,
                message: "Form not found",
            });
        }

        // Check if form has submissions
        const submissionCount = await TicketSubmission.count({ where: { formId: id } });

        if (submissionCount > 0) {
            // Soft delete - just deactivate
            await form.update({ isActive: false });

            return res.json({
                success: true,
                message: `Form deactivated (has ${submissionCount} submissions)`,
                form,
            });
        }

        // Hard delete if no submissions
        await TicketFormAgent.destroy({ where: { formId: id } });
        await form.destroy();

        // Emit WebSocket event
        const io = socketService.getIO();
        if (io) {
            io.emit("ticket:form_updated", { formId: id, action: "deleted" });
        }

        res.json({
            success: true,
            message: "Ticket form deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting ticket form:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete ticket form",
            error: error.message,
        });
    }
};

/**
 * Toggle form active/inactive status
 */
export const toggleTicketFormStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const form = await TicketForm.findByPk(id);

        if (!form) {
            return res.status(404).json({
                success: false,
                message: "Form not found",
            });
        }

        await form.update({ isActive: !form.isActive });

        // Emit WebSocket event
        const io = socketService.getIO();
        if (io) {
            io.emit("ticket:form_updated", { formId: form.id, action: "toggled", isActive: form.isActive });
        }

        res.json({
            success: true,
            message: `Form ${form.isActive ? "activated" : "deactivated"} successfully`,
            form,
        });
    } catch (error) {
        console.error("Error toggling form status:", error);
        res.status(500).json({
            success: false,
            message: "Failed to toggle form status",
            error: error.message,
        });
    }
};

/**
 * Get agents assigned to a form
 */
export const getFormAgents = async (req, res) => {
    try {
        const { id } = req.params;

        const assignments = await TicketFormAgent.findAll({
            where: { formId: id },
            attributes: ["agentId", "assignedAt", "assignedBy"],
        });

        // Get agent details
        const agentIds = assignments.map((a) => a.agentId);
        const agents = await UserModel.findAll({
            where: { id: agentIds },
            attributes: ["id", "username", "name", "extension", "role"],
        });

        // Get all available agents for assignment
        const allAgents = await UserModel.findAll({
            where: { role: ["agent", "admin", "superadmin"] },
            attributes: ["id", "username", "name", "extension", "role"],
        });

        const assignedAgentIds = agentIds.map(String);
        const availableAgents = allAgents.filter((a) => !assignedAgentIds.includes(String(a.id)));

        res.json({
            success: true,
            assignedAgents: agents,
            availableAgents,
            assignments,
        });
    } catch (error) {
        console.error("Error fetching form agents:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch form agents",
            error: error.message,
        });
    }
};

/**
 * Assign agents to a form
 */
export const assignAgentsToForm = async (req, res) => {
    try {
        const { id } = req.params;
        const { agentIds } = req.body;
        const assignedBy = req.user?.id;

        if (!agentIds || !Array.isArray(agentIds)) {
            return res.status(400).json({
                success: false,
                message: "agentIds array is required",
            });
        }

        const form = await TicketForm.findByPk(id);
        if (!form) {
            return res.status(404).json({
                success: false,
                message: "Form not found",
            });
        }

        // Create assignments (use findOrCreate to avoid duplicates)
        const results = await Promise.all(
            agentIds.map(async (agentId) => {
                const [assignment, created] = await TicketFormAgent.findOrCreate({
                    where: { formId: id, agentId },
                    defaults: { formId: id, agentId, assignedBy },
                });
                return { agentId, created };
            })
        );

        const added = results.filter((r) => r.created).length;

        // Emit WebSocket events to affected agents
        const io = socketService.getIO();
        if (io) {
            agentIds.forEach((agentId) => {
                io.to(`agent:${agentId}`).emit("ticket:assignment_changed", {
                    formId: parseInt(id),
                    assigned: true,
                });
            });
        }

        res.json({
            success: true,
            message: `${added} agents assigned to form`,
            results,
        });
    } catch (error) {
        console.error("Error assigning agents:", error);
        res.status(500).json({
            success: false,
            message: "Failed to assign agents",
            error: error.message,
        });
    }
};

/**
 * Remove agents from a form
 */
export const removeAgentsFromForm = async (req, res) => {
    try {
        const { id } = req.params;
        const { agentIds } = req.body;

        if (!agentIds || !Array.isArray(agentIds)) {
            return res.status(400).json({
                success: false,
                message: "agentIds array is required",
            });
        }

        const deleted = await TicketFormAgent.destroy({
            where: {
                formId: id,
                agentId: agentIds,
            },
        });

        // Emit WebSocket events to affected agents
        const io = socketService.getIO();
        if (io) {
            agentIds.forEach((agentId) => {
                io.to(`agent:${agentId}`).emit("ticket:assignment_changed", {
                    formId: parseInt(id),
                    assigned: false,
                });
            });
        }

        res.json({
            success: true,
            message: `${deleted} agents removed from form`,
        });
    } catch (error) {
        console.error("Error removing agents:", error);
        res.status(500).json({
            success: false,
            message: "Failed to remove agents",
            error: error.message,
        });
    }
};

/**
 * Submit a ticket (from agent)
 */
export const submitTicket = async (req, res) => {
    try {
        const {
            formId,
            responses,
            callId,
            callerNumber,
            callTimestamp,
            status,
        } = req.body;
        const agentId = req.user?.id;
        const agentExtension = req.user?.extension;

        if (!formId || !responses) {
            return res.status(400).json({
                success: false,
                message: "formId and responses are required",
            });
        }

        // Get form to capture version
        const form = await TicketForm.findByPk(formId);
        if (!form) {
            return res.status(404).json({
                success: false,
                message: "Form not found",
            });
        }

        const submission = await TicketSubmission.create({
            formId,
            formVersion: form.version,
            agentId,
            agentExtension,
            callId,
            callerNumber,
            callTimestamp: callTimestamp ? new Date(callTimestamp) : null,
            responses,
            status: status || "submitted",
        });

        // Sync to Google Form if enabled
        if (form.useGoogleForm && form.googleFormId && form.googleFormFields) {
            try {
                // Build call data for auto-mapping
                const callData = {
                    callerNumber: callerNumber || "",
                    agentExtension: agentExtension || "",
                    callId: callId || "",
                    timestamp: callTimestamp || new Date().toISOString(),
                };

                // Build entries from responses and form fields
                const entries = googleFormsService.buildSubmissionEntries(
                    responses,
                    form.googleFormFields,
                    callData
                );

                // Submit to Google Form
                const syncResult = await googleFormsService.submitToGoogleForm(
                    form.googleFormId,
                    true, // Published form
                    entries
                );

                if (syncResult.success) {
                    await submission.update({
                        syncedToGoogleForm: true,
                        googleFormSyncError: null,
                    });
                    console.log(`[Tickets] Synced submission ${submission.id} to Google Form`);
                } else {
                    await submission.update({
                        googleFormSyncError: syncResult.error,
                    });
                    console.warn(`[Tickets] Failed to sync to Google Form: ${syncResult.error}`);
                }
            } catch (syncError) {
                console.error("[Tickets] Google Form sync error:", syncError);
                await submission.update({
                    googleFormSyncError: syncError.message,
                });
            }
        }

        // TODO: If form has googleSheetId, sync to Google Sheets
        // This will be implemented in Phase 3

        // Emit WebSocket event to admins
        const io = socketService.getIO();
        if (io) {
            io.emit("ticket:new_submission", {
                submissionId: submission.id,
                formId,
                formName: form.name,
                agentId,
                status: submission.status,
            });
        }

        res.status(201).json({
            success: true,
            message: "Ticket submitted successfully",
            submission,
        });
    } catch (error) {
        console.error("Error submitting ticket:", error);
        res.status(500).json({
            success: false,
            message: "Failed to submit ticket",
            error: error.message,
        });
    }
};

/**
 * Get ticket submissions with filters
 */
export const getSubmissions = async (req, res) => {
    try {
        const {
            formId,
            agentId,
            status,
            callerNumber,
            startDate,
            endDate,
            limit = 50,
            offset = 0,
        } = req.query;

        const whereClause = {};

        if (formId) whereClause.formId = formId;
        if (agentId) whereClause.agentId = agentId;
        if (status) whereClause.status = status;
        if (callerNumber) whereClause.callerNumber = { [Op.like]: `%${callerNumber}%` };

        if (startDate || endDate) {
            whereClause.createdAt = {};
            if (startDate) whereClause.createdAt[Op.gte] = new Date(startDate);
            if (endDate) whereClause.createdAt[Op.lte] = new Date(endDate);
        }

        const { count, rows: submissions } = await TicketSubmission.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: TicketForm,
                    as: "form",
                    attributes: ["id", "name"],
                },
            ],
            order: [["createdAt", "DESC"]],
            limit: parseInt(limit),
            offset: parseInt(offset),
        });

        res.json({
            success: true,
            submissions,
            total: count,
            limit: parseInt(limit),
            offset: parseInt(offset),
        });
    } catch (error) {
        console.error("Error fetching submissions:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch submissions",
            error: error.message,
        });
    }
};

/**
 * Get a single submission
 */
export const getSubmission = async (req, res) => {
    try {
        const { id } = req.params;

        const submission = await TicketSubmission.findByPk(id, {
            include: [
                {
                    model: TicketForm,
                    as: "form",
                    attributes: ["id", "name", "schema"],
                },
            ],
        });

        if (!submission) {
            return res.status(404).json({
                success: false,
                message: "Submission not found",
            });
        }

        res.json({
            success: true,
            submission,
        });
    } catch (error) {
        console.error("Error fetching submission:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch submission",
            error: error.message,
        });
    }
};

/**
 * Update submission status (for supervisor review workflow)
 */
export const updateSubmissionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;
        const reviewedBy = req.user?.id;

        const submission = await TicketSubmission.findByPk(id);

        if (!submission) {
            return res.status(404).json({
                success: false,
                message: "Submission not found",
            });
        }

        const updateData = { status };

        if (status === "reviewed" || status === "closed") {
            updateData.reviewedBy = reviewedBy;
            updateData.reviewedAt = new Date();
        }

        if (notes !== undefined) {
            updateData.notes = notes;
        }

        await submission.update(updateData);

        res.json({
            success: true,
            message: "Submission status updated",
            submission,
        });
    } catch (error) {
        console.error("Error updating submission status:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update submission status",
            error: error.message,
        });
    }
};

/**
 * Get caller history (previous tickets from same phone number)
 */
export const getCallerHistory = async (req, res) => {
    try {
        const { phoneNumber } = req.params;
        const { limit = 10 } = req.query;

        if (!phoneNumber) {
            return res.status(400).json({
                success: false,
                message: "Phone number is required",
            });
        }

        // Normalize phone number (remove common prefixes for matching)
        const normalizedNumber = phoneNumber.replace(/^(\+|00)/, "");

        const submissions = await TicketSubmission.findAll({
            where: {
                callerNumber: {
                    [Op.or]: [
                        phoneNumber,
                        normalizedNumber,
                        `+${normalizedNumber}`,
                        `00${normalizedNumber}`,
                    ],
                },
            },
            include: [
                {
                    model: TicketForm,
                    as: "form",
                    attributes: ["id", "name"],
                },
            ],
            order: [["createdAt", "DESC"]],
            limit: parseInt(limit),
        });

        res.json({
            success: true,
            callerNumber: phoneNumber,
            ticketCount: submissions.length,
            history: submissions,
        });
    } catch (error) {
        console.error("Error fetching caller history:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch caller history",
            error: error.message,
        });
    }
};

// =====================================
// GOOGLE FORMS INTEGRATION
// =====================================

/**
 * Parse a Google Form URL and fetch its structure
 * Returns field definitions with entry IDs for mapping
 */
export const parseGoogleForm = async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({
                success: false,
                message: "Google Form URL is required",
            });
        }

        // Parse URL to extract form ID
        const parsed = googleFormsService.parseGoogleFormUrl(url);
        if (!parsed) {
            return res.status(400).json({
                success: false,
                message: "Invalid Google Form URL. Please provide a valid URL like: https://docs.google.com/forms/d/e/FORM_ID/viewform",
            });
        }

        // Fetch form structure
        const result = await googleFormsService.fetchFormStructure(parsed.formId, parsed.isPublished);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error || "Failed to fetch form structure",
            });
        }

        res.json({
            success: true,
            formId: parsed.formId,
            isPublished: parsed.isPublished,
            title: result.title,
            fields: result.fields,
        });
    } catch (error) {
        console.error("Error parsing Google Form:", error);
        res.status(500).json({
            success: false,
            message: "Failed to parse Google Form",
            error: error.message,
        });
    }
};

/**
 * Sync a submission to Google Form (retry mechanism)
 */
export const syncSubmissionToGoogleForm = async (req, res) => {
    try {
        const { id } = req.params;

        const submission = await TicketSubmission.findByPk(id, {
            include: [
                {
                    model: TicketForm,
                    as: "form",
                },
            ],
        });

        if (!submission) {
            return res.status(404).json({
                success: false,
                message: "Submission not found",
            });
        }

        const form = submission.form;
        if (!form.useGoogleForm || !form.googleFormId) {
            return res.status(400).json({
                success: false,
                message: "This form is not linked to a Google Form",
            });
        }

        // Build entries for Google Form submission
        const callData = {
            callerNumber: submission.callerNumber,
            agentExtension: submission.agentExtension,
            callId: submission.callId,
            timestamp: submission.callTimestamp?.toISOString() || new Date().toISOString(),
        };

        const entries = googleFormsService.buildSubmissionEntries(
            submission.responses,
            form.googleFormFields || [],
            callData
        );

        // Submit to Google Form
        const result = await googleFormsService.submitToGoogleForm(
            form.googleFormId,
            true, // Published form
            entries
        );

        if (result.success) {
            await submission.update({
                syncedToGoogleForm: true,
                googleFormSyncError: null,
            });

            res.json({
                success: true,
                message: "Submission synced to Google Form",
            });
        } else {
            await submission.update({
                googleFormSyncError: result.error,
            });

            res.status(500).json({
                success: false,
                message: "Failed to sync to Google Form",
                error: result.error,
            });
        }
    } catch (error) {
        console.error("Error syncing to Google Form:", error);
        res.status(500).json({
            success: false,
            message: "Failed to sync submission",
            error: error.message,
        });
    }
};
