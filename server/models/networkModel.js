// // models/networkModel.js
// import sequelizePkg from 'sequelize';
// const { DataTypes } = sequelizePkg;
// import sequelize from '../config/sequelize.js';

// export const Network = sequelize.define('Network', {
//   // Sequelize automatically assumes your table name is the plural of the model name
//   id: {
//     type: DataTypes.INTEGER,
//     primaryKey: true,
//     autoIncrement: true,
//   },
//   type: DataTypes.ENUM('localnet', 'externip', 'stun', 'turn'),
//   value: DataTypes.STRING,
//   username: DataTypes.STRING,
//   password: DataTypes.STRING,
//   createdAt: DataTypes.DATE,
//   updatedAt: DataTypes.DATE,
// }, {
//   tableName: 'network',
//   timestamps: true, // If you want Sequelize to automatically manage createdAt and updatedAt
// });
