import { Router, type Router as RouterType } from "express";
import { loginHandler, logoutHandler, meHandler, refreshHandler, signupHandler } from "./auth.controller.js";
import { requireAuth } from "../../middleware/auth.middleware.js";

export const authRouter: RouterType = Router();

authRouter.post("/signup", signupHandler);
authRouter.post("/login", loginHandler);
authRouter.post("/refresh", refreshHandler);
authRouter.post("/logout", logoutHandler);
authRouter.get("/me", requireAuth, meHandler);
