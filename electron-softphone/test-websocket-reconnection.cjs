#!/usr/bin/env node

/**
 * WebSocket Reconnection Test Script
 *
 * This script tests the lethal and efficient WebSocket reconnection mechanism
 * by simulating various connection failure scenarios with real authentication.
 */

const { io } = require("socket.io-client");
const EventEmitter = require("events");
const fs = require("fs");
const path = require("path");

// Test configuration
const TEST_CONFIG = {
  serverUrl: "http://localhost:8004",
  wsUrl: "ws://localhost:8004",
  testDuration: 30000, // 30 seconds
  failureScenarios: [
    "network_drop",
    "server_restart",
    "authentication_failure",
    "connection_timeout",
  ],
  // Test credentials (use your actual test credentials)
  testCredentials: {
    email: "sarah@gmail.com", // Replace with actual test email
    password: "12345", // Replace with actual test password
  },
};

// Attempt to load external config overrides from test-config.json
try {
  const configPath = path.join(__dirname, "test-config.json");
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, "utf-8");
    const external = JSON.parse(raw);
    // Shallow merge top-level values
    Object.assign(TEST_CONFIG, external);
    // Ensure nested credentials are merged
    if (external.testCredentials) {
      TEST_CONFIG.testCredentials = external.testCredentials;
    }
  }
} catch (e) {
  // Non-fatal: fall back to defaults
  console.warn("⚠️ Failed to load test-config.json:", e.message);
}

// Test state management
let testState = {
  socket: null,
  authToken: null,
  testResults: {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    reconnectionAttempts: 0,
    totalReconnections: 0,
    averageReconnectionTime: 0,
    authenticationTests: 0,
    reconnectionTests: 0,
  },
  testStartTime: Date.now(),
  reconnectionStartTime: null,
  reconnectionTimes: [],
  isAuthenticated: false,
};

// Utility function for delays
const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// Utility function for logging
const log = (message, type = "info") => {
  const timestamp = new Date().toISOString();
  const prefix =
    type === "error"
      ? "❌"
      : type === "warning"
      ? "⚠️"
      : type === "success"
      ? "✅"
      : "🔌";
  console.log(`${prefix} [${timestamp}] ${message}`);
};

