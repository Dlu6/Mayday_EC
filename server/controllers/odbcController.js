import OdbcConnection from "../models/odbcModel.js";
import odbcService from "../services/odbcService.js";

// Get all ODBC connections
export const getOdbcConnections = async (req, res) => {
  try {
    const connections = await OdbcConnection.findAll();
    res.json(connections);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new ODBC connection
export const createOdbcConnection = async (req, res) => {
  try {
    const { name, dsn, description, enabled = true } = req.body;

    // Validate DSN format
    const testResult = await odbcService.testConnection(dsn);
    if (!testResult.success) {
      return res.status(400).json({ error: testResult.message });
    }

    // Save to database
    const connection = await OdbcConnection.create({
      name,
      dsn,
      description,
      enabled,
    });

    // Update Asterisk configuration
    const allConnections = await OdbcConnection.findAll();
    await odbcService.updateAsteriskConfig(allConnections);

    res.status(201).json(connection);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update ODBC connection
export const updateOdbcConnection = async (req, res) => {
  try {
    const { name, dsn, description, enabled } = req.body;
    const connection = await OdbcConnection.findByPk(req.params.id);

    if (!connection) {
      return res.status(404).json({ error: "Connection not found" });
    }

    // Validate new DSN if it changed
    if (dsn !== connection.dsn) {
      const testResult = await odbcService.testConnection(dsn);
      if (!testResult.success) {
        return res.status(400).json({ error: testResult.message });
      }
    }

    // Update connection
    await connection.update({
      name,
      dsn,
      description,
      enabled,
    });

    // Update Asterisk configuration
    const allConnections = await OdbcConnection.findAll();
    await odbcService.updateAsteriskConfig(allConnections);

    res.json(connection);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete ODBC connection
export const deleteOdbcConnection = async (req, res) => {
  try {
    const connection = await OdbcConnection.findByPk(req.params.id);

    if (!connection) {
      return res.status(404).json({ error: "Connection not found" });
    }

    await connection.destroy();

    // Update Asterisk configuration
    const allConnections = await OdbcConnection.findAll();
    await odbcService.updateAsteriskConfig(allConnections);

    res.json({ message: "Connection deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get ODBC functions (func_odbc.conf entries)
export const getOdbcFunctions = async (req, res) => {
  try {
    // Return the system ODBC functions used in dialplan
    const functions = [
      {
        id: "agent_paused",
        name: "AGENT_PAUSED",
        dsn: "asterisk",
        readsql: "SELECT COALESCE(MAX(CASE WHEN paused = 1 THEN 1 ELSE 0 END), 0) FROM queue_members WHERE interface = CONCAT('PJSIP/', '${ARG1}')",
        syntax: "<extension>",
        synopsis: "Check if an agent extension is currently paused",
        enabled: true,
        isSystem: true,
      },
      {
        id: "user_presence",
        name: "USER_PRESENCE",
        dsn: "asterisk",
        readsql: "SELECT COALESCE(presence, 'UNKNOWN') FROM Users WHERE extension = '${ARG1}'",
        syntax: "<extension>",
        synopsis: "Get user presence status by extension",
        enabled: true,
        isSystem: true,
      },
    ];
    res.json(functions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
