#!/usr/bin/env node

/**
 * Database Monitor for Mayday CRM
 * Monitors both main CRM database and DataTool database
 * Provides health status, connection pooling, and performance metrics
 */

import mysql from "mysql2/promise";
import { EventEmitter } from "events";

// Shared state object
const monitorState = {
  mainDbPool: null,
  datatoolDbPool: null,
  monitoring: false,
  stats: {
    main: {
      status: "disconnected",
      lastCheck: null,
      connections: 0,
      errors: 0,
    },
    datatool: {
      status: "disconnected",
      lastCheck: null,
      connections: 0,
      errors: 0,
    },
  },
  healthCheckInterval: null,
  poolMonitorInterval: null,
  eventEmitter: new EventEmitter(),
};

/**
 * Initialize database connections
 */
export const initialize = async () => {
  try {
    console.log("🔄 Initializing database connections...");

    // Main CRM Database (asterisk)
    monitorState.mainDbPool = mysql.createPool({
      host: "65.1.149.92",
      port: 3306,
      user: "mayday_user",
      password: "Pasword@256",
      database: "asterisk",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      acquireTimeout: 60000,
      timeout: 60000,
      reconnect: true,
    });

    // DataTool Database (local)
    monitorState.datatoolDbPool = mysql.createPool({
      host: "localhost",
      port: 3306,
      user: "mayday_user",
      password: "Pasword@256",
      database: "mayday_crm_db",
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      acquireTimeout: 60000,
      timeout: 60000,
      reconnect: true,
    });

    console.log("✅ Database pools created successfully");
    return true;
  } catch (error) {
    console.error(
      "❌ Failed to initialize database connections:",
      error.message
    );
    return false;
  }
};

/**
 * Start monitoring both databases
 */
export const startMonitoring = async () => {
  if (monitorState.monitoring) {
    console.log("⚠️ Monitoring already active");
    return;
  }

  monitorState.monitoring = true;
  console.log("🚀 Starting database monitoring...");

  // Initial health check
  await checkHealth();

  // Set up periodic monitoring
  monitorState.healthCheckInterval = setInterval(() => {
    checkHealth();
  }, 30000); // Check every 30 seconds

  // Set up connection pool monitoring
  monitorState.poolMonitorInterval = setInterval(() => {
    monitorConnectionPools();
  }, 10000); // Monitor every 10 seconds

  console.log("✅ Database monitoring started");
};

/**
 * Stop monitoring
 */
export const stopMonitoring = () => {
  if (!monitorState.monitoring) return;

  monitorState.monitoring = false;

  if (monitorState.healthCheckInterval) {
    clearInterval(monitorState.healthCheckInterval);
  }

  if (monitorState.poolMonitorInterval) {
    clearInterval(monitorState.poolMonitorInterval);
  }

  console.log("⏹️ Database monitoring stopped");
};

/**
 * Check health of both databases
 */
export const checkHealth = async () => {
  const timestamp = new Date();

  // Check main database
  try {
    const mainConnection = await monitorState.mainDbPool.getConnection();
    await mainConnection.ping();
    mainConnection.release();

    monitorState.stats.main = {
      status: "healthy",
      lastCheck: timestamp,
      connections: monitorState.mainDbPool.pool.connectionCount,
      errors: monitorState.stats.main.errors,
    };

    console.log("✅ Main database: Healthy");
    monitorState.eventEmitter.emit("health", {
      database: "main",
      status: "healthy",
      timestamp,
    });
  } catch (error) {
    monitorState.stats.main = {
      status: "unhealthy",
      lastCheck: timestamp,
      connections: 0,
      errors: monitorState.stats.main.errors + 1,
    };

    console.error("❌ Main database: Unhealthy -", error.message);
    monitorState.eventEmitter.emit("health", {
      database: "main",
      status: "unhealthy",
      error: error.message,
      timestamp,
    });
  }

  // Check datatool database
  try {
    const datatoolConnection =
      await monitorState.datatoolDbPool.getConnection();
    await datatoolConnection.ping();
    datatoolConnection.release();

    monitorState.stats.datatool = {
      status: "healthy",
      lastCheck: timestamp,
      connections: monitorState.datatoolDbPool.pool.connectionCount,
      errors: monitorState.stats.datatool.errors,
    };

    console.log("✅ DataTool database: Healthy");
    monitorState.eventEmitter.emit("health", {
      database: "datatool",
      status: "healthy",
      timestamp,
    });
  } catch (error) {
    monitorState.stats.datatool = {
      status: "unhealthy",
      lastCheck: timestamp,
      connections: 0,
      errors: monitorState.stats.datatool.errors + 1,
    };

    console.error("❌ DataTool database: Unhealthy -", error.message);
    monitorState.eventEmitter.emit("health", {
      database: "datatool",
      status: "unhealthy",
      error: error.message,
      timestamp,
    });
  }
};

