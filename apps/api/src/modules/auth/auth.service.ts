import argon2 from "argon2";
import { randomUUID } from "node:crypto";
import { type LoginInput, type SignupInput } from "@typeracrer/shared";
import { UserModel } from "../../db/models/user.model.js";
import { ProfileModel } from "../../db/models/profile.model.js";
import { env } from "../../config/env.js";
import { HttpError } from "../../utils/http-error.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt.js";

type SessionTokens = {
  accessToken: string;
  refreshToken: string;
};

type AuthUser = {
  id: string;
  email: string;
  username: string;
  role: "user" | "admin";
};

function sessionExpiresAt(): Date {
  const ttl = parseDurationMs(env.REFRESH_TOKEN_TTL);
  return new Date(Date.now() + ttl);
}

function parseDurationMs(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) {
    return 7 * 24 * 60 * 60 * 1000;
  }

  const amountPart = match[1];
  const unitPart = match[2];
  if (!amountPart || !unitPart) {
    return 7 * 24 * 60 * 60 * 1000;
  }

  const amount = Number(amountPart);
  const unit = unitPart;
  const multiplier =
    unit === "s"
      ? 1000
      : unit === "m"
        ? 60 * 1000
        : unit === "h"
          ? 60 * 60 * 1000
          : 24 * 60 * 60 * 1000;

  return amount * multiplier;
}

function publicUser(user: {
  _id: { toString: () => string };
  email: string;
  username: string;
  role: "user" | "admin";
}): AuthUser {
  return {
    id: user._id.toString(),
    email: user.email,
    username: user.username,
    role: user.role
  };
}

async function createSessionForUser(userId: string, role: "user" | "admin"): Promise<SessionTokens> {
  const sid = randomUUID();
  const accessToken = signAccessToken({ sub: userId, role });
  const refreshToken = signRefreshToken({ sub: userId, sid });

  await UserModel.updateOne(
    { _id: userId },
    { $push: { sessions: { sid, expiresAt: sessionExpiresAt() } } }
  );

  return { accessToken, refreshToken };
}

export async function signup(input: SignupInput): Promise<{ user: AuthUser; tokens: SessionTokens }> {
  const existing = await UserModel.findOne({
    $or: [{ email: input.email }, { username: input.username }]
  });

  if (existing) {
    throw new HttpError(409, "CONFLICT", "Email or username already exists");
  }

  const passwordHash = await argon2.hash(input.password);
  const user = await UserModel.create({
    email: input.email,
    username: input.username,
    passwordHash,
    role: "user",
    sessions: []
  });

  await ProfileModel.create({
    userId: user._id,
    displayName: input.username,
    bio: "",
    avatarUrl: "",
    keyboardLayout: "qwerty"
  });

  const tokens = await createSessionForUser(user._id.toString(), user.role);
  return { user: publicUser(user), tokens };
}

export async function login(input: LoginInput): Promise<{ user: AuthUser; tokens: SessionTokens }> {
  const user = await UserModel.findOne({ email: input.email });
  if (!user) {
    throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }
  if (user.isBanned) {
    throw new HttpError(403, "ACCOUNT_BANNED", "Account is banned");
  }

  const passwordOk = await argon2.verify(user.passwordHash, input.password);
  if (!passwordOk) {
    throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  const tokens = await createSessionForUser(user._id.toString(), user.role);
  return { user: publicUser(user), tokens };
}

export async function refresh(refreshToken: string): Promise<{ user: AuthUser; tokens: SessionTokens }> {
  let payload: { sub: string; sid: string };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new HttpError(401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid");
  }

  const user = await UserModel.findById(payload.sub);
  if (!user) {
    throw new HttpError(401, "INVALID_REFRESH_TOKEN", "Session no longer exists");
  }
  if (user.isBanned) {
    user.set("sessions", []);
    await user.save();
    throw new HttpError(403, "ACCOUNT_BANNED", "Account is banned");
  }

  const hasSession = user.sessions.some((session) => session.sid === payload.sid);
  if (!hasSession) {
    throw new HttpError(401, "INVALID_REFRESH_TOKEN", "Session no longer exists");
  }

  const activeSessions = user.sessions
    .filter((session) => session.sid !== payload.sid && session.expiresAt > new Date())
    .map((session) => ({
      sid: session.sid,
      expiresAt: session.expiresAt
    }));
  user.set("sessions", activeSessions);
  await user.save();

  const tokens = await createSessionForUser(user._id.toString(), user.role);
  return { user: publicUser(user), tokens };
}

export async function logout(refreshToken: string): Promise<void> {
  try {
    const payload = verifyRefreshToken(refreshToken);
    await UserModel.updateOne(
      { _id: payload.sub },
      { $pull: { sessions: { sid: payload.sid } } }
    );
  } catch {
    return;
  }
}

export async function getUserById(userId: string): Promise<AuthUser> {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new HttpError(404, "USER_NOT_FOUND", "User not found");
  }

  return publicUser(user);
}
