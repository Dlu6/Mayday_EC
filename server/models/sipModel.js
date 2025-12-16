// import sequelizePkg from 'sequelize';
// const { DataTypes
//  } = sequelizePkg;

//  import sequelize from '../config/sequelize.js';

// export const SipUser = sequelize.define('user', {
//   // id: { type: DataTypes.STRING, primaryKey: true },
//   id: {
//     type: DataTypes.UUID,
//     primaryKey: true,
//     defaultValue: DataTypes.UUIDV4,
//   },
//   name: {
//     type: DataTypes.STRING,
//   },
//   extension: {
//     type: DataTypes.STRING,
//     unique: true,
//     validate: {
//       is: /^10\d{2}$/
//     }
//   },
//   username: {
//     type: DataTypes.STRING,
//     allowNull: false,
//     // unique: true
//   },
//   fullName: {
//     type: DataTypes.STRING,
//     allowNull: false
//     },
//   email: { type: DataTypes.STRING, unique: true, validate: { isEmail: true } },
//   password: {
//     type: DataTypes.STRING,
//     allowNull: false
//   },
//   context: {
//     type: DataTypes.STRING,
//     defaultValue: 'from-internal'
//   },
//   host: {
//     type: DataTypes.STRING,
//     defaultValue: 'dynamic'
//   },
//   nat: {
//     type: DataTypes.STRING,
//     defaultValue: 'force_rport,comedia'
//   },
//   typology: {
//     type: DataTypes.STRING,
//   },
//   type: {
//     type: DataTypes.STRING,
//     defaultValue: 'friend'
//   },
//   qualify: {
//     type: DataTypes.STRING,
//     defaultValue: 'yes'
//   }
// }, {
//   // Additional model options if needed
// });