/**
 * Monitor connection pool status
 */
export const monitorConnectionPools = () => {
  if (monitorState.mainDbPool) {
    const mainPool = monitorState.mainDbPool.pool;
    monitorState.eventEmitter.emit("pool-status", {
      database: "main",
      totalConnections: mainPool.connectionCount,
      idleConnections: mainPool.idleCount,
      activeConnections: mainPool.connectionCount - mainPool.idleCount,
    });
  }

  if (monitorState.datatoolDbPool) {
    const datatoolPool = monitorState.datatoolDbPool.pool;
    monitorState.eventEmitter.emit("pool-status", {
      database: "datatool",
      totalConnections: datatoolPool.connectionCount,
      idleConnections: datatoolPool.idleCount,
      activeConnections: datatoolPool.connectionCount - datatoolPool.idleCount,
    });
  }
};

/**
 * Get current status of both databases
 */
export const getStatus = () => {
  return {
    timestamp: new Date(),
    monitoring: monitorState.monitoring,
    databases: monitorState.stats,
  };
};

/**
 * Execute query on main database
 */
export const queryMain = async (sql, params = []) => {
  try {
    const [rows] = await monitorState.mainDbPool.execute(sql, params);
    return { success: true, data: rows };
  } catch (error) {
    console.error("Main database query error:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Execute query on datatool database
 */
export const queryDataTool = async (sql, params = []) => {
  try {
    const [rows] = await monitorState.datatoolDbPool.execute(sql, params);
    return { success: true, data: rows };
  } catch (error) {
    console.error("DataTool database query error:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Get database schema information
 */
export const getSchemaInfo = async () => {
  try {
    const mainSchema = await queryMain(`
      SELECT 
        TABLE_NAME,
        TABLE_ROWS,
        DATA_LENGTH,
        INDEX_LENGTH,
        CREATE_TIME,
        UPDATE_TIME
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'asterisk'
      ORDER BY TABLE_NAME
    `);

    const datatoolSchema = await queryDataTool(`
      SELECT 
        TABLE_NAME,
        TABLE_ROWS,
        DATA_LENGTH,
        INDEX_LENGTH,
        CREATE_TIME,
        UPDATE_TIME
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'mayday_crm_db'
      ORDER BY TABLE_NAME
    `);

    return {
      main: mainSchema.success ? mainSchema.data : [],
      datatool: datatoolSchema.success ? datatoolSchema.data : [],
    };
  } catch (error) {
    console.error("Schema info error:", error.message);
    return { main: [], datatool: [] };
  }
};

/**
 * Cleanup connections
 */
export const cleanup = async () => {
  stopMonitoring();

  if (monitorState.mainDbPool) {
    await monitorState.mainDbPool.end();
    console.log("🔌 Main database pool closed");
  }

  if (monitorState.datatoolDbPool) {
    await monitorState.datatoolDbPool.end();
    console.log("🔌 DataTool database pool closed");
  }
};

/**
 * Get event emitter for external event handling
 */
export const getEventEmitter = () => monitorState.eventEmitter;

// Handle process termination
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down database monitor...");
  await cleanup();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Shutting down database monitor...");
  await cleanup();
  process.exit(0);
});

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    console.log("🗄️ Mayday CRM Database Monitor");
    console.log("===============================\n");

    const initialized = await initialize();
    if (!initialized) {
      console.error("Failed to initialize database monitor");
      process.exit(1);
    }

    await startMonitoring();

    // Keep the process alive
    process.stdin.resume();

    // Set up event listeners for CLI output
    const eventEmitter = getEventEmitter();
    eventEmitter.on("health", (data) => {
      const status = data.status === "healthy" ? "✅" : "❌";
      console.log(`${status} ${data.database} database: ${data.status}`);
    });

    eventEmitter.on("pool-status", (data) => {
      console.log(
        `📊 ${data.database} pool: ${data.activeConnections}/${data.totalConnections} active`
      );
    });

    console.log("\n📡 Monitor is running. Press Ctrl+C to stop.\n");
  })();
}

// Default export for backward compatibility
export default {
  initialize,
  startMonitoring,
  stopMonitoring,
  checkHealth,
  monitorConnectionPools,
  getStatus,
  queryMain,
  queryDataTool,
  getSchemaInfo,
  cleanup,
  getEventEmitter,
};
