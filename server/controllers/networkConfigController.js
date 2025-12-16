import sequelize from "../config/sequelize.js";
import {
  ExternIp,
  Stun,
  Turn,
  LocalNet,
} from "../models/networkConfigModel.js";
import {
  updateAsteriskConfig,
  updateRTPConfig,
} from "../utils/asteriskConfigWriter.js";

// ExternIp Controllers
export const createExternIp = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    // Create the external IP record
    const externIp = await ExternIp.create(req.body, { transaction });

    // Update Asterisk configuration
    try {
      await updateAsteriskConfig();
    } catch (configError) {
      // If Asterisk config update fails, rollback the transaction
      await transaction.rollback();
      return res.status(500).json({
        success: false,
        error: "Failed to update Asterisk configuration",
        details: configError.message,
      });
    }

    // Commit the transaction
    await transaction.commit();

    return res.status(201).json({
      success: true,
      data: externIp,
    });
  } catch (error) {
    await transaction.rollback();

    // Handle validation errors
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        error: "Validation error",
        details: error.errors.map((e) => e.message),
      });
    }

    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message,
    });
  }
};

export const getExternIps = async (req, res) => {
  try {
    const externIps = await ExternIp.findAll();
    res.status(200).json({ success: true, data: externIps });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateExternIp = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const externIp = await ExternIp.findByPk(req.params.id);
    if (!externIp) {
      return res
        .status(404)
        .json({ success: false, error: "ExternIp not found" });
    }
    await externIp.update(req.body, { transaction });
    await updateAsteriskConfig();
    await transaction.commit();
    res.status(200).json({ success: true, data: externIp });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteExternIp = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const externIp = await ExternIp.findByPk(req.params.id);
    if (!externIp) {
      return res
        .status(404)
        .json({ success: false, error: "ExternIp not found" });
    }
    await externIp.destroy({ transaction });
    await updateAsteriskConfig();
    await transaction.commit();
    res
      .status(200)
      .json({ success: true, message: "ExternIp deleted successfully" });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ success: false, error: error.message });
  }
};

// Stun Controllers
export const createStun = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const stun = await Stun.create(req.body, { transaction });
    // First commit the transaction
    await transaction.commit();
    // Then update the RTP config
    await updateRTPConfig();
    res.status(201).json({ success: true, data: stun });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getStuns = async (req, res) => {
  try {
    const stuns = await Stun.findAll();
    res.status(200).json({ success: true, data: stuns });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateStun = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const stun = await Stun.findByPk(req.params.id);
    if (!stun) {
      return res
        .status(404)
        .json({ success: false, error: "Stun server not found" });
    }
    await stun.update(req.body, { transaction });
    // First commit the transaction
    await transaction.commit();
    // Then update the RTP config
    await updateRTPConfig();
    res.status(200).json({ success: true, data: stun });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteStun = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const stun = await Stun.findByPk(req.params.id);
    if (!stun) {
      return res
        .status(404)
        .json({ success: false, error: "Stun server not found" });
    }
    await stun.destroy({ transaction });
    // First commit the transaction
    await transaction.commit();
    // Then update the RTP config
    await updateRTPConfig();
    res
      .status(200)
      .json({ success: true, message: "Stun server deleted successfully" });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ success: false, error: error.message });
  }
};

// Turn Controllers
export const createTurn = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const turn = await Turn.create(req.body, { transaction });
    // First commit the transaction
    await transaction.commit();
    // Then update the RTP config
    await updateRTPConfig();
    res.status(201).json({ success: true, data: turn });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getTurns = async (req, res) => {
  try {
    const turns = await Turn.findAll();
    res.status(200).json({ success: true, data: turns });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateTurn = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const turn = await Turn.findByPk(req.params.id);
    if (!turn) {
      return res
        .status(404)
        .json({ success: false, error: "Turn server not found" });
    }
    await turn.update(req.body, { transaction });
    // First commit the transaction
    await transaction.commit();
    // Then update the RTP config
    await updateRTPConfig();
    res.status(200).json({ success: true, data: turn });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteTurn = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const turn = await Turn.findByPk(req.params.id);
    if (!turn) {
      return res
        .status(404)
        .json({ success: false, error: "Turn server not found" });
    }
    await turn.destroy({ transaction });
    // First commit the transaction
    await transaction.commit();
    // Then update the RTP config
    await updateRTPConfig();
    res
      .status(200)
      .json({ success: true, message: "Turn server deleted successfully" });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ success: false, error: error.message });
  }
};

// LocalNet Controllers
export const createLocalNet = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const localNet = await LocalNet.create(req.body, { transaction });
    await updateAsteriskConfig();
    await transaction.commit();
    res.status(201).json({ success: true, data: localNet });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getLocalNets = async (req, res) => {
  try {
    const localNets = await LocalNet.findAll();
    res.status(200).json({ success: true, data: localNets });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateLocalNet = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const localNet = await LocalNet.findByPk(req.params.id);
    if (!localNet) {
      return res
        .status(404)
        .json({ success: false, error: "Local network not found" });
    }
    await localNet.update(req.body, { transaction });
    await updateAsteriskConfig();
    await transaction.commit();
    res.status(200).json({ success: true, data: localNet });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteLocalNet = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const localNet = await LocalNet.findByPk(req.params.id);
    if (!localNet) {
      return res
        .status(404)
        .json({ success: false, error: "Local network not found" });
    }
    await localNet.destroy({ transaction });
    await updateAsteriskConfig();
    await transaction.commit();
    res
      .status(200)
      .json({ success: true, message: "Local network deleted successfully" });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ success: false, error: error.message });
  }
};
