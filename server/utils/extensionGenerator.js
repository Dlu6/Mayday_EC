// utils/extensionGenerator.js
import sequelizePkg from 'sequelize';
const { Op } = sequelizePkg;

import { SipUser } from "../models/sipModel.js";
export const generateUniqueExtension = async () => {

    let baseExtension = 1000;

    const highestExtensionUser = await SipUser.findOne({
        where: {
            extension: {
                [Op.ne]: null
            }
        },
        order: [['extension', 'DESC']]
    });

    if (highestExtensionUser && highestExtensionUser.extension) {
        const highestExtension = parseInt(highestExtensionUser.extension, 10);
        if (!isNaN(highestExtension)) {
            return String(highestExtension + 1);
        }
    }

    // If no existing extensions, return the base extension as a string
    return String(baseExtension);
};