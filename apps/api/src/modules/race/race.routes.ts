import rateLimit from "express-rate-limit";
import { fail } from "@typeracrer/shared";
import { Router, type Request, type Router as RouterType } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { verifyAccessToken } from "../../utils/jwt.js";
import {
  createTypingAttemptHandler,
  getRaceTextHandler,
  getUserAttemptsHandler,
  getUserStatsHandler
} from "./race.controller.js";

export const raceRouter: RouterType = Router();

function queryValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  return [];
}

function hasNonDefaultOptions(req: Request): boolean {
  const themes = queryValues(req.query.themes).map((value) => value.toLowerCase());
  const hasCustomThemes = themes.length > 0 && !(themes.length === 1 && themes[0] === "random");

  const characterProfile = queryValues(req.query.characterProfile)[0]?.toLowerCase();
  const difficulty = queryValues(req.query.difficulty)[0]?.toLowerCase();
  const hasCustomCharacterProfile = typeof characterProfile === "string" && characterProfile !== "letters";
  const hasCustomDifficulty = typeof difficulty === "string" && difficulty !== "normal";

  return hasCustomThemes || hasCustomCharacterProfile || hasCustomDifficulty;
}

function readAccessToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length);
  }

  if (typeof req.cookies?.accessToken === "string") {
    return req.cookies.accessToken;
  }

  return null;
}

const raceTextCustomOptionsLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !hasNonDefaultOptions(req),
  keyGenerator: (req) => {
    const token = readAccessToken(req);
    if (token) {
      try {
        const payload = verifyAccessToken(token);
        return `user:${payload.sub}`;
      } catch {
        // Fall through to IP key for invalid/expired tokens.
      }
    }

    return `ip:${req.ip ?? "unknown"}`;
  },
  handler: (_req, res) => {
    res.status(429).json(fail("RATE_LIMITED", "Too many custom text generation requests. Try again in a minute."));
  }
});

raceRouter.get("/text", raceTextCustomOptionsLimiter, getRaceTextHandler);
raceRouter.post("/attempts", requireAuth, createTypingAttemptHandler);
raceRouter.get("/attempts/me", requireAuth, getUserAttemptsHandler);
raceRouter.get("/stats/me", requireAuth, getUserStatsHandler);
