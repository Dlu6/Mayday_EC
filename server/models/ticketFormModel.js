// server/models/ticketFormModel.js
import sequelizePkg from "sequelize";
const { DataTypes } = sequelizePkg;
import sequelize from "../config/sequelize.js";

/**
 * TicketForm - Stores form/ticket definitions created by admins
 * Dynamic ticket forms that agents can fill during calls
 */
const TicketForm = sequelize.define(
    "TicketForm",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false,
            comment: "Form/ticket name displayed to agents",
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: "Description of when to use this form",
        },
        schema: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: { fields: [] },
            comment: "JSON schema defining form fields",
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: "Only active forms shown to agents",
        },
        version: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
            comment: "Schema version for tracking changes",
        },
        googleSheetId: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: "Optional Google Sheet ID for exporting submissions",
        },
        // Google Forms integration
        useGoogleForm: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: "Whether to sync submissions to a Google Form",
        },
        googleFormUrl: {
            type: DataTypes.STRING(500),
            allowNull: true,
            comment: "Full Google Form URL",
        },
        googleFormId: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: "Extracted Google Form ID",
        },
        googleFormFields: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: "Parsed Google Form field structure with entry IDs",
        },
        createdBy: {
            type: DataTypes.STRING(36),
            allowNull: true,
            comment: "Admin user ID (UUID) who created the form",
        },
        sortOrder: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: "Display order in dropdown",
        },
        createdAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        updatedAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        tableName: "ticket_forms",
        timestamps: true,
        indexes: [
            { fields: ["isActive"] },
            { fields: ["sortOrder"] },
        ],
    }
);

/**
 * TicketFormAgent - Junction table for form-agent assignments
 * Controls which agents can see which forms
 */
const TicketFormAgent = sequelize.define(
    "TicketFormAgent",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        formId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: "Reference to ticket_forms.id",
        },
        agentId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: "User ID from users table",
        },
        assignedAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        assignedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: "Admin who made assignment",
        },
    },
    {
        tableName: "ticket_form_agents",
        timestamps: false,
        indexes: [
            { fields: ["formId"] },
            { fields: ["agentId"] },
        ],
    }
);

/**
 * TicketSubmission - Stores submitted tickets from agents
 * Includes call linking and status workflow
 */
const TicketSubmission = sequelize.define(
    "TicketSubmission",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        formId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: "Reference to ticket_forms.id",
        },
        formVersion: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
            comment: "Form version at time of submission",
        },
        agentId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: "Agent who submitted the ticket",
        },
        agentExtension: {
            type: DataTypes.STRING(20),
            allowNull: true,
            comment: "Agent extension at time of submission",
        },
        // Call linking fields
        callId: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: "Asterisk call ID for recording lookup",
        },
        callerNumber: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: "Caller phone number",
        },
        callTimestamp: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: "When the call started",
        },
        // Ticket data
        responses: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: {},
            comment: "Field responses as JSON object",
        },
        // Ticket status workflow
        status: {
            type: DataTypes.ENUM("draft", "submitted", "reviewed", "closed"),
            defaultValue: "submitted",
            comment: "Ticket workflow status",
        },
        reviewedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: "Supervisor who reviewed",
        },
        reviewedAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: "Supervisor notes on the ticket",
        },
        // Google Sheets sync tracking
        syncedToSheets: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: "Whether submission was synced to Google Sheets",
        },
        sheetsSyncError: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: "Error message if sync failed",
        },
        // Google Forms sync tracking
        syncedToGoogleForm: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: "Whether submission was synced to Google Form",
        },
        googleFormSyncError: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: "Error message if Google Form sync failed",
        },
        createdAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        updatedAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        tableName: "ticket_submissions",
        timestamps: true,
        indexes: [
            { fields: ["formId"] },
            { fields: ["agentId"] },
            { fields: ["callerNumber"] },
            { fields: ["status"] },
            { fields: ["createdAt"] },
        ],
    }
);

// Define associations
TicketForm.hasMany(TicketFormAgent, {
    foreignKey: "formId",
    as: "assignedAgents",
    onDelete: "CASCADE",
});
TicketFormAgent.belongsTo(TicketForm, {
    foreignKey: "formId",
    as: "form"
});

TicketForm.hasMany(TicketSubmission, {
    foreignKey: "formId",
    as: "submissions",
    onDelete: "CASCADE",
});
TicketSubmission.belongsTo(TicketForm, {
    foreignKey: "formId",
    as: "form"
});

// Example schema structure for reference
export const EXAMPLE_FORM_SCHEMA = {
    fields: [
        {
            id: "field_1",
            type: "text",
            label: "Customer Name",
            required: true,
            placeholder: "Enter customer name",
        },
        {
            id: "field_2",
            type: "select",
            label: "Issue Category",
            required: true,
            options: ["Billing", "Technical Support", "General Inquiry", "Complaint"],
        },
        {
            id: "field_3",
            type: "textarea",
            label: "Issue Description",
            required: true,
            placeholder: "Describe the issue in detail...",
            rows: 4,
        },
        {
            id: "field_4",
            type: "checkbox",
            label: "Actions Taken",
            options: ["Verified customer identity", "Checked account status", "Escalated to supervisor"],
        },
        {
            id: "field_5",
            type: "radio",
            label: "Resolution Status",
            required: true,
            options: ["Resolved", "Pending", "Escalated"],
        },
        {
            id: "field_6",
            type: "scale",
            label: "Customer Satisfaction",
            min: 1,
            max: 5,
            step: 1,
        },
    ],
};

// Default ticket forms to seed (optional)
export const DEFAULT_TICKET_FORMS = [
    {
        name: "General Support Ticket",
        description: "Standard support ticket for general inquiries",
        schema: {
            fields: [
                { id: "customer_name", type: "text", label: "Customer Name", required: true },
                { id: "issue_type", type: "select", label: "Issue Type", required: true, options: ["Question", "Problem", "Request", "Feedback"] },
                { id: "description", type: "textarea", label: "Description", required: true, rows: 4 },
                { id: "priority", type: "radio", label: "Priority", required: true, options: ["Low", "Medium", "High"] },
            ],
        },
        isActive: true,
        sortOrder: 1,
    },
];

// Seed function to initialize default forms (optional, can be called from server.js)
export async function seedDefaultTicketForms() {
    try {
        for (const form of DEFAULT_TICKET_FORMS) {
            const [createdForm, created] = await TicketForm.findOrCreate({
                where: { name: form.name },
                defaults: form,
            });
            if (created) {
                console.log(`✅ Created default ticket form: ${form.name}`);
            }
        }
    } catch (error) {
        console.error("❌ Error seeding ticket forms:", error);
    }
}

export { TicketForm, TicketFormAgent, TicketSubmission };
export default TicketForm;
