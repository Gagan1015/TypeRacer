import { Router, type Router as RouterType } from "express";
import { ok } from "@typeracrer/shared";
import { UserModel } from "../../db/models/user.model.js";
import { TypingAttemptModel } from "../../db/models/typing-attempt.model.js";

export const healthRouter: RouterType = Router();

healthRouter.get("/", (_req, res) => {
  res.status(200).json(ok({ status: "ok" }));
});

healthRouter.get("/stats", async (_req, res) => {
  try {
    const [totalUsers, totalRaces, avgResult] = await Promise.all([
      UserModel.countDocuments({ isBanned: false }),
      TypingAttemptModel.countDocuments(),
      TypingAttemptModel.aggregate([
        { $group: { _id: null, avgWpm: { $avg: "$score.wpm" } } }
      ])
    ]);

    const avgWpm = avgResult[0]?.avgWpm ?? 0;

    res.status(200).json(
      ok({
        totalUsers,
        totalRaces,
        avgWpm: Math.round(avgWpm)
      })
    );
  } catch {
    // Fallback if DB is unavailable — still return something
    res.status(200).json(
      ok({
        totalUsers: 0,
        totalRaces: 0,
        avgWpm: 0
      })
    );
  }
});
