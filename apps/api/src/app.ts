import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { profileRouter } from "./modules/profile/profile.routes.js";
import { adminRouter } from "./modules/admin/admin.routes.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { raceRouter } from "./modules/race/race.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";

export function createApp(): Express {
  const app = express();

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true
    })
  );

  app.use(helmet());
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 300,
      standardHeaders: true,
      legacyHeaders: false
    })
  );
  app.use((req, _res, next) => {
    if (env.NODE_ENV !== "test") {
      console.info(`[API] ${req.method} ${req.originalUrl}`);
    }
    next();
  });

  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/profile", profileRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/race", raceRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
