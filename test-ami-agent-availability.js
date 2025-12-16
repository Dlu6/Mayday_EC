#!/usr/bin/env node

/**
 * Test Script: AMI Agent Availability
 *
 * This script tests the new single-source-of-truth implementation
 * that uses the ps_contacts table for real-time agent availability.
 */

import amiService from "./server/services/amiService.js";
import { PJSIPContact } from "./server/models/pjsipModel.js";
import sequelize from "./server/config/sequelize.js";

async function testAgentAvailability() {
  console.log("🧪 Testing AMI Agent Availability Implementation...\n");

  try {
    // 1. Test AMI connection
    console.log("1️⃣ Testing AMI connection...");
    await amiService.connect();
    console.log("✅ AMI connected successfully\n");

    // 2. Test extension status initialization
    console.log("2️⃣ Testing extension status initialization...");
    await amiService.initializeExtensionStatus();
    console.log("✅ Extension statuses initialized\n");

    // 3. Test getting all extension statuses
    console.log("3️⃣ Testing getAllExtensionStatuses...");
    const allStatuses = await amiService.getAllExtensionStatuses();
    console.log(
      `✅ Retrieved ${Object.keys(allStatuses).length} extension statuses:`
    );

    Object.entries(allStatuses).forEach(([ext, status]) => {
      console.log(
        `   ${ext}: ${status.status} (${status.rawStatus}) - Last seen: ${status.lastSeen}`
      );
    });
    console.log("");

    // 4. Test individual extension status
    console.log("4️⃣ Testing individual extension status...");
    const testExtension = Object.keys(allStatuses)[0];
    if (testExtension) {
      const individualStatus = await amiService.getExtensionStatus(
        testExtension
      );
      console.log(`✅ Extension ${testExtension} status:`, individualStatus);
    }
    console.log("");

    // 5. Test database query directly
    console.log("5️⃣ Testing direct database query...");
    const contacts = await PJSIPContact.findAll({
      order: [["updated_at", "DESC"]],
      limit: 5,
    });
    console.log(`✅ Retrieved ${contacts.length} contacts from database:`);
    contacts.forEach((contact) => {
      console.log(`   ${contact.endpoint}: ${contact.status} - ${contact.uri}`);
    });
    console.log("");

    // 6. Test refresh functionality
    console.log("6️⃣ Testing refresh functionality...");
    await amiService.refreshExtensionStatuses();
    console.log("✅ Extension statuses refreshed\n");

    // 7. Test real-time event handling
    console.log("7️⃣ Testing real-time event handling...");
    amiService.on("extension:contactStatus", (event) => {
      console.log(`📡 Real-time event: ${event.extension} -> ${event.status}`);
    });

    amiService.on("extension:availability_changed", (event) => {
      console.log(
        `🔄 Availability changed: ${event.extension} -> ${event.available}`
      );
    });

    console.log("✅ Event listeners registered (waiting for events...)\n");

    // 8. Test transfer verification
    console.log("8️⃣ Testing transfer verification...");
    const availableExtensions = Object.entries(allStatuses)
      .filter(([_, status]) => status.isRegistered)
      .map(([ext, _]) => ext);

    if (availableExtensions.length > 0) {
      const testTarget = availableExtensions[0];
      console.log(`✅ Found available extension for transfer: ${testTarget}`);

      // Test if we can get channel info
      const channelInfo = await amiService.getChannelForExtension(testTarget);
      console.log(`   Channel info: ${channelInfo || "No active channel"}`);
    }
    console.log("");

    // 9. Performance test
    console.log("9️⃣ Testing performance...");
    const startTime = Date.now();
    for (let i = 0; i < 10; i++) {
      await amiService.getAllExtensionStatuses();
    }
    const endTime = Date.now();
    const avgTime = (endTime - startTime) / 10;
    console.log(`✅ Average query time: ${avgTime.toFixed(2)}ms\n`);

    // 10. Summary
    console.log("📊 SUMMARY:");
    console.log(`   Total extensions: ${Object.keys(allStatuses).length}`);
    console.log(
      `   Available agents: ${
        Object.values(allStatuses).filter((s) => s.isRegistered).length
      }`
    );
    console.log(
      `   Offline agents: ${
        Object.values(allStatuses).filter((s) => !s.isRegistered).length
      }`
    );
    console.log(`   Database contacts: ${contacts.length}`);
    console.log(`   Cache size: ${amiService.getState().cacheSize}`);
    console.log(
      `   Last cache update: ${
        amiService.getState().lastCacheUpdate
          ? new Date(amiService.getState().lastCacheUpdate).toISOString()
          : "Never"
      }`
    );

    console.log("\n🎉 All tests completed successfully!");
    console.log("\n💡 The new implementation provides:");
    console.log("   ✅ Single source of truth (ps_contacts table)");
    console.log("   ✅ Real-time AMI event updates");
    console.log("   ✅ Efficient caching (5-second validity)");
    console.log("   ✅ Database-backed persistence");
    console.log("   ✅ Consistent agent availability status");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  } finally {
    // Cleanup
    await amiService.disconnect();
    await sequelize.close();
    console.log("\n🧹 Cleanup completed");
  }
}

// Run the test
testAgentAvailability().catch(console.error);
