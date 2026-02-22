import type { Request, Response } from "express";
import { loginSchema, ok, refreshSessionSchema, signupSchema } from "@typeracrer/shared";
import { getUserById, login, logout, refresh, signup } from "./auth.service.js";
import { HttpError } from "../../utils/http-error.js";
import { env } from "../../config/env.js";

const ACCESS_COOKIE = "accessToken";
const REFRESH_COOKIE = "refreshToken";

function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  const common = {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/"
  };

  res.cookie(ACCESS_COOKIE, accessToken, { ...common, maxAge: 15 * 60 * 1000 });
  res.cookie(REFRESH_COOKIE, refreshToken, { ...common, maxAge: 7 * 24 * 60 * 60 * 1000 });
}

function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { path: "/" });
  res.clearCookie(REFRESH_COOKIE, { path: "/" });
}

export async function signupHandler(req: Request, res: Response): Promise<void> {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid signup payload");
  }

  const result = await signup(parsed.data);
  setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
  res.status(201).json(ok({ user: result.user }));
}

export async function loginHandler(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid login payload");
  }

  const result = await login(parsed.data);
  setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
  res.status(200).json(ok({ user: result.user }));
}

export async function refreshHandler(req: Request, res: Response): Promise<void> {
  const cookieToken = req.cookies?.refreshToken;
  const bodyParsed = refreshSessionSchema.safeParse(req.body);
  const refreshToken = cookieToken ?? (bodyParsed.success ? bodyParsed.data.refreshToken : undefined);

  if (!refreshToken) {
    throw new HttpError(401, "INVALID_REFRESH_TOKEN", "Refresh token is required");
  }

  const result = await refresh(refreshToken);
  setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
  res.status(200).json(ok({ user: result.user }));
}

export async function logoutHandler(req: Request, res: Response): Promise<void> {
  const refreshToken = req.cookies?.refreshToken;
  if (typeof refreshToken === "string") {
    await logout(refreshToken);
  }

  clearAuthCookies(res);
  res.status(200).json(ok({ loggedOut: true }));
}

export async function meHandler(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new HttpError(401, "UNAUTHORIZED", "Authentication required");
  }

  const user = await getUserById(req.user.userId);
  res.status(200).json(ok({ user }));
}
