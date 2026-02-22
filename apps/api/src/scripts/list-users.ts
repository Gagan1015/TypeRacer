import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(currentDir, "../../.env") });
dotenv.config({ path: path.resolve(currentDir, "../../../../.env") });

async function main() {
  await mongoose.connect(process.env.MONGO_URI!);
  const users = await mongoose.connection.db!.collection("users")
    .find({}, { projection: { username: 1, email: 1, role: 1 } })
    .toArray();
  console.log("\nRegistered users:");
  for (const u of users) {
    console.log(`  username: ${u.username}  |  email: ${u.email}  |  role: ${u.role}`);
  }
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
