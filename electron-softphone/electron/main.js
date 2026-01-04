const electron = require("electron");
const { app, BrowserWindow, ipcMain, session, Menu } = electron;
const path = require("path");

// Debug: Check if ipcMain is loaded
console.log("[main.js] Electron loaded:", !!electron);
console.log("[main.js] ipcMain loaded:", !!ipcMain);

// Load the appbar manager for Windows sticky appbar functionality
let appbarManager = null;
try {
  appbarManager = require("./appbarManager");
  console.log("[main.js] AppBar manager loaded successfully");
} catch (err) {
  console.warn("[main.js] AppBar manager not available:", err.message);
}

// Lazy load autoUpdater to avoid initialization issues
let autoUpdaterModule = null;
function getAutoUpdaterModule() {
  if (!autoUpdaterModule) {
    autoUpdaterModule = require("./autoUpdater");
  }
  return autoUpdaterModule;
}

let mainWindow = null;
let appbarWindow = null;
let isLoadingUrl = false;

// ============================================================================
// SERVER HOST CONFIGURATION - Change this value to update the production URL
// This should match the DEFAULT_SERVER_HOST in src/config/serverConfig.js
// ============================================================================
const DEFAULT_SERVER_HOST = "192.168.1.14";
const PROD_URL = `http://${DEFAULT_SERVER_HOST}`;
// VERY IMPORTANT TO GET CONSOLE LOGS IN THE TERMINAL
// Forward renderer console messages to main process stdout so they appear in the terminal
function forwardRendererConsole(win, label = "window") {
  if (!win || !win.webContents) return;

  win.webContents.on(
    "console-message",
    (_event, level, message, line, sourceId) => {
      const location = sourceId ? ` (${sourceId}:${line})` : "";
      const prefix = `[renderer:${label}]`;
      if (level === 2) {
        console.error(`${prefix} ${message}${location}`);
      } else if (level === 1) {
        console.warn(`${prefix} ${message}${location}`);
      } else {
        console.log(`${prefix} ${message}${location}`);
      }
    }
  );

  // Optional: log crashes and load failures to terminal as well
  win.webContents.on("render-process-gone", (_event, details) => {
    console.error(`[renderer:${label}] process gone: ${details.reason}`);
  });
  win.webContents.on(
    "did-fail-load",
    (_event, errorCode, errorDescription, validatedURL) => {
      console.error(
        `[renderer:${label}] failed to load ${
          validatedURL || ""
        }: ${errorCode} ${errorDescription}`
      );
    }
  );
}

// Add IPC handler for the URL preference
ipcMain.handle("get-url-preference", () => {
  return {
    useRemoteUrl: global.useRemoteUrl ?? false,
  };
});

// Modify this handler to reload the window
// NOTE: We no longer clear localStorage to preserve authentication state
ipcMain.on("set-url-preference", (event, useRemoteUrl) => {
  if (isLoadingUrl) return;
  isLoadingUrl = true;

  global.useRemoteUrl = useRemoteUrl;

  // If switching from remote to local
  if (!useRemoteUrl && mainWindow) {
    const localUrl =
      process.env.NODE_ENV === "development"
        ? "http://localhost:5173"
        : path.join(__dirname, "../dist/index.html");

    if (process.env.NODE_ENV === "development") {
      mainWindow.loadURL(localUrl).finally(() => {
        isLoadingUrl = false;
      });
    } else {
      mainWindow.loadFile(localUrl);
      isLoadingUrl = false;
    }
  }
  // If switching from local to remote
  else if (useRemoteUrl && mainWindow) {
    // Only clear cookies, NOT localStorage - preserve auth state
    session.defaultSession
      .clearStorageData({
        storages: ["cookies"],
      })
      .then(() => {
        mainWindow.loadURL(`${PROD_URL}`).finally(() => {
          isLoadingUrl = false;
        });
      })
      .catch(() => {
        isLoadingUrl = false;
      });
  }

  if (appbarWindow) {
    if (useRemoteUrl) {
      appbarWindow.loadURL(`${PROD_URL}/#/appbar`);
    } else {
      const localUrl =
        process.env.NODE_ENV === "development"
          ? "http://localhost:5173/#/appbar"
          : path.join(__dirname, "../dist/index.html");

      if (process.env.NODE_ENV === "development") {
        appbarWindow.loadURL(localUrl);
      } else {
        appbarWindow.loadFile(localUrl, {
          hash: "appbar",
        });
      }
    }
  }
});

function createLoginWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    // Keep frame: true for normal window with title bar
    // Frame will be hidden dynamically when docking via appbarManager
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      allowRunningInsecureContent: true,
    },
  });

  // Ignore certificate errors for all requests
  mainWindow.webContents.session.setCertificateVerifyProc((request, callback) => {
    callback(0); // 0 means accept the certificate
  });

  forwardRendererConsole(mainWindow, "login");

  // Load based on preference regardless of environment
  if (global.useRemoteUrl) {
    mainWindow.loadURL(`${PROD_URL}`);
  } else {
    // Load local development server or built files
    const localUrl =
      process.env.NODE_ENV === "development"
        ? "http://localhost:5173"
        : path.join(__dirname, "../dist/index.html");

    if (process.env.NODE_ENV === "development") {
      mainWindow.loadURL(localUrl);
      mainWindow.webContents.openDevTools();
    } else {
      mainWindow.loadFile(localUrl);
    }
  }
}

