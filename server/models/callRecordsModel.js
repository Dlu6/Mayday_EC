// //models/CallRecords.js
// import sequelizePkg from "sequelize";
// const { DataTypes } = sequelizePkg;
// import sequelize from "../config/sequelize.js";

// const CallRecords = sequelize.define(
//   "CallRecords",
//   {
//     uniqueId: {
//       type: DataTypes.STRING,
//       primaryKey: true,
//       allowNull: false,
//       field: "unique_id",
//     },
//     channelId: {
//       type: DataTypes.STRING,
//       allowNull: false,
//       field: "channel_id",
//     },
//     callerId: {
//       type: DataTypes.STRING,
//       allowNull: false,
//       field: "caller_id",
//     },
//     extension: {
//       type: DataTypes.STRING,
//       allowNull: false,
//     },
//     context: {
//       type: DataTypes.STRING,
//       allowNull: true,
//     },
//     timestamp: {
//       type: DataTypes.DATE,
//       allowNull: false,
//       field: "timestamp",
//     },
//     answerTime: {
//       type: DataTypes.DATE,
//       allowNull: true,
//       field: "answer_time",
//     },
//     endTime: {
//       type: DataTypes.DATE,
//       allowNull: true,
//       field: "end_time",
//     },
//     duration: {
//       type: DataTypes.INTEGER,
//       allowNull: true,
//     },
//     status: {
//       type: DataTypes.ENUM("new", "answered", "ended"),
//       defaultValue: "new",
//     },
//     abandoned: {
//       type: DataTypes.BOOLEAN,
//       defaultValue: true,
//     },
//     cause: {
//       type: DataTypes.STRING,
//       allowNull: true,
//     },
//     causeText: {
//       type: DataTypes.STRING,
//       allowNull: true,
//       field: "cause_text",
//     },
//     direction: {
//       type: DataTypes.ENUM("inbound", "outbound"),
//       allowNull: true,
//       defaultValue: "inbound",
//     },
//     bridgeId: {
//       type: DataTypes.STRING,
//       allowNull: true,
//       field: "bridge_id",
//     },
//   },
//   {
//     tableName: "call_records",
//     timestamps: true,
//     underscored: true,
//     indexes: [
//       {
//         fields: ["caller_id"],
//       },
//       {
//         fields: ["extension"],
//       },
//       {
//         fields: ["timestamp"],
//         name: "idx_timestamp",
//       },
//       {
//         fields: ["status"],
//       },
//       {
//         fields: ["direction"],
//       },
//     ],
//   }
// );

// export default CallRecords;
