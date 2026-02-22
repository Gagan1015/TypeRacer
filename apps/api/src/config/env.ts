import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const apiRootEnvPath = path.resolve(currentDir, "../../.env");
const workspaceRootEnvPath = path.resolve(currentDir, "../../../../.env");

dotenv.config({ path: apiRootEnvPath });
dotenv.config({ path: workspaceRootEnvPath });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  MONGO_URI: z.string().min(1),
  API_PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  ACCESS_TOKEN_SECRET: z.string().min(32),
  REFRESH_TOKEN_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL: z.string().default("7d")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment config", parsed.error.flatten().fieldErrors);
  console.error(
    `Checked .env paths:\n- ${apiRootEnvPath}\n- ${workspaceRootEnvPath}\nCopy .env.example to one of these locations.`
  );
  process.exit(1);
}

export const env = parsed.data;
