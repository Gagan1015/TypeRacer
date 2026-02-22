import http from "node:http";
import pino from "pino";
import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { connectDatabase } from "./db/connect.js";
import { createSocketServer } from "./sockets/index.js";

const logger = pino({ level: env.NODE_ENV === "production" ? "info" : "debug" });

async function bootstrap(): Promise<void> {
  await connectDatabase();

  const app = createApp();
  const server = http.createServer(app);
  createSocketServer(server);

  server.listen(env.API_PORT, () => {
    logger.info(`API listening on http://localhost:${env.API_PORT}`);
  });
}

bootstrap().catch((error) => {
  logger.error(error, "Failed to start API server");
  process.exit(1);
});

