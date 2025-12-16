// config/sequelize.js
import Sequelize from "sequelize";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Get the directory path of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Debug environment loading
console.log("=============== Environment Debug ===============");
console.log("Current working directory:", process.cwd());
console.log("Module directory:", __dirname);

// Check different possible .env locations with server directory as priority
const possiblePaths = [
  path.join(__dirname, "../.env"), // server/.env (primary)
  path.join(process.cwd(), ".env"), // project root .env
  path.join(__dirname, "../../.env"), // project root .env (alternate path)
  path.join(__dirname, ".env"), // config/.env
];

console.log("\nChecking possible .env file locations:");
let envFound = false;
let envPath;

for (const path of possiblePaths) {
  const exists = fs.existsSync(path);
  console.log(`Checking ${path}: ${exists ? "EXISTS" : "NOT FOUND"}`);
  if (exists && !envFound) {
    envFound = true;
    envPath = path;
  }
}

if (!envFound) {
  throw new Error("No .env file found in any of the possible locations");
}

console.log("\nLoading .env from:", envPath);
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error("Error loading .env:", result.error);
  throw new Error(`Could not load .env file from ${envPath}`);
}

console.log("<<<<<Loading SQL variables loaded>>>>>>");
// console.log("Loading SQL variables loaded:", {
//   NODE_ENV: process.env.NODE_ENV,
//   DB_HOST: process.env.DB_HOST,
//   DB_PORT: process.env.DB_PORT,
//   DB_USER: process.env.DB_USER,
//   DB_NAME: process.env.DB_NAME,
//   HAS_DB_PASSWORD: !!process.env.DB_PASSWORD,
// });

// Validate required environment variables
const requiredEnvVars = [
  "DB_HOST",
  "DB_PORT",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME",
];
const missingEnvVars = requiredEnvVars.filter(
  (varName) => !process.env[varName]
);

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}`
  );
}

const { Op } = Sequelize;

// Add debug logging
// console.log("Database configuration:", {
//   database: process.env.DB_NAME,
//   username: process.env.DB_USER,
//   host: process.env.DB_HOST,
//   port: process.env.DB_PORT,
//   // Don't log the actual password
//   hasPassword: !!process.env.DB_PASSWORD,
// });
console.log("Reading database configuration...");

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: "mysql",
    port: process.env.DB_PORT,
    logging: false, //To disable SQL CLI logging
    pool: {
      max: 20,
      min: 2,
      acquire: 60000,
      idle: 10000,
      evict: 1000, // Check for idle connections every second
    },
    timezone: "+03:00",
    retry: {
      max: 5, // Retry failed queries up to 5 times
      match: [
        /ECONNRESET/,
        /ETIMEDOUT/,
        /ECONNREFUSED/,
        /PROTOCOL_CONNECTION_LOST/,
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/,
      ],
    },
    dialectOptions: {
      connectTimeout: 60000,
      // To preserve the database's time zone (East Africa Time)
      typeCast: function (field, next) {
        if (field.type === "DATETIME" || field.type === "TIMESTAMP") {
          return field.string();
        }
        return next();
      },
    },
  }
);

// Handle connection errors gracefully
sequelize.connectionManager.on?.('error', (err) => {
  console.error('[Sequelize] Connection pool error:', err.message);
});

// Periodic connection health check
setInterval(async () => {
  try {
    await sequelize.query('SELECT 1');
  } catch (err) {
    console.warn('[Sequelize] Health check failed, pool will auto-recover:', err.message);
  }
}, 30000);

export const syncDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connection has been established successfully.");
    await sequelize.sync();
    console.log("Database synchronized successfully");
  } catch (error) {
    console.error("Error connecting to database:", {
      message: error.message,
      code: error.original?.code,
      errno: error.original?.errno,
      config: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
      },
    });
    throw error;
  }
};

export { Op };
export default sequelize;
