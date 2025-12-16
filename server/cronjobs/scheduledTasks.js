import cron from 'node-cron';
import UserModel from '../models/UsersModel.js';
import sequelize from '../config/sequelize.js';
import { PsAors, PsAuths, PsEndpoints, PsTransports } from '../models/asteriskModels.js';


// Function to clean up orphaned records
export const cleanUpOrphanedRecords = async () => {
  console.log('Starting cleanup of orphaned records...');
  let t;
  try {
    t = await sequelize.transaction();

    const users = await UserModel.findAll({ attributes: ['extension'], transaction: t });
    const userExtensions = users.map(user => user.extension);

    const asteriskExtensions = await PsEndpoints.findAll({ attributes: ['id'], transaction: t });
    for (const { id: extension } of asteriskExtensions) {
      if (!userExtensions.includes(extension)) {
        await Promise.all([
          PsEndpoints.destroy({ where: { id: extension }, transaction: t }),
          PsAuths.destroy({ where: { id: extension }, transaction: t }),
          PsAors.destroy({ where: { id: extension }, transaction: t }),
          PsTransports.destroy({ where: { id: extension }, transaction: t }),
        ]);
        console.log(`Orphaned records with extension ${extension} deleted.`);
      }
    }

    await t.commit();
    console.log('Cleanup of orphaned records completed.');
  } catch (error) {
    if (t) await t.rollback();
    console.error('Error during cleanup of orphaned records:', error);
  }
};

// Schedule the cleanup to run daily at midnight
cron.schedule('0 0 * * *', cleanUpOrphanedRecords);

 // Run after 2 minutes upon starting server || Testings purposes
// setTimeout(cleanUpOrphanedRecords, 2 * 60 * 1000);
