// server.js
import mongoose from "mongoose";
import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import helmet from "helmet";
import session from "express-session";
import { createServer } from "http";
import pkg from "uuid";
const { v4: uuidv4 } = pkg;
import { json } from "express";
import { createClient } from "redis";
import RedisStore from "connect-redis";
import bcrypt from "bcrypt";
import { syncDatabase } from "./config/sequelize.js";
import UserModel from "./models/UsersModel.js";
import authRoutes from "./routes/UsersRoute.js";
// import sipRoutes from "./routes/sipRoutes.js";
// import asteriskRoutes from "./routes/asteriskRoute.mjs";
import trunkRoutes from "./routes/trunkRoute.mjs";
import inboundRoutes from "./routes/inboundRoute.mjs";
import outboundEndpoints from "./routes/outboundEndpoints.mjs";
import voiceQueueRoutes from "./routes/voiceQueueRoute.mjs";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { socketService } from "./services/socketService.js";
// import { initializeAsteriskServices } from "./config/asterisk.js";
import { ariService } from "./services/ariService.js";
import { EventEmitter } from "events";
import { commonPaths } from "./config/swagger/paths.js";
import { commonDefinitions } from "./config/swagger/definitions.js";
import amiService from "./services/amiService.js";
import chalk from "chalk";
import { setupPJSIPAssociations } from "./models/associations.js";
import { PJSIPEndpoint, PJSIPAuth, PJSIPAor } from "./models/pjsipModel.js";
import { Contact, WhatsAppMessage } from "./models/WhatsAppModel.js";
import soundFileRoutes from "./routes/soundFileRoutes.js";
import networkConfigRoutes from "./routes/networkConfigRoutes.js";
import reportsRoute from "./routes/reportsRoute.js";
import systemRoute from "./routes/systemRoute.js";
import ivrRoutes from "./routes/ivrRoutes.js";
import odbcRoutes from "./routes/odbcRoutes.js";
import whatsappRoutes from "./routes/whatsappRoutes.js";
import intervalRoutes from "./routes/intervalRoutes.js";
// Use enhanced transfer routes (includes legacy endpoints for compatibility)
import enhancedTransferRoutes from "./routes/enhancedTransferRoutes.js";
// datatool_server removed - not used in this project
import { callMonitoringService } from "./services/callMonitoringService.js";
// import CallRecords from "./models/callRecordsModel.js";
import { setupWhatsAppAssociations } from "./models/whatsappAssociations.js";
import { fastAGIService } from "./services/fastAGIService.js";
import QueueMember from "./models/queueMemberModel.js";
import { VoiceQueue } from "./models/voiceQueueModel.js";
import { setupIVRConfig } from "./utils/setupIVRConfig.js";
import cdrRoutes from "./routes/CdrRoute.js";
import adminRoutes from "./routes/adminRoutes.js";
import recordingRoutes from "./routes/recordingRoutes.js";
import callsRoutes from "./routes/callsRoutes.js";
import amiRoutes from "./routes/amiRoutes.js";
import pauseRoutes from "./routes/pauseRoutes.js";
import { seedPauseReasons } from "./models/pauseReasonModel.js";
import licenseRoutes from "./routes/licenseRoutes.js";
import setupDefaultIntervals from "./utils/setupDefaultIntervals.js";
// Increase EventEmitter limit
EventEmitter.defaultMaxListeners = 15;

// Set up __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
const io = socketService.initialize(httpServer);

