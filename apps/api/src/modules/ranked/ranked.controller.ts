import type { Request, Response } from "express";
import { rankedHistoryQuerySchema, rankedLeaderboardQuerySchema, seasonIdSchema, ok } from "@typeracrer/shared";
import { HttpError } from "../../utils/http-error.js";
import { getRankedLeaderboard, getUserRankedHistory, getUserRankedProfile } from "./ranked.service.js";

function requireUserId(req: Request): string {
  if (!req.user?.userId) {
    throw new HttpError(401, "UNAUTHORIZED", "Authentication required");
  }
  return req.user.userId;
}

export async function getRankedLeaderboardHandler(req: Request, res: Response): Promise<void> {
  const parsed = rankedLeaderboardQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid ranked leaderboard query");
  }

  const query: { scope: "global" | "seasonal"; seasonId?: string; limit: number } = {
    scope: parsed.data.scope,
    limit: parsed.data.limit
  };
  if (parsed.data.seasonId !== undefined) {
    query.seasonId = parsed.data.seasonId;
  }

  const leaderboard = await getRankedLeaderboard(query);

  res.status(200).json(ok({ leaderboard }));
}

export async function getMyRankedProfileHandler(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const parsedSeasonId = seasonIdSchema.optional().safeParse(req.query.seasonId);
  if (!parsedSeasonId.success) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid season id");
  }

  const profile = await getUserRankedProfile(userId, parsedSeasonId.data);
  res.status(200).json(ok({ profile }));
}

export async function getMyRankedHistoryHandler(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const parsed = rankedHistoryQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid ranked history query");
  }

  const matches = await getUserRankedHistory(userId, parsed.data.limit);
  res.status(200).json(ok({ matches }));
}
