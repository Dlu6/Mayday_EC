/**
 * Email Migration Script
 * Updates user emails in SQL database
 * Preserves passwords and maintains data integrity
 * 
 * Usage: node scripts/migrate-emails.js
 */

import sequelize from "../config/sequelize.js";
import UserModel from "../models/UsersModel.js";
import dotenv from "dotenv";

dotenv.config();

// Email mapping: old email -> new email
const EMAIL_MAPPINGS = [
  { old: "andrew.kananura@mentalhealthuganda.org", new: "akananura@mhu.ug" },
  { old: "gloria.mirembe@mentalhealthuganda.org", new: "gmirembe@mhu.ug" },
  { old: "muzamiru.kaibo@mentalhealthuganda.org", new: "mkaibo@mhu.ug" },
  { old: "phionah.nambasa@mentalhealthuganda.org", new: "pnambasa@mhu.ug" },
  { old: "erusa.nakiyimba@mentalhealthuganda.org", new: "enakiyimba@mhu.ug" },
  { old: "eliah.motto@mentalhealthuganda.org", new: "emotto@mhu.ug" },
];

async function migrateEmails() {
  const results = {
    success: [],
    failed: [],
  };

  console.log("\n📧 Starting email migration...\n");

  for (const mapping of EMAIL_MAPPINGS) {
    console.log(`\n🔄 Processing: ${mapping.old} → ${mapping.new}`);

    try {
      const user = await UserModel.findOne({ where: { email: mapping.old } });
      
      if (user) {
        // Check if new email already exists
        const existingNew = await UserModel.findOne({ where: { email: mapping.new } });
        if (existingNew && existingNew.id !== user.id) {
          throw new Error(`New email ${mapping.new} already exists`);
        }

        await UserModel.update(
          { email: mapping.new },
          { where: { email: mapping.old } }
        );
        console.log(`   ✅ Updated (ID: ${user.id}, Extension: ${user.extension})`);
        results.success.push({
          old: mapping.old,
          new: mapping.new,
          id: user.id,
          extension: user.extension,
        });
      } else {
        console.log(`   ⚠️  User not found`);
        results.failed.push({
          old: mapping.old,
          new: mapping.new,
          reason: "User not found",
        });
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      results.failed.push({
        old: mapping.old,
        new: mapping.new,
        reason: error.message,
      });
    }
  }

  return results;
}

async function printSummary(results) {
  console.log("\n" + "=".repeat(60));
  console.log("📊 MIGRATION SUMMARY");
  console.log("=".repeat(60));

  console.log(`\n   ✅ Success: ${results.success.length}`);
  console.log(`   ❌ Failed: ${results.failed.length}`);

  if (results.failed.length > 0) {
    console.log("\n⚠️  FAILED MIGRATIONS:");
    results.failed.forEach((f) => {
      console.log(`   - ${f.old}: ${f.reason}`);
    });
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ Migration complete!");
  console.log("=".repeat(60));
  console.log("\n📝 Note: Users can now login with their new shorter emails.");
  console.log("   Their passwords remain unchanged.\n");
}

async function main() {
  try {
    console.log("🔌 Connecting to database...");

    await sequelize.authenticate();
    console.log("✅ Database connected");

    const results = await migrateEmails();
    await printSummary(results);
  } catch (error) {
    console.error("\n❌ Migration failed:", error.message);
    process.exit(1);
  } finally {
    try {
      await sequelize.close();
    } catch (e) {}
    console.log("🔌 Database connection closed");
  }
}

main();
