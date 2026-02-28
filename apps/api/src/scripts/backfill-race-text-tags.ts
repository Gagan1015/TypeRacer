import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RaceTextModel } from "../db/models/race-text.model.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(currentDir, "../../.env") });
dotenv.config({ path: path.resolve(currentDir, "../../../../.env") });

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("MONGO_URI not found in .env");
  process.exit(1);
}

async function main(): Promise<void> {
  await mongoose.connect(MONGO_URI!);

  const filter = {
    $or: [
      { themes: { $exists: false } },
      { themes: null },
      { themes: { $size: 0 } },
      { characterProfile: { $exists: false } },
      { characterProfile: null }
    ]
  };

  const cursor = RaceTextModel.find(filter).select({ themes: 1, characterProfile: 1 }).cursor();
  let scanned = 0;
  let updated = 0;

  for await (const text of cursor) {
    scanned += 1;
    const update: Record<string, unknown> = {};

    if (!Array.isArray(text.themes) || text.themes.length === 0) {
      update.themes = ["general"];
    }
    if (!text.characterProfile) {
      update.characterProfile = "letters";
    }

    if (Object.keys(update).length === 0) {
      continue;
    }

    await RaceTextModel.updateOne({ _id: text._id }, { $set: update });
    updated += 1;
  }

  console.info("[backfill-race-text-tags] complete", { scanned, updated });
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("[backfill-race-text-tags] failed", error);
  process.exit(1);
});
