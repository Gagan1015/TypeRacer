import type { NextFunction, Request, Response } from "express";
import { fail } from "@typeracrer/shared";
import { verifyAccessToken } from "../utils/jwt.js";
import { UserModel } from "../db/models/user.model.js";

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

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = readBearerToken(req);
  if (!token) {
    res.status(401).json(fail("UNAUTHORIZED", "Authentication required"));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await UserModel.findById(payload.sub).select({ role: 1, isBanned: 1 }).lean();
    if (!user) {
      res.status(401).json(fail("UNAUTHORIZED", "User not found"));
      return;
    }
    if (user.isBanned) {
      res.status(403).json(fail("ACCOUNT_BANNED", "Account is banned"));
      return;
    }

    req.user = { userId: payload.sub, role: user.role };
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