function createAppbarWindow() {
  if (mainWindow) {
    mainWindow.close();
    mainWindow = null;
  }

  appbarWindow = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false, // Remove title bar (app name, minimize, close buttons)
    titleBarStyle: 'hidden', // Additional setting for Windows
    transparent: false,
    hasShadow: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      webSocketProtocols: ["sip", "wss", "ws"],
      allowRunningInsecureContent: true,
    },
  });

  // Ignore certificate errors for all requests
  appbarWindow.webContents.session.setCertificateVerifyProc((request, callback) => {
    callback(0); // 0 means accept the certificate
  });

  forwardRendererConsole(appbarWindow, "appbar");

  // Load based on preference regardless of environment
  if (global.useRemoteUrl) {
    appbarWindow.loadURL(`${PROD_URL}/#/appbar`);
  } else {
    // Load local development server or built files
    const localUrl =
      process.env.NODE_ENV === "development"
        ? "http://localhost:5173/#/appbar"
        : path.join(__dirname, "../dist/index.html");

    if (process.env.NODE_ENV === "development") {
      appbarWindow.loadURL(localUrl);
      appbarWindow.webContents.openDevTools();
    } else {
      appbarWindow.loadFile(localUrl, {
        hash: "appbar",
      });
    }
  }
}

// Handle IPC messages
ipcMain.on("navigate", (event, route) => {
  if (route === "appbar") {
    createAppbarWindow();
  }
});

// Handle force reload request from renderer
ipcMain.on("force-reload", (event) => {
  const webContents = event.sender;
  if (webContents && !webContents.isDestroyed()) {
    webContents.reloadIgnoringCache();
  }
});

// Window control handlers for frameless window
ipcMain.on("window-minimize", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
});

ipcMain.on("window-maximize", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});

ipcMain.on("window-close", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});

// Handle show-logout-dialog request - temporarily expand window when docked
ipcMain.on("show-logout-dialog", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  
  // Check if we're in sticky/docked mode via appbarManager
  if (appbarManager && appbarManager.isEnabled && appbarManager.isEnabled()) {
    console.log("[main.js] Temporarily disabling sticky mode for logout dialog");
    // Store that we need to restore sticky mode after logout dialog closes
    win._wasDockedForLogout = true;
    // Temporarily disable sticky mode to show the dialog
    appbarManager.disable();
    
    // Expand the window to show the dialog
    const currentBounds = win.getBounds();
    win._dockedBounds = currentBounds;
    win.setBounds({
      x: currentBounds.x,
      y: currentBounds.y,
      width: Math.max(currentBounds.width, 500),
      height: Math.max(currentBounds.height, 400),
    });
    win.center();
  }
});

// Handle logout dialog closed - restore docked state if needed
ipcMain.on("logout-dialog-closed", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  
  if (win._wasDockedForLogout && appbarManager) {
    console.log("[main.js] Restoring sticky mode after logout dialog");
    win._wasDockedForLogout = false;
    // Re-enable sticky mode
    if (win._dockedBounds) {
      win.setBounds(win._dockedBounds);
      delete win._dockedBounds;
    }
    appbarManager.enable();
  }
});

app.whenReady().then(() => {
  // Remove the application menu bar entirely
  // Force reload is now available via the in-app button
  Menu.setApplicationMenu(null);
  
  // Register global keyboard shortcuts for DevTools
  const { globalShortcut } = electron;
  
  // F12 - Toggle DevTools
  globalShortcut.register('F12', () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      focusedWindow.webContents.toggleDevTools();
      console.log('[main.js] DevTools toggled via F12');
    }
  });
  
  // Ctrl+Shift+I - Toggle DevTools (alternative)
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      focusedWindow.webContents.toggleDevTools();
      console.log('[main.js] DevTools toggled via Ctrl+Shift+I');
    }
  });
  
  console.log('[main.js] DevTools shortcuts registered: F12, Ctrl+Shift+I');
  
  // Initialize auto-updater (lazy loaded)
  const { initAutoUpdater, checkForUpdates } = getAutoUpdaterModule();
  initAutoUpdater();
  
  // Initialize the Windows sticky appbar manager
  if (appbarManager) {
    appbarManager.init();
    console.log("[main.js] AppBar manager initialized");
  }
  
  // Create the login window
  createLoginWindow();
  
  // Check for updates after a short delay (give app time to load)
  setTimeout(() => {
    checkForUpdates();
  }, 5000);
});

app.on("window-all-closed", () => {
  // Cleanup sticky appbar before quitting
  console.log("[main.js] window-all-closed - cleaning up appbar");
  if (appbarManager) {
    appbarManager.cleanup();
  }
  
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Cleanup on app quit
app.on("before-quit", () => {
  console.log("[main.js] before-quit - cleaning up appbar");
  if (appbarManager) {
    appbarManager.cleanup();
  }
});

// Additional cleanup hook for Windows
app.on("will-quit", () => {
  console.log("[main.js] will-quit - final appbar cleanup");
  if (appbarManager) {
    appbarManager.cleanup();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createLoginWindow();
  }
});
