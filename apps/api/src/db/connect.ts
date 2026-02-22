import mongoose from "mongoose";
import { env } from "../config/env.js";

export async function connectDatabase(): Promise<void> {
  await mongoose.connect(env.MONGO_URI);
}

