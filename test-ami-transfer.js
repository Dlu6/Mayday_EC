#!/usr/bin/env node

/**
 * Test script for AMI-based call transfers
 *
 * Usage: node test-ami-transfer.js
 *
 * Prerequisites:
 * 1. Start the server with `npm run server`
 * 2. Have at least 3 extensions registered (e.g., 1001, 1002, 1003)
 * 3. Make a call between two extensions
 * 4. Run this script to test the transfer
 */

import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, "server/.env") });

const API_BASE = process.env.API_BASE || "http://localhost:8004";
const TOKEN = process.env.TEST_TOKEN || ""; // You'll need to get a valid auth token

// Test configuration
const TEST_CONFIG = {
  sourceExtension: "1001", // Extension making the transfer
  targetExtension: "1002", // Extension to transfer to
  destinationExtension: "1003", // Extension currently in call with source
};

// Helper function to login and get token
async function getAuthToken() {
  try {
    const response = await fetch(`${API_BASE}/api/users/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "admin",
        password: process.env.DEFAULT_UI_USER_PASSWORD || "admin123",
      }),
    });

    const data = await response.json();
    if (data.token) {
      return data.token;
    }
    throw new Error("Failed to get auth token");
  } catch (error) {
    console.error("Auth error:", error);
    throw error;
  }
}

// Test blind transfer
async function testBlindTransfer(token) {
  console.log("\n=== Testing Blind Transfer ===");
  console.log(
    `Transferring call from ${TEST_CONFIG.sourceExtension} to ${TEST_CONFIG.targetExtension}`
  );

  try {
    const response = await fetch(`${API_BASE}/api/transfers/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        extension: TEST_CONFIG.sourceExtension,
        targetExtension: TEST_CONFIG.targetExtension,
        transferType: "blind",
      }),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log("✅ Blind transfer successful:", result.data);
    } else {
      console.error(
        "❌ Blind transfer failed:",
        result.message || result.error
      );
    }

    return result;
  } catch (error) {
    console.error("❌ Blind transfer error:", error);
    throw error;
  }
}

// Test attended transfer
async function testAttendedTransfer(token) {
  console.log("\n=== Testing Attended Transfer ===");
  console.log(
    `Starting attended transfer from ${TEST_CONFIG.sourceExtension} to ${TEST_CONFIG.targetExtension}`
  );

  try {
    const response = await fetch(`${API_BASE}/api/transfers/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        extension: TEST_CONFIG.sourceExtension,
        targetExtension: TEST_CONFIG.targetExtension,
        transferType: "attended",
      }),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log("✅ Attended transfer initiated:", result.data);
    } else {
      console.error(
        "❌ Attended transfer failed:",
        result.message || result.error
      );
    }

    return result;
  } catch (error) {
    console.error("❌ Attended transfer error:", error);
    throw error;
  }
}

// Get available agents for transfer
async function getAvailableAgents(token) {
  console.log("\n=== Getting Available Agents ===");

  try {
    const response = await fetch(
      `${API_BASE}/api/transfers/available-agents?currentExtension=${TEST_CONFIG.sourceExtension}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const result = await response.json();

    if (response.ok && result.success) {
      console.log("✅ Available agents:", result.data);
    } else {
      console.error("❌ Failed to get agents:", result.message || result.error);
    }

    return result;
  } catch (error) {
    console.error("❌ Error getting agents:", error);
    throw error;
  }
}

// Get transfer statistics
async function getTransferStats(token) {
  console.log("\n=== Getting Transfer Statistics ===");

  try {
    const response = await fetch(`${API_BASE}/api/transfers/stats`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log("✅ Transfer stats:", result.data.stats);
    } else {
      console.error("❌ Failed to get stats:", result.message || result.error);
    }

    return result;
  } catch (error) {
    console.error("❌ Error getting stats:", error);
    throw error;
  }
}

// Main test function
async function runTests() {
  console.log("AMI Transfer Test Script");
  console.log("========================");
  console.log("API Base:", API_BASE);
  console.log("Test Config:", TEST_CONFIG);

  try {
    // Get auth token
    console.log("\nGetting authentication token...");
    const token = TOKEN || (await getAuthToken());
    console.log("✅ Authentication successful");

    // Get available agents
    await getAvailableAgents(token);

    // Test transfer type based on command line argument
    const transferType = process.argv[2] || "blind";

    if (transferType === "attended") {
      await testAttendedTransfer(token);
    } else {
      await testBlindTransfer(token);
    }

    // Get transfer stats
    await getTransferStats(token);

    console.log("\n✅ All tests completed");
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }
}

// Instructions
function showInstructions() {
  console.log(`
Usage: node test-ami-transfer.js [transfer-type]

Arguments:
  transfer-type    Type of transfer to test: 'blind' (default) or 'attended'

Prerequisites:
  1. Server must be running (npm run server)
  2. At least 3 extensions must be registered
  3. Make a call between two extensions before running this test

Examples:
  node test-ami-transfer.js           # Test blind transfer
  node test-ami-transfer.js blind     # Test blind transfer
  node test-ami-transfer.js attended  # Test attended transfer

Configuration:
  Edit TEST_CONFIG in this script to match your extension numbers
  `);
}

// Run tests or show help
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  showInstructions();
} else {
  runTests();
}
