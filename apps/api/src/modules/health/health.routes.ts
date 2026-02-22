import { Router, type Router as RouterType } from "express";
import { ok } from "@typeracrer/shared";

export const healthRouter: RouterType = Router();

healthRouter.get("/", (_req, res) => {
  res.status(200).json(ok({ status: "ok" }));
});
