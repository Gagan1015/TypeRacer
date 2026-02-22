import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { ProfileModel } from "../../db/models/profile.model.js";
import { RaceTextModel } from "../../db/models/race-text.model.js";
import { TypingAttemptModel } from "../../db/models/typing-attempt.model.js";
import { UserModel } from "../../db/models/user.model.js";
import { ModerationAuditLogModel } from "../../db/models/moderation-audit-log.model.js";
import { ModerationReportModel } from "../../db/models/moderation-report.model.js";
import { HttpError } from "../../utils/http-error.js";
import type { AntiCheatReason } from "../anti-cheat/anti-cheat.rules.js";
import { isValidReportTransition, type ReportStatus } from "./moderation.transitions.js";

function toObjectId(value: string): mongoose.Types.ObjectId {
  if (!mongoose.isValidObjectId(value)) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid identifier");
  }
  return new mongoose.Types.ObjectId(value);
}

function toDateString(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function isDuplicateKeyError(error: unknown): error is { code: number } {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: unknown }).code === 11000;
}

async function writeAuditLog(input: {
  actorUserId: string;
  action: string;
  entityType: "report" | "user" | "text";
  entityId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await ModerationAuditLogModel.create({
    actorUserId: toObjectId(input.actorUserId),
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata ?? {}
  });
}

function summarizeReasons(reasons: AntiCheatReason[]): string {
  if (reasons.length === 0) {
    return "Suspicious attempt flagged by anti-cheat";
  }
  const first = reasons[0];
  if (!first) {
    return "Suspicious attempt flagged by anti-cheat";
  }
  return first.message;
}

export async function createSystemReportForSuspiciousAttempt(input: {
  attemptId: string;
  suspectUserId: string;
  reasons: AntiCheatReason[];
  mode: string;
  wpm: number;
  accuracy: number;
}): Promise<void> {
  const attemptObjectId = toObjectId(input.attemptId);
  const suspectObjectId = toObjectId(input.suspectUserId);

  await ModerationReportModel.updateOne(
    { attemptId: attemptObjectId },
    {
      $setOnInsert: {
        source: "system",
        targetType: "typing_attempt",
        targetId: input.attemptId,
        suspectUserId: suspectObjectId,
        attemptId: attemptObjectId
      },
      $set: {
        status: "open",
        reasons: input.reasons,
        summary: summarizeReasons(input.reasons),
        detail: `Mode=${input.mode}, WPM=${input.wpm}, Accuracy=${input.accuracy}`
      }
    },
    { upsert: true }
  );
}

export async function listAdminUsers(input: { query?: string; limit: number }): Promise<{
  users: Array<{
    id: string;
    email: string;
    username: string;
    role: "user" | "admin";
    isBanned: boolean;
    banReason: string | null;
    createdAt: string;
    sessionsCount: number;
  }>;
}> {
  const filter: mongoose.FilterQuery<unknown> = {};
  if (input.query) {
    const safe = input.query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [{ email: { $regex: safe, $options: "i" } }, { username: { $regex: safe, $options: "i" } }];
  }

  const users = await UserModel.find(filter).sort({ createdAt: -1 }).limit(input.limit).lean();
  return {
    users: users.map((user) => ({
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      role: user.role,
      isBanned: user.isBanned ?? false,
      banReason: user.banReason ?? null,
      createdAt: user.createdAt.toISOString(),
      sessionsCount: user.sessions.length
    }))
  };
}

export async function getAdminUserDetail(userId: string): Promise<{
  user: {
    id: string;
    email: string;
    username: string;
    role: "user" | "admin";
    isBanned: boolean;
    banReason: string | null;
    bannedAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
  profile: {
    displayName: string;
    bio: string;
    avatarUrl: string;
    keyboardLayout: "qwerty" | "dvorak" | "colemak";
  } | null;
  moderation: {
    attemptsCount: number;
    suspiciousAttemptsCount: number;
    openReportsCount: number;
  };
}> {
  const userObjectId = toObjectId(userId);
  const [user, profile, attemptsCount, suspiciousAttemptsCount, openReportsCount] = await Promise.all([
    UserModel.findById(userObjectId).lean(),
    ProfileModel.findOne({ userId: userObjectId }).lean(),
    TypingAttemptModel.countDocuments({ userId: userObjectId }),
    TypingAttemptModel.countDocuments({ userId: userObjectId, "antiCheat.flagged": true }),
    ModerationReportModel.countDocuments({ suspectUserId: userObjectId, status: { $in: ["open", "in_review"] } })
  ]);

  if (!user) {
    throw new HttpError(404, "USER_NOT_FOUND", "User not found");
  }

  return {
    user: {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      role: user.role,
      isBanned: user.isBanned ?? false,
      banReason: user.banReason ?? null,
      bannedAt: toDateString(user.bannedAt),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    },
    profile: profile
      ? {
          displayName: profile.displayName,
          bio: profile.bio,
          avatarUrl: profile.avatarUrl,
          keyboardLayout: profile.keyboardLayout
        }
      : null,
    moderation: {
      attemptsCount,
      suspiciousAttemptsCount,
      openReportsCount
    }
  };
}

export async function updateUserModerationState(input: {
  adminUserId: string;
  userId: string;
  isBanned: boolean;
  reason?: string;
}): Promise<{
  user: {
    id: string;
    isBanned: boolean;
    banReason: string | null;
    bannedAt: string | null;
  };
}> {
  const userObjectId = toObjectId(input.userId);
  const update: Record<string, unknown> = {
    isBanned: input.isBanned,
    banReason: input.isBanned ? input.reason?.trim() || "Moderation action" : null,
    bannedAt: input.isBanned ? new Date() : null
  };
  if (input.isBanned) {
    update.sessions = [];
  }

  const user = await UserModel.findByIdAndUpdate(userObjectId, { $set: update }, { new: true }).lean();
  if (!user) {
    throw new HttpError(404, "USER_NOT_FOUND", "User not found");
  }

  await writeAuditLog({
    actorUserId: input.adminUserId,
    action: input.isBanned ? "USER_BANNED" : "USER_UNBANNED",
    entityType: "user",
    entityId: user._id.toString(),
    metadata: {
      reason: user.banReason ?? null
    }
  });

  return {
    user: {
      id: user._id.toString(),
      isBanned: user.isBanned ?? false,
      banReason: user.banReason ?? null,
      bannedAt: toDateString(user.bannedAt)
    }
  };
}

function buildTextKey(content: string): string {
  const slug = content
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36);
  return `${slug || "text"}-${randomUUID().slice(0, 8)}`;
}

export async function listAdminTexts(input: {
  status: "active" | "inactive" | "all";
  limit: number;
}): Promise<{
  texts: Array<{
    id: string;
    key: string;
    content: string;
    language: string;
    isActive: boolean;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  }>;
}> {
  const filter: mongoose.FilterQuery<unknown> = {};
  if (input.status === "active") {
    filter.isActive = true;
  } else if (input.status === "inactive") {
    filter.isActive = false;
  }

  const texts = await RaceTextModel.find(filter).sort({ createdAt: -1 }).limit(input.limit).lean();
  return {
    texts: texts.map((text) => ({
      id: text._id.toString(),
      key: text.key,
      content: text.content,
      language: text.language,
      isActive: text.isActive,
      createdBy: text.createdBy.toString(),
      createdAt: text.createdAt.toISOString(),
      updatedAt: text.updatedAt.toISOString()
    }))
  };
}

export async function createAdminText(input: {
  adminUserId: string;
  content: string;
  language: string;
  key?: string;
}): Promise<{
  text: {
    id: string;
    key: string;
    content: string;
    language: string;
    isActive: boolean;
    createdAt: string;
  };
}> {
  const adminObjectId = toObjectId(input.adminUserId);
  const key = (input.key?.trim() || buildTextKey(input.content)).toLowerCase();

  const created = await RaceTextModel.create({
    key,
    content: input.content.trim(),
    language: input.language.trim().toLowerCase(),
    isActive: true,
    createdBy: adminObjectId
  }).catch((error: unknown) => {
    if (isDuplicateKeyError(error)) {
      throw new HttpError(409, "CONFLICT", "Text key already exists");
    }
    throw error;
  });

  await writeAuditLog({
    actorUserId: input.adminUserId,
    action: "TEXT_CREATED",
    entityType: "text",
    entityId: created._id.toString(),
    metadata: { key: created.key }
  });

  return {
    text: {
      id: created._id.toString(),
      key: created.key,
      content: created.content,
      language: created.language,
      isActive: created.isActive,
      createdAt: created.createdAt.toISOString()
    }
  };
}

export async function updateAdminText(input: {
  adminUserId: string;
  textId: string;
  content?: string;
  language?: string;
  isActive?: boolean;
}): Promise<{
  text: {
    id: string;
    key: string;
    content: string;
    language: string;
    isActive: boolean;
    updatedAt: string;
  };
}> {
  const textObjectId = toObjectId(input.textId);
  const update: Record<string, unknown> = {};
  if (input.content !== undefined) {
    update.content = input.content.trim();
  }
  if (input.language !== undefined) {
    update.language = input.language.trim().toLowerCase();
  }
  if (input.isActive !== undefined) {
    update.isActive = input.isActive;
  }

  const updated = await RaceTextModel.findByIdAndUpdate(textObjectId, { $set: update }, { new: true }).lean();
  if (!updated) {
    throw new HttpError(404, "TEXT_NOT_FOUND", "Text not found");
  }

  await writeAuditLog({
    actorUserId: input.adminUserId,
    action: "TEXT_UPDATED",
    entityType: "text",
    entityId: updated._id.toString(),
    metadata: {
      isActive: updated.isActive
    }
  });

  return {
    text: {
      id: updated._id.toString(),
      key: updated.key,
      content: updated.content,
      language: updated.language,
      isActive: updated.isActive,
      updatedAt: updated.updatedAt.toISOString()
    }
  };
}

export async function listModerationReports(input: {
  status: "open" | "in_review" | "resolved_cheat" | "resolved_clean" | "dismissed" | "all";
  limit: number;
}): Promise<{
  reports: Array<{
    id: string;
    source: "system" | "user" | "admin";
    status: ReportStatus;
    targetType: "typing_attempt" | "user" | "text";
    targetId: string;
    suspectUserId: string;
    summary: string;
    reasons: AntiCheatReason[];
    reviewedBy: string | null;
    reviewedAt: string | null;
    createdAt: string;
  }>;
}> {
  const filter: mongoose.FilterQuery<unknown> = {};
  if (input.status !== "all") {
    filter.status = input.status;
  }

  const reports = await ModerationReportModel.find(filter).sort({ createdAt: -1 }).limit(input.limit).lean();
  return {
    reports: reports.map((report) => ({
      id: report._id.toString(),
      source: report.source,
      status: report.status,
      targetType: report.targetType,
      targetId: report.targetId,
      suspectUserId: report.suspectUserId.toString(),
      summary: report.summary,
      reasons: report.reasons as AntiCheatReason[],
      reviewedBy: report.reviewedBy ? report.reviewedBy.toString() : null,
      reviewedAt: toDateString(report.reviewedAt),
      createdAt: report.createdAt.toISOString()
    }))
  };
}

export async function getModerationReportDetail(reportId: string): Promise<{
  report: {
    id: string;
    source: "system" | "user" | "admin";
    status: ReportStatus;
    targetType: "typing_attempt" | "user" | "text";
    targetId: string;
    suspectUserId: string;
    summary: string;
    detail: string;
    reasons: AntiCheatReason[];
    reviewNote: string;
    reviewedBy: string | null;
    reviewedAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
}> {
  const reportObjectId = toObjectId(reportId);
  const report = await ModerationReportModel.findById(reportObjectId).lean();
  if (!report) {
    throw new HttpError(404, "REPORT_NOT_FOUND", "Report not found");
  }

  return {
    report: {
      id: report._id.toString(),
      source: report.source,
      status: report.status,
      targetType: report.targetType,
      targetId: report.targetId,
      suspectUserId: report.suspectUserId.toString(),
      summary: report.summary,
      detail: report.detail,
      reasons: report.reasons as AntiCheatReason[],
      reviewNote: report.reviewNote,
      reviewedBy: report.reviewedBy ? report.reviewedBy.toString() : null,
      reviewedAt: toDateString(report.reviewedAt),
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString()
    }
  };
}

export async function reviewModerationReport(input: {
  adminUserId: string;
  reportId: string;
  status: ReportStatus;
  note: string;
}): Promise<{
  report: {
    id: string;
    status: ReportStatus;
    reviewedBy: string | null;
    reviewedAt: string | null;
    reviewNote: string;
  };
}> {
  const reportObjectId = toObjectId(input.reportId);
  const report = await ModerationReportModel.findById(reportObjectId);
  if (!report) {
    throw new HttpError(404, "REPORT_NOT_FOUND", "Report not found");
  }

  if (!isValidReportTransition(report.status, input.status)) {
    throw new HttpError(409, "INVALID_STATE", "Invalid report status transition");
  }

  report.set({
    status: input.status,
    reviewNote: input.note.trim(),
    reviewedBy: toObjectId(input.adminUserId),
    reviewedAt: new Date()
  });
  await report.save();

  if (report.attemptId) {
    if (input.status === "resolved_cheat") {
      await TypingAttemptModel.updateOne(
        { _id: report.attemptId },
        {
          $set: {
            "antiCheat.flagged": true,
            "antiCheat.reviewStatus": "confirmed_cheat",
            "antiCheat.reviewedBy": toObjectId(input.adminUserId),
            "antiCheat.reviewedAt": new Date()
          }
        }
      );
    } else if (input.status === "resolved_clean" || input.status === "dismissed") {
      await TypingAttemptModel.updateOne(
        { _id: report.attemptId },
        {
          $set: {
            "antiCheat.flagged": false,
            "antiCheat.reviewStatus": "cleared",
            "antiCheat.reviewedBy": toObjectId(input.adminUserId),
            "antiCheat.reviewedAt": new Date()
          }
        }
      );
    } else if (input.status === "in_review") {
      await TypingAttemptModel.updateOne(
        { _id: report.attemptId },
        {
          $set: {
            "antiCheat.reviewStatus": "pending"
          }
        }
      );
    }
  }

  await writeAuditLog({
    actorUserId: input.adminUserId,
    action: "REPORT_REVIEWED",
    entityType: "report",
    entityId: report._id.toString(),
    metadata: {
      status: input.status
    }
  });

  return {
    report: {
      id: report._id.toString(),
      status: report.status,
      reviewedBy: report.reviewedBy ? report.reviewedBy.toString() : null,
      reviewedAt: toDateString(report.reviewedAt),
      reviewNote: report.reviewNote
    }
  };
}

export async function listModerationAuditLogs(input: {
  limit: number;
  entityType?: "report" | "user" | "text";
  entityId?: string;
}): Promise<{
  logs: Array<{
    id: string;
    actorUserId: string;
    action: string;
    entityType: "report" | "user" | "text";
    entityId: string;
    metadata: Record<string, unknown>;
    createdAt: string;
  }>;
}> {
  const filter: mongoose.FilterQuery<unknown> = {};
  if (input.entityType !== undefined) {
    filter.entityType = input.entityType;
  }
  if (input.entityId !== undefined) {
    filter.entityId = input.entityId;
  }

  const logs = await ModerationAuditLogModel.find(filter).sort({ createdAt: -1 }).limit(input.limit).lean();
  return {
    logs: logs.map((log) => ({
      id: log._id.toString(),
      actorUserId: log.actorUserId.toString(),
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      metadata: (log.metadata ?? {}) as Record<string, unknown>,
      createdAt: log.createdAt.toISOString()
    }))
  };
}
