import { z } from "zod";

export const adminUsersQuerySchema = z.object({
  query: z.string().trim().min(1).max(120).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50)
});

export const adminUserModerationSchema = z
  .object({
    isBanned: z.boolean(),
    reason: z.string().trim().max(280).optional()
  })
  .refine((value) => (value.isBanned ? Boolean(value.reason && value.reason.length > 0) : true), {
    message: "Ban reason is required when banning a user"
  });

export const adminTextsQuerySchema = z.object({
  status: z.enum(["active", "inactive", "all"]).default("all"),
  limit: z.coerce.number().int().min(1).max(200).default(100)
});

export const adminCreateTextSchema = z.object({
  key: z.string().trim().min(3).max(64).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  content: z.string().trim().min(40).max(1200),
  language: z.string().trim().min(2).max(8).default("en")
});

export const adminUpdateTextSchema = z
  .object({
    content: z.string().trim().min(40).max(1200).optional(),
    language: z.string().trim().min(2).max(8).optional(),
    isActive: z.boolean().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one updatable field is required"
  });

export const adminReportsQuerySchema = z.object({
  status: z.enum(["open", "in_review", "resolved_cheat", "resolved_clean", "dismissed", "all"]).default("all"),
  limit: z.coerce.number().int().min(1).max(200).default(100)
});

export const adminReviewReportSchema = z.object({
  status: z.enum(["open", "in_review", "resolved_cheat", "resolved_clean", "dismissed"]),
  note: z.string().trim().max(2000).default("")
});

export const adminAuditLogsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
  entityType: z.enum(["report", "user", "text"]).optional(),
  entityId: z.string().trim().min(1).max(120).optional()
});
