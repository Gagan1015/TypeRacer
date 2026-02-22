import { Router, type Router as RouterType } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import {
  createTypingAttemptHandler,
  getRaceTextHandler,
  getUserAttemptsHandler,
  getUserStatsHandler
} from "./race.controller.js";

export const raceRouter: RouterType = Router();

raceRouter.get("/text", getRaceTextHandler);
raceRouter.post("/attempts", requireAuth, createTypingAttemptHandler);
raceRouter.get("/attempts/me", requireAuth, getUserAttemptsHandler);
raceRouter.get("/stats/me", requireAuth, getUserStatsHandler);
