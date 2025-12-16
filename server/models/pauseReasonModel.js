// server/models/pauseReasonModel.js
import sequelizePkg from "sequelize";
const { DataTypes } = sequelizePkg;
import sequelize from "../config/sequelize.js";

/**
 * PauseReason model - Stores configurable pause reasons for agents
 * These reasons are displayed when an agent wants to pause/go on break
 */
const PauseReason = sequelize.define(
  "PauseReason",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: "Unique code for the pause reason (e.g., LUNCH, BREAK, MEETING)",
    },
    label: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: "Display label for the pause reason",
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "Optional description of the pause reason",
    },
    color: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: "#ff9800",
      comment: "Color code for UI display",
    },
    icon: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: "pause",
      comment: "Icon name for UI display",
    },
    maxDurationMinutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Maximum allowed duration for this pause type in minutes",
    },
    requiresApproval: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Whether this pause type requires supervisor approval",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: "Whether this pause reason is currently active/available",
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "Sort order for display",
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
    tableName: "pause_reasons",
    timestamps: true,
  }
);

/**
 * AgentPauseLog model - Tracks agent pause history
 */
const AgentPauseLog = sequelize.define(
  "AgentPauseLog",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    extension: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: "Agent extension number",
    },
    pauseReasonId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "pause_reasons",
        key: "id",
      },
      comment: "Reference to the pause reason",
    },
    pauseReasonCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: "Pause reason code at time of pause",
    },
    pauseReasonLabel: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: "Pause reason label at time of pause",
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: "When the pause started",
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "When the pause ended (null if still paused)",
    },
    durationSeconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Total duration of the pause in seconds",
    },
    queueName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: "Queue name if applicable",
    },
    autoUnpaused: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      comment: "Whether the agent was auto-unpaused due to max duration",
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
    tableName: "agent_pause_logs",
    timestamps: true,
    indexes: [
      { fields: ["extension"] },
      { fields: ["startTime"] },
      { fields: ["pauseReasonCode"] },
    ],
  }
);

// Define associations
PauseReason.hasMany(AgentPauseLog, {
  foreignKey: "pauseReasonId",
  as: "pauseLogs",
});
AgentPauseLog.belongsTo(PauseReason, {
  foreignKey: "pauseReasonId",
  as: "pauseReason",
});

// Default pause reasons to seed
export const DEFAULT_PAUSE_REASONS = [
  {
    code: "BREAK",
    label: "Short Break",
    description: "Quick personal break",
    color: "#ff9800",
    icon: "coffee",
    maxDurationMinutes: 5,
    sortOrder: 1,
  },
  {
    code: "LUNCH",
    label: "Lunch Break",
    description: "Lunch time break",
    color: "#4caf50",
    icon: "restaurant",
    maxDurationMinutes: 60,
    sortOrder: 2,
  },
  {
    code: "MEETING",
    label: "In Meeting",
    description: "Attending a meeting",
    color: "#2196f3",
    icon: "groups",
    maxDurationMinutes: 120,
    sortOrder: 3,
  },
  {
    code: "TRAINING",
    label: "Training",
    description: "Training session",
    color: "#9c27b0",
    icon: "school",
    maxDurationMinutes: 180,
    sortOrder: 4,
  },
  {
    code: "PERSONAL",
    label: "Personal Time",
    description: "Personal matters",
    color: "#e91e63",
    icon: "person",
    maxDurationMinutes: 30,
    sortOrder: 5,
  },
  {
    code: "TECHNICAL",
    label: "Technical Issue",
    description: "Resolving technical problems",
    color: "#f44336",
    icon: "build",
    maxDurationMinutes: null,
    sortOrder: 6,
  },
  {
    code: "COACHING",
    label: "Coaching Session",
    description: "One-on-one coaching",
    color: "#00bcd4",
    icon: "support_agent",
    maxDurationMinutes: 60,
    sortOrder: 7,
  },
  {
    code: "OTHER",
    label: "Other",
    description: "Other reason",
    color: "#607d8b",
    icon: "more_horiz",
    maxDurationMinutes: null,
    sortOrder: 99,
  },
];

// Seed function to initialize default pause reasons
export async function seedPauseReasons() {
  try {
    for (const reason of DEFAULT_PAUSE_REASONS) {
      await PauseReason.findOrCreate({
        where: { code: reason.code },
        defaults: reason,
      });
    }
    console.log("✅ Pause reasons seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding pause reasons:", error);
  }
}

export { PauseReason, AgentPauseLog };
export default PauseReason;
