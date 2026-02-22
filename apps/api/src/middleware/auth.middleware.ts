import type { NextFunction, Request, Response } from "express";
import { fail } from "@typeracrer/shared";
import { verifyAccessToken } from "../utils/jwt.js";

function readBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length);
  }

  if (typeof req.cookies?.accessToken === "string") {
    return req.cookies.accessToken;
  }

  return null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = readBearerToken(req);
  if (!token) {
    res.status(401).json(fail("UNAUTHORIZED", "Authentication required"));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { userId: payload.sub, role: payload.role };
    next();
  } catch {
    res.status(401).json(fail("UNAUTHORIZED", "Invalid access token"));
  }
}

export function requireRole(role: "admin") {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || req.user.role !== role) {
      res.status(403).json(fail("FORBIDDEN", "Insufficient permissions"));
      return;
    }
    next();
  };
}

