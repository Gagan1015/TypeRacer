import { Router, type Router as RouterType } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { getMyRankedHistoryHandler, getMyRankedProfileHandler, getRankedLeaderboardHandler } from "./ranked.controller.js";

export const rankedRouter: RouterType = Router();

rankedRouter.get("/leaderboard", getRankedLeaderboardHandler);
rankedRouter.get("/me", requireAuth, getMyRankedProfileHandler);
rankedRouter.get("/history/me", requireAuth, getMyRankedHistoryHandler);
