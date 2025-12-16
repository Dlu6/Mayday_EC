/**
 * Email Migration Script
 * Updates counsellor emails in both MongoDB (datatool) and SQL (main server) databases
 * Preserves passwords and maintains data integrity
 * 
 * Usage: node scripts/migrate-emails.js
 */

import mongoose from "mongoose";
import sequelize from "../config/sequelize.js";
import UserModel from "../models/UsersModel.js";
import User from "../../datatool_server/models/datatoolUsersModel.js";
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

async function migrateEmails(mongodbOnly = false, sqlOnly = false) {
  const results = {
    mongodb: { success: [], failed: [] },
    sql: { success: [], failed: [] },
  };

  console.log("\n📧 Starting email migration...\n");

  for (const mapping of EMAIL_MAPPINGS) {
    console.log(`\n🔄 Processing: ${mapping.old} → ${mapping.new}`);

    // 1. Update MongoDB (datatool users) - skip if sqlOnly
    if (!sqlOnly) {
      try {
        const mongoUser = await User.findOne({ email: mapping.old });
        
        if (mongoUser) {
          // Check if new email already exists
          const existingNew = await User.findOne({ email: mapping.new });
          if (existingNew && existingNew._id.toString() !== mongoUser._id.toString()) {
            throw new Error(`New email ${mapping.new} already exists in MongoDB`);
          }

          await User.updateOne(
            { email: mapping.old },
            { $set: { email: mapping.new } }
          );
          console.log(`   ✅ MongoDB: Updated (ID: ${mongoUser._id})`);
          results.mongodb.success.push({
            old: mapping.old,
            new: mapping.new,
            id: mongoUser._id.toString(),
          });
        } else {
          console.log(`   ⚠️  MongoDB: User not found`);
          results.mongodb.failed.push({
            old: mapping.old,
            new: mapping.new,
            reason: "User not found",
          });
        }
      } catch (error) {
        console.log(`   ❌ MongoDB: ${error.message}`);
        results.mongodb.failed.push({
          old: mapping.old,
          new: mapping.new,
          reason: error.message,
        });
      }
    } else {
      console.log(`   ⏭️  MongoDB: Skipped (--sql-only flag)`);
    }

    // 2. Update SQL (main server users) - skip if mongodbOnly
    if (!mongodbOnly) {
      try {
        const sqlUser = await UserModel.findOne({ where: { email: mapping.old } });
        
        if (sqlUser) {
          // Check if new email already exists
          const existingNew = await UserModel.findOne({ where: { email: mapping.new } });
          if (existingNew && existingNew.id !== sqlUser.id) {
            throw new Error(`New email ${mapping.new} already exists in SQL`);
          }

          await UserModel.update(
            { email: mapping.new },
            { where: { email: mapping.old } }
          );
          console.log(`   ✅ SQL: Updated (ID: ${sqlUser.id}, Extension: ${sqlUser.extension})`);
          results.sql.success.push({
            old: mapping.old,
            new: mapping.new,
            id: sqlUser.id,
            extension: sqlUser.extension,
          });
        } else {
          console.log(`   ⚠️  SQL: User not found`);
          results.sql.failed.push({
            old: mapping.old,
            new: mapping.new,
            reason: "User not found",
          });
        }
      } catch (error) {
        console.log(`   ❌ SQL: ${error.message}`);
        results.sql.failed.push({
          old: mapping.old,
          new: mapping.new,
          reason: error.message,
        });
      }
    } else {
      console.log(`   ⏭️  SQL: Skipped (--mongodb-only flag)`);
    }
  }

  return results;
}

async function printSummary(results) {
  console.log("\n" + "=".repeat(60));
  console.log("📊 MIGRATION SUMMARY");
  console.log("=".repeat(60));

  console.log("\n🍃 MongoDB (Datatool Users):");
  console.log(`   ✅ Success: ${results.mongodb.success.length}`);
  console.log(`   ❌ Failed: ${results.mongodb.failed.length}`);

  console.log("\n🐘 SQL (Main Server Users):");
  console.log(`   ✅ Success: ${results.sql.success.length}`);
  console.log(`   ❌ Failed: ${results.sql.failed.length}`);

  if (results.mongodb.failed.length > 0 || results.sql.failed.length > 0) {
    console.log("\n⚠️  FAILED MIGRATIONS:");
    
    if (results.mongodb.failed.length > 0) {
      console.log("\n   MongoDB failures:");
      results.mongodb.failed.forEach((f) => {
        console.log(`   - ${f.old}: ${f.reason}`);
      });
    }
    
    if (results.sql.failed.length > 0) {
      console.log("\n   SQL failures:");
      results.sql.failed.forEach((f) => {
        console.log(`   - ${f.old}: ${f.reason}`);
      });
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ Migration complete!");
  console.log("=".repeat(60));
  console.log("\n📝 Note: Users can now login with their new shorter emails.");
  console.log("   Their passwords remain unchanged.\n");
}

// Parse command line arguments
const args = process.argv.slice(2);
const MONGODB_ONLY = args.includes("--mongodb-only");
const SQL_ONLY = args.includes("--sql-only");

async function main() {
  try {
    console.log("🔌 Connecting to databases...");

    // Connect to MongoDB (unless SQL only)
    if (!SQL_ONLY) {
      const mongoUri = process.env.MONGODB_URI;
      if (!mongoUri) {
        throw new Error("MONGODB_URI environment variable is not set");
      }
      await mongoose.connect(mongoUri);
      console.log("✅ MongoDB connected");
    }

    // Connect to SQL (unless MongoDB only)
    if (!MONGODB_ONLY) {
      try {
        await sequelize.authenticate();
        console.log("✅ SQL database connected");
      } catch (sqlError) {
        if (MONGODB_ONLY) {
          console.log("⚠️  SQL connection skipped (--mongodb-only flag)");
        } else {
          console.log(`⚠️  SQL connection failed: ${sqlError.message}`);
          console.log("   Run with --mongodb-only to skip SQL migration");
          if (!SQL_ONLY) {
            console.log("   Continuing with MongoDB-only migration...\n");
          }
        }
      }
    }

    const results = await migrateEmails(MONGODB_ONLY, SQL_ONLY);
    await printSummary(results);
  } catch (error) {
    console.error("\n❌ Migration failed:", error.message);
    process.exit(1);
  } finally {
    // Close connections
    try {
      await mongoose.disconnect();
    } catch (e) {}
    try {
      await sequelize.close();
    } catch (e) {}
    console.log("🔌 Database connections closed");
  }
}

main();
