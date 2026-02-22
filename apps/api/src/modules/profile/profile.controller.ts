import type { Request, Response } from "express";
import { ok, profileUpdateSchema } from "@typeracrer/shared";
import { ProfileModel } from "../../db/models/profile.model.js";
import { HttpError } from "../../utils/http-error.js";

function requireUserId(req: Request): string {
  if (!req.user?.userId) {
    throw new HttpError(401, "UNAUTHORIZED", "Authentication required");
  }
  return req.user.userId;
}

export async function getMyProfileHandler(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const profile = await ProfileModel.findOne({ userId }).lean();

  if (!profile) {
    throw new HttpError(404, "PROFILE_NOT_FOUND", "Profile not found");
  }

  res.status(200).json(
    ok({
      profile: {
        userId: profile.userId.toString(),
        displayName: profile.displayName,
        bio: profile.bio,
        avatarUrl: profile.avatarUrl,
        keyboardLayout: profile.keyboardLayout
      }
    })
  );
}

export async function updateMyProfileHandler(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const parsed = profileUpdateSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid profile payload");
  }

  const profile = await ProfileModel.findOneAndUpdate(
    { userId },
    { $set: parsed.data },
    { new: true, runValidators: true }
  ).lean();

  if (!profile) {
    throw new HttpError(404, "PROFILE_NOT_FOUND", "Profile not found");
  }

  res.status(200).json(
    ok({
      profile: {
        userId: profile.userId.toString(),
        displayName: profile.displayName,
        bio: profile.bio,
        avatarUrl: profile.avatarUrl,
        keyboardLayout: profile.keyboardLayout
      }
    })
  );
}

