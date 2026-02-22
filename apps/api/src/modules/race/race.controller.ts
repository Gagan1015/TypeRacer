import type { Request, Response } from "express";
import { attemptsQuerySchema, createTypingAttemptSchema, ok, raceTextQuerySchema } from "@typeracrer/shared";
import { HttpError } from "../../utils/http-error.js";
import { createTypingAttempt, getRaceText, getUserAttempts, getUserRaceStats } from "./race.service.js";

function requireUserId(req: Request): string {
  if (!req.user?.userId) {
    throw new HttpError(401, "UNAUTHORIZED", "Authentication required");
  }
  return req.user.userId;
}

export function getRaceTextHandler(req: Request, res: Response): void {
  const parsed = raceTextQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid mode query");
  }

  const text = getRaceText(parsed.data.mode, parsed.data.durationMs);
  res.status(200).json(ok({ text }));
}

export async function createTypingAttemptHandler(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const parsed = createTypingAttemptSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid attempt payload");
  }

  const attempt = await createTypingAttempt(userId, parsed.data);
  res.status(201).json(ok({ attempt }));
}

export async function getUserAttemptsHandler(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const parsed = attemptsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid attempts query");
  }

  const attempts = await getUserAttempts(userId, parsed.data.limit);
  res.status(200).json(ok({ attempts }));
}

export async function getUserStatsHandler(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const stats = await getUserRaceStats(userId);
  res.status(200).json(ok({ stats }));
}
