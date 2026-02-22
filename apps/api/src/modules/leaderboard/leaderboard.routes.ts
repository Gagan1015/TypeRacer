import { Router, type Router as RouterType } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import {
  enqueueLeaderboardRecomputeHandler,
  getCurrentLeaderboardSeasonHandler,
  getGlobalTypingLeaderboardHandler,
  getLeaderboardSeasonByIdHandler,
  getSeasonalTypingLeaderboardHandler
} from "./leaderboard.controller.js";

export const leaderboardRouter: RouterType = Router();

leaderboardRouter.get("/typing/global", getGlobalTypingLeaderboardHandler);
leaderboardRouter.get("/typing/seasonal", getSeasonalTypingLeaderboardHandler);
leaderboardRouter.get("/seasons/current", getCurrentLeaderboardSeasonHandler);
leaderboardRouter.get("/seasons/:seasonId", getLeaderboardSeasonByIdHandler);
leaderboardRouter.post("/recompute", requireAuth, requireRole("admin"), enqueueLeaderboardRecomputeHandler);