// Set up CORS options
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      `https://mhuhelpline.com`,
      `wss://mhuhelpline.com`,
      `ws://mhuhelpline.com`,
      `http://${process.env.PUBLIC_IP}:${process.env.PORT}`,
      `https://${process.env.PUBLIC_IP}:${process.env.PORT}`,
      `http://${process.env.PUBLIC_IP}:8088`,
      `https://${process.env.PUBLIC_IP}:8088`,
      `http://${process.env.PUBLIC_IP}`,
      `ws://${process.env.PUBLIC_IP}:${process.env.PORT}`,
      `wss://${process.env.PUBLIC_IP}:${process.env.PORT}`,
      "http://localhost:3000",
      "http://localhost:5173", // Electron dev server
      "http://localhost:8004", // Electron app
      "ws://localhost:8004",
      "http://localhost:8004",
      `http://65.1.149.92:8004`,
      `ws://65.1.149.92:8004`,
    ];

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (process.env.NODE_ENV === "development") {
      return callback(null, true); // Allow all origins in development
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Mayday API",
      version: "2.0.0",
      description: "API for Mayday Asterisk Backend",
    },
    servers: [
      {
        url: `http://${process.env.PUBLIC_IP}:${process.env.PORT}`,
        description: "Production server",
      },
      {
        url: `http://localhost:${process.env.PORT}`,
        description: "Local development server",
      },
      {
        url: "http://localhost:8088/ari",
        description: "Asterisk ARI server",
      },
    ],
    tags: [
      {
        name: "Asterisk",
        description: "Asterisk ARI operations",
      },
      {
        name: "Network Configuration",
        description: "Network configuration management",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
        basicAuth: {
          type: "http",
          scheme: "basic",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
        basicAuth: [],
      },
    ],
    paths: {
      "/asterisk": {
        get: {
          tags: ["Asterisk"],
          summary: "Get Asterisk system information",
          security: [{ basicAuth: [] }],
          responses: {
            200: {
              description: "Successful operation",
            },
          },
        },
      },
      "/endpoints": {
        get: {
          tags: ["Asterisk"],
          summary: "List all endpoints",
          security: [{ basicAuth: [] }],
          responses: {
            200: {
              description: "List of endpoints",
            },
          },
        },
      },
      "/channels": {
        get: {
          tags: ["Asterisk"],
          summary: "List all active channels",
          security: [{ basicAuth: [] }],
          responses: {
            200: {
              description: "List of channels",
            },
          },
        },
      },
      "/bridges": {
        get: {
          tags: ["Asterisk"],
          summary: "List all bridges",
          security: [{ basicAuth: [] }],
          responses: {
            200: {
              description: "List of bridges",
            },
          },
        },
      },
    },
  },
  // Fix the apis configuration
  apis: [
    path.join(__dirname, "./routes/*.js"),
    path.join(__dirname, "./routes/*.mjs"),
  ],
};

// Generate Swagger spec
const swaggerSpec = swaggerJsdoc(swaggerOptions);
// const swaggerSpec = swaggerJsdoc(swaggerOptions);
// Configure Swagger UI with multiple specs
const swaggerUiOptions = {
  explorer: true,
  swaggerOptions: {
    urls: [
      {
        url: "/api-docs/swagger.json",
        name: "Mayday API",
      },
      {
        // url: "http://localhost:8088/ari/api-docs/resources.json",
        url: "/api/ari-docs",
        name: "Asterisk ARI",
      },
    ],
  },
};

// Redis setup
let redisClient = createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
});

let redisStore = new RedisStore({
  client: redisClient,
  ttl: 86400,
});

