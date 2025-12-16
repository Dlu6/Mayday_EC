// // models/TrunkModel.js
// import sequelizePkg from "sequelize";
// const { DataTypes } = sequelizePkg;
// import sequelize from "../config/sequelize.js";

// const Trunk = sequelize.define(
//   "trunks",
//   {
//     id: {
//       type: DataTypes.INTEGER,
//       primaryKey: true,
//       autoIncrement: true,
//     },
//     name: {
//       type: DataTypes.STRING,
//       allowNull: false,
//       unique: true,
//     },
//     host: {
//       type: DataTypes.STRING,
//       allowNull: false,
//     },
//     defaultUser: {
//       type: DataTypes.STRING(64),
//       allowNull: true,
//     },
//     password: {
//       type: DataTypes.STRING(64),
//       allowNull: true,
//     },
//     type: {
//       type: DataTypes.STRING,
//       defaultValue: "friend",
//     },
//     context: {
//       type: DataTypes.STRING,
//       defaultValue: "from-voip-provider",
//     },
//     register_string: {
//       type: DataTypes.STRING,
//       allowNull: true,
//     },
//     fromUser: {
//       type: DataTypes.STRING,
//       allowNull: true,
//     },
//     fromDomain: {
//       type: DataTypes.STRING,
//       allowNull: true,
//     },
//     transport: {
//       type: DataTypes.STRING,
//       allowNull: true,
//     },
//     nat: {
//       type: DataTypes.STRING,
//       allowNull: true,
//     },
//     codecs: {
//       type: DataTypes.STRING,
//       defaultValue: "ulaw,alaw",
//     },
//     insecure: {
//       type: DataTypes.STRING,
//       allowNull: true,
//     },
//     enabled: {
//       type: DataTypes.BOOLEAN,
//       defaultValue: false,
//     },
//     active: {
//       type: DataTypes.INTEGER,
//       defaultValue: 0,
//     },
//     description: {
//       type: DataTypes.TEXT,
//       allowNull: true,
//     },
//   },
//   {
//     tableName: "trunks",
//     timestamps: true,
//   }
// );

// export default Trunk;
