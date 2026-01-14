// Environment configuration for Electron app
// This file re-exports from serverConfig for backward compatibility
// All URL configuration is now centralized in serverConfig.js

import serverConfig from "./serverConfig.js";

// Re-export serverConfig as the default for backward compatibility
export default serverConfig;