// Authenticate with the server
const authenticate = async () => {
  try {
    log("🔐 Authenticating with server...");

    const response = await fetch(
      `${TEST_CONFIG.serverUrl}/api/users/agent-login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(
            `${TEST_CONFIG.testCredentials.email}:${TEST_CONFIG.testCredentials.password}`
          ).toString("base64")}`,
        },
        body: JSON.stringify({
          email: TEST_CONFIG.testCredentials.email,
          password: TEST_CONFIG.testCredentials.password,
          isSoftphone: true,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const responseData = await response.json();

    if (!responseData.success) {
      throw new Error(responseData.message || "Login failed");
    }

    const { tokens } = responseData.data;
    testState.authToken = tokens.sip;
    testState.isAuthenticated = true;

    log("✅ Authentication successful", "success");
    return true;
  } catch (error) {
    log(`❌ Authentication failed: ${error.message}`, "error");
    return false;
  }
};

// Initialize Socket.IO connection
const initializeWebSocket = async () => {
  return new Promise((resolve, reject) => {
    if (!testState.authToken) {
      reject(new Error("No auth token available"));
      return;
    }

    log("🔌 Initializing Socket.IO connection...");

    try {
      const url = TEST_CONFIG.serverUrl; // Socket.IO served from HTTP origin
      const bareToken = String(testState.authToken).replace(/^Bearer\s+/i, "");
      const headers = { Authorization: `Bearer ${bareToken}` };

      testState.socket = io(url, {
        path: "/socket.io/",
        transports: ["websocket"],
        timeout: TEST_CONFIG.connectionTimeout || 15000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        auth: { token: bareToken },
        extraHeaders: headers, // Node environment
      });

      let connected = false;

      testState.socket.on("connect", () => {
        connected = true;
        log("✅ Socket.IO connected", "success");
        resolve();
      });

      testState.socket.on("connect_error", (err) => {
        log(`❌ Connect error: ${err.message}`, "error");
      });

      testState.socket.on("reconnect_attempt", (n) => {
        log(`🔄 Reconnect attempt #${n}`);
      });

      testState.socket.on("reconnect", (n) => {
        log(`✅ Reconnected after ${n} attempts`, "success");
      });

      testState.socket.on("disconnect", (reason) => {
        log(`🔌 Disconnected: ${reason}`);
      });

      // Connection timeout fallback
      setTimeout(() => {
        if (!connected) {
          reject(new Error("Connection timeout"));
        }
      }, TEST_CONFIG.connectionTimeout || 15000);
    } catch (error) {
      log(`❌ Socket.IO initialization error: ${error.message}`, "error");
      reject(error);
    }
  });
};

// Test 1: Authentication
const testAuthentication = async () => {
  log("\n🧪 Test 1: Authentication");
  testState.testResults.totalTests++;
  testState.testResults.authenticationTests++;

  try {
    const success = await authenticate();
    if (success) {
      log("✅ Authentication test passed", "success");
      testState.testResults.passedTests++;
      return true;
    } else {
      log("❌ Authentication test failed", "error");
      testState.testResults.failedTests++;
      return false;
    }
  } catch (error) {
    log(`❌ Authentication test error: ${error.message}`, "error");
    testState.testResults.failedTests++;
    return false;
  }
};

// Test 2: Basic WebSocket connection
const testBasicConnection = async () => {
  log("\n🧪 Test 2: Basic Socket.IO Connection");
  testState.testResults.totalTests++;

  try {
    await initializeWebSocket();

    if (testState.socket && testState.socket.connected) {
      log("✅ Basic Socket.IO connection test passed", "success");
      testState.testResults.passedTests++;
      return true;
    } else {
      log("❌ Basic Socket.IO connection test failed", "error");
      testState.testResults.failedTests++;
      return false;
    }
  } catch (error) {
    log(`❌ Basic Socket.IO connection test error: ${error.message}`, "error");
    testState.testResults.failedTests++;
    return false;
  }
};

// Test 3: Reconnection after manual disconnect
const testManualReconnection = async () => {
  log("\n🧪 Test 3: Manual Reconnection");
  testState.testResults.totalTests++;
  testState.testResults.reconnectionTests++;

  try {
    if (!testState.socket) {
      log("❌ No WebSocket available for reconnection test", "error");
      testState.testResults.failedTests++;
      return false;
    }

    // Disconnect manually
    testState.socket.disconnect();
    log("🔌 Manually disconnected");

    // Wait a bit
    await sleep(1000);

    // Try to reconnect
    testState.socket.connect();
    log("🔄 Attempting reconnection...");

    // Wait for reconnection
    await sleep(3000);

    if (testState.socket && testState.socket.connected) {
      log("✅ Manual reconnection test passed", "success");
      testState.testResults.passedTests++;
      return true;
    } else {
      log("❌ Manual reconnection test failed", "error");
      testState.testResults.failedTests++;
      return false;
    }
  } catch (error) {
    log(`❌ Manual reconnection test error: ${error.message}`, "error");
    testState.testResults.failedTests++;
    return false;
  }
};

// Test 4: Network failure simulation
const testNetworkFailure = async () => {
  log("\n🧪 Test 4: Network Failure Simulation");
  testState.testResults.totalTests++;
  testState.testResults.reconnectionTests++;

  try {
    if (!testState.socket) {
      log("❌ No WebSocket available for network failure test", "error");
      testState.testResults.failedTests++;
      return false;
    }

    // Simulate network failure by closing the underlying transport (Socket.IO)
    if (testState.socket.io && testState.socket.io.engine) {
      testState.socket.io.engine.close();
    } else {
      testState.socket.disconnect();
    }
    log("🌐 Simulated network failure");

    // Wait for reconnection attempts
    await sleep(5000);

    // Try to reconnect
    testState.socket.connect();

    if (testState.socket && testState.socket.connected) {
      log("✅ Network failure recovery test passed", "success");
      testState.testResults.passedTests++;
      return true;
    } else {
      log("❌ Network failure recovery test failed", "error");
      testState.testResults.failedTests++;
      return false;
    }
  } catch (error) {
    log(`❌ Network failure test error: ${error.message}`, "error");
    testState.testResults.failedTests++;
    return false;
  }
};

// Test 6: Stress test with rapid connect/disconnect
const testStressReconnection = async () => {
  log("\n🧪 Test 6: Stress Reconnection Test");
  testState.testResults.totalTests++;
  testState.testResults.reconnectionTests++;

  try {
    if (!testState.socket) {
      log("❌ No WebSocket available for stress test", "error");
      testState.testResults.failedTests++;
      return false;
    }

    const iterations = 5;
    let successfulReconnections = 0;

    for (let i = 0; i < iterations; i++) {
      log(`🔄 Stress test iteration ${i + 1}/${iterations}`);

      // Disconnect
      testState.socket.disconnect();
      await sleep(500);

      // Reconnect
      testState.socket.connect();
      await sleep(1000);

      if (testState.socket && testState.socket.connected) {
        successfulReconnections++;
      }
    }

    const successRate = (successfulReconnections / iterations) * 100;
    log(`📊 Stress test success rate: ${successRate}%`);

    if (successRate >= 80) {
      // 80% success rate threshold
      log("✅ Stress reconnection test passed", "success");
      testState.testResults.passedTests++;
      return true;
    } else {
      log("❌ Stress reconnection test failed", "error");
      testState.testResults.failedTests++;
      return false;
    }
  } catch (error) {
    log(`❌ Stress reconnection test error: ${error.message}`, "error");
    testState.testResults.failedTests++;
    return false;
  }
};

// Test 7: Authentication token refresh
const testTokenRefresh = async () => {
  log("\n🧪 Test 7: Authentication Token Refresh");
  testState.testResults.totalTests++;

  try {
    if (!testState.socket || !testState.socket.connected) {
      log("❌ No active connection for token refresh test", "error");
      testState.testResults.failedTests++;
      return false;
    }

    // Simulate token refresh by re-authenticating and re-connecting with new token
    const ok = await authenticate();
    if (ok) {
      testState.socket.disconnect();
      await sleep(200);
      const bareToken = String(testState.authToken).replace(/^Bearer\s+/i, "");
      testState.socket.io.opts.auth = {
        token: bareToken,
      };
      testState.socket.io.opts.extraHeaders = {
        Authorization: `Bearer ${bareToken}`,
      };
      testState.socket.connect();

      await sleep(1000);

      if (testState.socket.connected) {
        log("✅ Token refresh test passed", "success");
        testState.testResults.passedTests++;
        return true;
      } else {
        log("❌ Token refresh test failed - connection lost", "error");
        testState.testResults.failedTests++;
        return false;
      }
    } else {
      log("❌ Token refresh test failed - could not get new token", "error");
      testState.testResults.failedTests++;
      return false;
    }
  } catch (error) {
    log(`❌ Token refresh test error: ${error.message}`, "error");
    testState.testResults.failedTests++;
    return false;
  }
};

// Generate test report
const generateTestReport = () => {
  const testDuration = Date.now() - testState.testStartTime;
  const successRate =
    (testState.testResults.passedTests / testState.testResults.totalTests) *
    100;

  log("\n📊 Test Report", "info");
  log("=============", "info");
  log(`⏱️  Total Duration: ${testDuration}ms`, "info");
  log(`🧪 Total Tests: ${testState.testResults.totalTests}`, "info");
  log(`✅ Passed: ${testState.testResults.passedTests}`, "success");
  log(`❌ Failed: ${testState.testResults.failedTests}`, "error");
  log(`📈 Success Rate: ${successRate.toFixed(1)}%`, "info");
  log(
    `🔐 Authentication Tests: ${testState.testResults.authenticationTests}`,
    "info"
  );
  log(
    `🔄 Reconnection Tests: ${testState.testResults.reconnectionTests}`,
    "info"
  );

  // Connection quality reporting removed (quality test deprecated)

  if (successRate >= 80) {
    log("\n🎉 WebSocket Reconnection Tests PASSED!", "success");
    log("✅ The reconnection mechanism is working correctly.", "success");
  } else if (successRate >= 60) {
    log("\n⚠️  WebSocket Reconnection Tests PARTIALLY PASSED", "warning");
    log("🔧 Some issues were detected. Check the logs above.", "warning");
  } else {
    log("\n❌ WebSocket Reconnection Tests FAILED", "error");
    log("🔧 Multiple issues detected. Review the implementation.", "error");
  }
};

// Cleanup function
const cleanup = () => {
  if (testState.socket) {
    testState.socket.close();
    testState.socket = null;
  }
  testState.authToken = null;
  testState.isAuthenticated = false;
};

// Run all tests
const runAllTests = async () => {
  log("🚀 Starting WebSocket Reconnection Tests...", "info");
  log(`📡 Server: ${TEST_CONFIG.serverUrl}`, "info");
  log(`🔐 Test Credentials: ${TEST_CONFIG.testCredentials.email}`, "info");
  log(`⏱️  Duration: ${TEST_CONFIG.testDuration / 1000}s`, "info");

  try {
    // Run tests
    await testAuthentication();
    await testBasicConnection();
    await testManualReconnection();
    await testNetworkFailure();
    await testStressReconnection();
    await testTokenRefresh();

    // Wait for any ongoing operations
    await sleep(2000);

    // Generate test report
    generateTestReport();
  } catch (error) {
    log(`❌ Test execution failed: ${error.message}`, "error");
  } finally {
    // Cleanup
    cleanup();
  }
};

// Export functions for module usage
module.exports = {
  authenticate,
  initializeWebSocket,
  testAuthentication,
  testBasicConnection,
  testManualReconnection,
  testNetworkFailure,
  testStressReconnection,
  testTokenRefresh,
  runAllTests,
  generateTestReport,
  testState,
  cleanup,
};

// Run tests if this script is executed directly
if (require.main === module) {
  // Check if fetch is available (Node.js 18+)
  if (typeof fetch === "undefined") {
    console.error("❌ This script requires Node.js 18+ or fetch polyfill");
    console.log(
      "💡 To run with older Node.js, install node-fetch: npm install node-fetch"
    );
    process.exit(1);
  }

  runAllTests().catch((error) => {
    log(`❌ Test execution failed: ${error.message}`, "error");
    process.exit(1);
  });
}
