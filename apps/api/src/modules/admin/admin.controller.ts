import type { Request, Response } from "express";
import { ok } from "@typeracrer/shared";
import { HttpError } from "../../utils/http-error.js";
import {
  createAdminText,
  getAdminUserDetail,
  getModerationReportDetail,
  listAdminTexts,
  listAdminUsers,
  listModerationAuditLogs,
  listModerationReports,
  reviewModerationReport,
  updateAdminText,
  updateUserModerationState
} from "./admin.service.js";
import {
  adminAuditLogsQuerySchema,
  adminCreateTextSchema,
  adminReportsQuerySchema,
  adminReviewReportSchema,
  adminTextsQuerySchema,
  adminUpdateTextSchema,
  adminUserModerationSchema,
  adminUsersQuerySchema
} from "./admin.schemas.js";

function requireUserId(req: Request): string {
  if (!req.user?.userId) {
    throw new HttpError(401, "UNAUTHORIZED", "Authentication required");
  }
  return req.user.userId;
}

function requireRouteParam(value: string | string[] | undefined, key: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new HttpError(400, "VALIDATION_ERROR", `Missing ${key}`);
  }
  return value;
}

export async function listAdminUsersHandler(req: Request, res: Response): Promise<void> {
  const parsed = adminUsersQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid users query");
  }

  const query: { query?: string; limit: number } = { limit: parsed.data.limit };
  if (parsed.data.query !== undefined) {
    query.query = parsed.data.query;
  }

  const data = await listAdminUsers(query);
  res.status(200).json(ok(data));
}

export async function getAdminUserDetailHandler(req: Request, res: Response): Promise<void> {
  const userId = requireRouteParam(req.params.userId, "userId");

  const data = await getAdminUserDetail(userId);
  res.status(200).json(ok(data));
}

export async function updateAdminUserModerationHandler(req: Request, res: Response): Promise<void> {
  const adminUserId = requireUserId(req);
  const userId = requireRouteParam(req.params.userId, "userId");

  const parsed = adminUserModerationSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid moderation payload");
  }

  const payload: {
    adminUserId: string;
    userId: string;
    isBanned: boolean;
    reason?: string;
  } = {
    adminUserId,
    userId,
    isBanned: parsed.data.isBanned
  };
  if (parsed.data.reason !== undefined) {
    payload.reason = parsed.data.reason;
  }

  const data = await updateUserModerationState(payload);
  res.status(200).json(ok(data));
}

export async function listAdminTextsHandler(req: Request, res: Response): Promise<void> {
  const parsed = adminTextsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid texts query");
  }

  const data = await listAdminTexts(parsed.data);
  res.status(200).json(ok(data));
}

export async function createAdminTextHandler(req: Request, res: Response): Promise<void> {
  const adminUserId = requireUserId(req);
  const parsed = adminCreateTextSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid text payload");
  }

  const payload: {
    adminUserId: string;
    content: string;
    language: string;
    key?: string;
  } = {
    adminUserId,
    content: parsed.data.content,
    language: parsed.data.language
  };
  if (parsed.data.key !== undefined) {
    payload.key = parsed.data.key;
  }

  const data = await createAdminText(payload);
  res.status(201).json(ok(data));
}

export async function updateAdminTextHandler(req: Request, res: Response): Promise<void> {
  const adminUserId = requireUserId(req);
  const textId = requireRouteParam(req.params.textId, "textId");

  const parsed = adminUpdateTextSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid text update payload");
  }

  const payload: {
    adminUserId: string;
    textId: string;
    content?: string;
    language?: string;
    isActive?: boolean;
  } = {
    adminUserId,
    textId
  };
  if (parsed.data.content !== undefined) {
    payload.content = parsed.data.content;
  }
  if (parsed.data.language !== undefined) {
    payload.language = parsed.data.language;
  }
  if (parsed.data.isActive !== undefined) {
    payload.isActive = parsed.data.isActive;
  }

  const data = await updateAdminText(payload);
  res.status(200).json(ok(data));
}

export async function listAdminReportsHandler(req: Request, res: Response): Promise<void> {
  const parsed = adminReportsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid reports query");
  }

  const data = await listModerationReports(parsed.data);
  res.status(200).json(ok(data));
}

export async function getAdminReportDetailHandler(req: Request, res: Response): Promise<void> {
  const reportId = requireRouteParam(req.params.reportId, "reportId");

  const data = await getModerationReportDetail(reportId);
  res.status(200).json(ok(data));
}

export async function reviewAdminReportHandler(req: Request, res: Response): Promise<void> {
  const adminUserId = requireUserId(req);
  const reportId = requireRouteParam(req.params.reportId, "reportId");

  const parsed = adminReviewReportSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid report review payload");
  }

  const data = await reviewModerationReport({
    adminUserId,
    reportId,
    status: parsed.data.status,
    note: parsed.data.note
  });
  res.status(200).json(ok(data));
}

export async function listAdminAuditLogsHandler(req: Request, res: Response): Promise<void> {
  const parsed = adminAuditLogsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid audit logs query");
  }

  const query: { limit: number; entityType?: "report" | "user" | "text"; entityId?: string } = {
    limit: parsed.data.limit
  };
  if (parsed.data.entityType !== undefined) {
    query.entityType = parsed.data.entityType;
  }
  if (parsed.data.entityId !== undefined) {
    query.entityId = parsed.data.entityId;
  }

  const data = await listModerationAuditLogs(query);
  res.status(200).json(ok(data));
}