// 3. Added middleware before routes:
app.use((req, res, next) => {
  const allowedOrigins = [
    "https://mhuhelpline.com",
    "https://mhuhelpline.com",
    "http://localhost:8088", // For ARI Server
    "http://localhost:3000", // To Accept Dashboard Client Cors
    "http://localhost:5173", // For Electron Dev Server
    "http://43.205.229.152:8004",
    `http://localhost:${process.env.PORT}`,
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }

  res.header("Access-Control-Allow-Headers", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Middleware
app.use(cors(corsOptions));
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Configure session middleware with Redis store
app.use(
  session({
    store: redisStore,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: "auto",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.use(json());

// Add this before your route definitions
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get("/", (req, res) => {
  res.send("MAYDAY SERVER/API IS RUNNING....");
});

app.get("/api/ari-docs", async (req, res) => {
  try {
    const username = process.env.ARI_USERNAME;
    const password = process.env.ARI_PASSWORD;
    const auth = Buffer.from(`${username}:${password}`).toString("base64");

    // First get the root API docs
    const rootResponse = await fetch(
      `${process.env.ARI_URL}/ari/api-docs/resources.json`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: "application/json",
        },
      }
    );

    if (!rootResponse.ok) {
      throw new Error(`HTTP error! status: ${rootResponse.status}`);
    }

    const rootData = await rootResponse.json();

    // Define common paths with parameters

    // Create the complete OpenAPI document
    const enhancedData = {
      openapi: "3.0.0",
      info: {
        title: "Mayday Asterisk ARI",
        version: rootData.apiVersion || "2.0.0",
        description: "Asterisk REST Interface",
      },
      servers: [
        {
          url: `${process.env.ARI_URL}/ari`,
          description: "Asterisk ARI Server",
        },
      ],
      paths: {
        ...commonPaths,
      },
      components: {
        schemas: {
          ...commonDefinitions,
        },
        securitySchemes: {
          basicAuth: {
            type: "http",
            scheme: "basic",
            description: "HTTP Basic Authentication",
          },
        },
      },
      security: [
        {
          basicAuth: [],
        },
      ],
    };

    res.json(enhancedData);
  } catch (error) {
    console.error("Error fetching ARI docs:", error);
    res.status(500).json({
      error: "Failed to fetch ARI documentation",
      details: error.message,
    });
  }
});

// Routes
app.use("/api/users", authRoutes);
// app.use("/api/users/asterisk", asteriskRoutes);
app.use("/api/users/trunk", trunkRoutes);
app.use("/api/users/inbound_route", inboundRoutes);
app.use("/api/users/outbound_routes", outboundEndpoints);
app.use("/api/users/voice_queue", voiceQueueRoutes);
app.use("/api/users/sound_files", soundFileRoutes);
app.use("/api/users/network-config", networkConfigRoutes);
app.use("/api/users/reports", reportsRoute);
app.use("/api/users/system", systemRoute);
app.use("/api/users/ivr", ivrRoutes);
app.use("/api/users/odbc", odbcRoutes);
app.use("/api/users/intervals", intervalRoutes);
app.use("/api/transfers", enhancedTransferRoutes);
app.use("/api/whatsapp", whatsappRoutes);
// datatool routes removed - not used in this project
app.use("/api/cdr", cdrRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/recordings", recordingRoutes);
app.use("/api/calls", callsRoutes);
app.use("/api/ami", amiRoutes);
app.use("/api/pause", pauseRoutes);
app.use("/api/license", licenseRoutes);

// app.use("/api/sip", sipRoutes);

// Swagger API documentation
app.use("/api-docs", (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  next();
});

// Serve the Swagger spec
app.get("/api-docs/swagger.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// Mount Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(null, swaggerUiOptions));

// Move static file serving after API routes
const staticMiddleware = express.static(
  path.join(__dirname, "../client/build")
);

// Then static file serving
if (process.env.NODE_ENV === "production") {
  app.use(staticMiddleware);
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/build/index.html"));
  });
}

// Admin initialization function
async function initializeAdmin() {
  try {
    // Check if admin exists
    const adminUser = await UserModel.findOne({ where: { username: "admin" } });

    // If no admin exists, create one using .env values
    if (!adminUser) {
      const hashedPassword = await bcrypt.hash(
        process.env.DEFAULT_UI_USER_PASSWORD,
        10
      );

      await UserModel.create({
        id: uuidv4(),
        username: process.env.DEFAULT_UI_USERNAME || "admin",
        name: "Administrator",
        password: hashedPassword,
        email: "admin@mayday.com",
        fullName:
          process.env.DEFAULT_UI_USER_FULLNAME || "System Administrator",
        role: process.env.DEFAULT_UI_USER_ROLE || "admin",
        extension: "1000", // Changed from '999' to '1000' to match validation
        type: "friend",
        context: "from-internal",
        internal: 1000,
      });
      console.log("Admin user created successfully");
    } else {
      console.log("Admin user already exists");
    }
  } catch (error) {
    console.error("Failed to initialize admin:", error);
    throw error;
  }
}

const initializeAsteriskServices = async () => {
  try {
    console.log(chalk.gray("     Connecting to AMI..."));
    await amiService.connect();
    console.log(chalk.green("     ✅ AMI Service connected"));

    console.log(chalk.gray("     Initializing ARI service..."));
    const ariInitialized = await ariService.initialize();
    if (!ariInitialized) {
      throw new Error("Failed to initialize ARI service");
    }
    console.log(chalk.green("     ✅ ARI service initialized"));

    console.log(chalk.gray("     Starting call monitoring service..."));
    await callMonitoringService.initialize();
    console.log(chalk.green("     ✅ Call monitoring service initialized"));

    return true;
  } catch (error) {
    console.error(
      chalk.red("❌ Asterisk services initialization failed:"),
      error.message
    );
    if (error.stack) {
      console.error(chalk.red("   Stack trace:"), error.stack);
    }
    return false;
  }
};

// MongoDB Connection removed - datatool_server not used in this project

// Server initialization with proper error handling and progress indicators
const initializeApp = async () => {
  console.log(chalk.cyan.bold("🚀 Starting Mayday CRM Server...\n"));

  try {
    // Step 1: Database Connection
    console.log(chalk.blue("📊 Step 1/6: Database Connection"));
    console.log(chalk.gray("   Connecting to database..."));
    await syncDatabase();
    console.log(chalk.green("   ✅ Database synchronized successfully\n"));

    // Seed default pause reasons
    console.log(chalk.gray("   Seeding pause reasons..."));
    await seedPauseReasons();
    console.log(chalk.green("   ✅ Pause reasons seeded\n"));

    // Restore pause timers from database
    console.log(chalk.gray("   Restoring pause timers..."));
    const pauseSchedulerService = (await import("./services/pauseSchedulerService.js")).default;
    await pauseSchedulerService.restorePauseTimers();
    console.log(chalk.green("   ✅ Pause timers restored\n"));

    // Step 2: IVR Configuration (Production Only)
    if (process.env.NODE_ENV === "production") {
      console.log(chalk.blue("🎵 Step 2/6: IVR Configuration"));
      console.log(chalk.gray("   Setting up IVR configuration..."));
      try {
        await setupIVRConfig();
        console.log(chalk.green("   ✅ IVR configuration setup complete\n"));
      } catch (error) {
        console.warn(
          chalk.yellow("   ⚠ IVR configuration setup skipped:"),
          error.message
        );
      }
    } else {
      console.log(chalk.blue("🎵 Step 2/6: IVR Configuration"));
      console.log(chalk.gray("   Skipping IVR configuration in development\n"));
    }

    // Step 3: HTTP Server
    console.log(chalk.blue("🌐 Step 3/6: HTTP Server"));
    const PORT = process.env.PORT || 8004;
    await new Promise((resolve) => {
      httpServer.listen(PORT, "0.0.0.0", () => {
        console.log(chalk.green(`   ✅ Server running on port ${PORT}`));
        console.log(chalk.gray("   Available routes:"));
        console.log(chalk.gray("     - /api/users/login (POST)"));
        console.log(chalk.gray("     - /api/docs (GET) - API Documentation\n"));
        resolve();
      });
    });

    // Step 4: Database Associations
    console.log(chalk.blue("🔗 Step 4/6: Database Associations"));
    console.log(chalk.gray("   Setting up PJSIP associations..."));
    setupPJSIPAssociations(
      UserModel,
      { PJSIPEndpoint, PJSIPAuth, PJSIPAor },
      QueueMember,
      VoiceQueue
    );
    console.log(chalk.green("   ✅ PJSIP associations configured"));

    console.log(chalk.gray("   Setting up WhatsApp associations..."));
    setupWhatsAppAssociations(UserModel, { Contact, WhatsAppMessage });
    console.log(chalk.green("   ✅ WhatsApp associations configured\n"));

    // Step 5: Asterisk Services
    console.log(chalk.blue("📞 Step 5/6: Asterisk Services"));
    console.log(chalk.gray("   Initializing Asterisk services..."));
    await initializeAsteriskServices();
    console.log(chalk.green("   ✅ Asterisk services initialized\n"));

    // Step 6: Final Setup
    console.log(chalk.blue("⚙️  Step 6/6: Final Setup"));
    console.log(chalk.gray("   Initializing admin user..."));
    await initializeAdmin();
    console.log(chalk.green("   ✅ Admin user initialized"));

    console.log(chalk.gray("   Setting up default intervals..."));
    await setupDefaultIntervals();
    console.log(chalk.green("   ✅ Default intervals configured"));

    console.log(chalk.gray("   Starting FastAGI Server..."));
    try {
      await fastAGIService.start();
      console.log(
        chalk.green(
          `   ✅ FastAGI Server started on port ${fastAGIService.PORT}`
        )
      );
    } catch (error) {
      console.error(
        chalk.red("   ❌ Failed to start FastAGI Server:"),
        error.message
      );
    }

    // MongoDB connection removed - datatool_server not used in this project

    // Setup WebSocket handlers
    console.log(chalk.gray("   Setting up WebSocket handlers..."));
    io.on("connection", async (socket) => {
      // Only log connections in debug mode to reduce noise
      if (process.env.DEBUG_SOCKETS === 'true') {
        console.log("Client connected:", socket.id);
      }

      // Authenticate the socket connection
      socket.on("authenticate", async (data) => {
        try {
          const { extension } = data;
          socket.extension = extension;
          socket.join(`extension_${extension}`);
          const status = await ariService.checkPeerAvailability(extension);
          socket.emit("initial_status", status);
        } catch (error) {
          console.error("Socket authentication error:", error);
          socket.emit("auth_error", { message: "Authentication failed" });
        }
      });

      socket.on("disconnect", () => {
        if (process.env.DEBUG_SOCKETS === 'true') {
          console.log("Client disconnected:", socket.id);
        }
      });
    });
    console.log(chalk.green("   ✅ WebSocket handlers configured\n"));

    // Success message
    console.log(
      chalk.green.bold("🎉 Server initialization completed successfully!")
    );
    console.log(chalk.cyan(`   🌐 HTTP Server: http://localhost:${PORT}`));
    console.log(
      chalk.cyan(`   📚 API Docs: http://localhost:${PORT}/api/docs`)
    );
    console.log(chalk.cyan(`   📞 FastAGI: 0.0.0.0:${fastAGIService.PORT}`));
    console.log(chalk.gray("   Press Ctrl+C to stop the server\n"));
  } catch (error) {
    console.error(chalk.red.bold("❌ Server initialization failed:"));
    console.error(chalk.red("   Error:"), error.message);
    if (error.stack) {
      console.error(chalk.red("   Stack trace:"), error.stack);
    }
    process.exit(1);
  }
};

async function cleanup() {
  console.log("Starting server cleanup...");

  try {
    // Cleanup socket connections
    await callMonitoringService.cleanup();
    await socketService.cleanup();

    // Cleanup ARI
    await ariService.cleanup();

    // Close HTTP server
    await new Promise((resolve, reject) => {
      httpServer.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log("Cleanup completed successfully");

    await new Promise((resolve) => {
      fastAGIService.stop();
      resolve();
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    throw error;
  }
}

// Graceful shutdown handling
process.on("SIGTERM", async () => {
  console.log("Received SIGTERM. Starting graceful shutdown...");
  try {
    await cleanup();
    // await initializeAsteriskServices.cleanup();
    httpServer.close(() => {
      console.log("Server shut down successfully");
      process.exit(0);
    });
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
});

// Add this logic after imports and before the main application logic
// Track recoverable errors to prevent unnecessary restarts
const recoverableErrors = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EPIPE', 'PROTOCOL_CONNECTION_LOST'];

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  
  // Check if this is a recoverable connection error
  if (recoverableErrors.includes(err.code)) {
    console.warn(chalk.yellow(`[Server] Recoverable error detected (${err.code}), NOT shutting down`));
    return; // Don't exit for recoverable errors
  }
  
  // For non-recoverable errors, exit after a delay
  setTimeout(() => {
    console.error("Shutting down due to uncaught exception");
    process.exit(1);
  }, 1000);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  
  // Check if this is a recoverable connection error
  const errorCode = reason?.code || reason?.cause?.code;
  if (errorCode && recoverableErrors.includes(errorCode)) {
    console.warn(chalk.yellow(`[Server] Recoverable rejection detected (${errorCode}), NOT shutting down`));
    return; // Don't exit for recoverable errors
  }
  
  // For non-recoverable errors, exit after a delay
  setTimeout(() => {
    console.error("Shutting down due to unhandled rejection");
    process.exit(1);
  }, 1000);
});

initializeApp();

export { app, httpServer };
