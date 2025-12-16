// import Sequelize from "sequelize";
// const { DataTypes } = Sequelize;
// import sequelize from "../config/sequelize.js";

// export const PsEndpoints = sequelize.define(
//   "ps_endpoints",
//   {
//     id: { type: DataTypes.STRING, primaryKey: true },
//     extension: {
//       type: DataTypes.STRING,
//       unique: true,
//       validate: {
//         is: /^10\d{2}$/,
//       },
//     },
//     transport: DataTypes.STRING,
//     aors: DataTypes.STRING,
//     auth: DataTypes.STRING,
//     context: DataTypes.STRING,
//     disallow: DataTypes.STRING,
//     allow: DataTypes.STRING,
//     // direct_media: DataTypes.STRING,
//     rtp_symmetric: { type: DataTypes.BOOLEAN, defaultValue: false },
//     force_rport: { type: DataTypes.BOOLEAN, defaultValue: true },
//     rewrite_contact: { type: DataTypes.BOOLEAN, defaultValue: true },
//   },
//   {
//     tableName: "ps_endpoints",
//     timestamps: true,
//   }
// );

// // // models/ps_auths.js
// export const PsAuths = sequelize.define(
//   "ps_auths",
//   {
//     id: { type: DataTypes.STRING, primaryKey: true },
//     auth_type: DataTypes.STRING,
//     password: DataTypes.STRING,
//     username: DataTypes.STRING,
//   },
//   {
//     tableName: "ps_auths",
//     timestamps: true,
//   }
// );

// // models/ps_aors.js
// export const PsAors = sequelize.define(
//   "ps_aors",
//   {
//     id: { type: DataTypes.STRING, primaryKey: true },
//     max_contacts: DataTypes.INTEGER,
//     qualify_frequency: DataTypes.INTEGER,
//   },
//   {
//     tableName: "ps_aors",
//     timestamps: true,
//   }
// );

// // models/ps_transports.js
// export const PsTransports = sequelize.define(
//   "ps_transports",
//   {
//     id: { type: DataTypes.STRING, primaryKey: true },
//     protocol: DataTypes.STRING,
//     bind: DataTypes.STRING,
//     external_media_address: DataTypes.STRING, // Add this for NAT
//     external_signaling_address: DataTypes.STRING, // Add this for NAT
//     allow_reload: DataTypes.BOOLEAN,
//     local_net: DataTypes.STRING,
//   },
//   {
//     tableName: "ps_transports",
//     timestamps: true,
//   }
// );
