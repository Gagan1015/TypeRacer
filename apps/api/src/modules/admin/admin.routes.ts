import { Router, type Router as RouterType } from "express";
import { ok } from "@typeracrer/shared";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import {
  createAdminTextHandler,
  getAdminReportDetailHandler,
  getAdminUserDetailHandler,
  listAdminAuditLogsHandler,
  listAdminReportsHandler,
  listAdminTextsHandler,
  listAdminUsersHandler,
  reviewAdminReportHandler,
  updateAdminTextHandler,
  updateAdminUserModerationHandler
} from "./admin.controller.js";

export const adminRouter: RouterType = Router();

adminRouter.get("/health", requireAuth, requireRole("admin"), (_req, res) => {
  res.status(200).json(ok({ admin: true }));
});

adminRouter.use(requireAuth, requireRole("admin"));

adminRouter.get("/users", listAdminUsersHandler);
adminRouter.get("/users/:userId", getAdminUserDetailHandler);
adminRouter.patch("/users/:userId/moderation", updateAdminUserModerationHandler);

adminRouter.get("/texts", listAdminTextsHandler);
adminRouter.post("/texts", createAdminTextHandler);
adminRouter.patch("/texts/:textId", updateAdminTextHandler);

adminRouter.get("/reports", listAdminReportsHandler);
adminRouter.get("/reports/:reportId", getAdminReportDetailHandler);
adminRouter.patch("/reports/:reportId/review", reviewAdminReportHandler);

adminRouter.get("/audit-logs", listAdminAuditLogsHandler);
