import { Router, type Router as RouterType } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { getMyProfileHandler, updateMyProfileHandler } from "./profile.controller.js";

export const profileRouter: RouterType = Router();

profileRouter.get("/me", requireAuth, getMyProfileHandler);
profileRouter.patch("/me", requireAuth, updateMyProfileHandler);
