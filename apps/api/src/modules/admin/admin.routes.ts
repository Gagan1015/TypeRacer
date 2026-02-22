import { Router, type Router as RouterType } from "express";
import { ok } from "@typeracrer/shared";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";

export const adminRouter: RouterType = Router();

adminRouter.get("/health", requireAuth, requireRole("admin"), (_req, res) => {
  res.status(200).json(ok({ admin: true }));
});
