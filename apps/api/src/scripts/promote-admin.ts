/**
 * Promote a user to admin role.
 *
 * Usage:
 *   pnpm --filter @typeracrer/api promote-admin <username>
 *
 * Example:
 *   pnpm --filter @typeracrer/api promote-admin johndoe
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(currentDir, "../../.env") });
dotenv.config({ path: path.resolve(currentDir, "../../../../.env") });

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("❌ MONGO_URI not found in .env");
  process.exit(1);
}

const username = process.argv[2];
if (!username) {
  console.error("❌ Usage: pnpm --filter @typeracrer/api promote-admin <username>");
  process.exit(1);
}

async function main() {
  await mongoose.connect(MONGO_URI!);
  console.log("Connected to MongoDB");

  const result = await mongoose.connection.db!.collection("users").findOneAndUpdate(
    { username },
    { $set: { role: "admin" } },
    { returnDocument: "after" }
  );

  if (!result) {
    console.error(`❌ User "${username}" not found`);
    process.exit(1);
  }

  console.log(`✅ User "${username}" promoted to admin`);
  console.log(`   email: ${result.email}`);
  console.log(`   role:  ${result.role}`);
  console.log("\n⚠️  Log out and log back in for changes to take effect.");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
