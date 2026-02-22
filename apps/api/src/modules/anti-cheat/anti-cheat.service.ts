import mongoose from "mongoose";
import type { RaceMode, TypingScore } from "@typeracrer/shared";
import { TypingAttemptModel } from "../../db/models/typing-attempt.model.js";
import { evaluateAntiCheatRules, type AntiCheatReason } from "./anti-cheat.rules.js";

const BASELINE_SAMPLE_SIZE = 25;

type EvaluateTypingAttemptInput = {
  userId: string;
  mode: RaceMode;
  promptLength: number;
  typedLength: number;
  score: TypingScore;
};

function toObjectId(value: string): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId(value);
}

function mean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[], average: number): number {
  if (values.length <= 1) {
    return 0;
  }
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

async function buildBaseline(userId: string, mode: RaceMode): Promise<{
  sampleSize: number;
  averageWpm: number;
  standardDeviationWpm: number;
} | null> {
  const userObjectId = toObjectId(userId);
  const attempts = await TypingAttemptModel.find({
    userId: userObjectId,
    mode,
    "antiCheat.flagged": { $ne: true }
  })
    .sort({ createdAt: -1 })
    .limit(BASELINE_SAMPLE_SIZE)
    .select({ "score.wpm": 1 })
    .lean();

  const wpmValues = attempts.map((attempt) => attempt.score.wpm).filter((value): value is number => Number.isFinite(value));
  if (wpmValues.length < 12) {
    return null;
  }

  const averageWpm = mean(wpmValues);
  return {
    sampleSize: wpmValues.length,
    averageWpm,
    standardDeviationWpm: standardDeviation(wpmValues, averageWpm)
  };
}

export async function evaluateTypingAttemptAntiCheat(input: EvaluateTypingAttemptInput): Promise<{
  flagged: boolean;
  reasons: AntiCheatReason[];
}> {
  const baseline = await buildBaseline(input.userId, input.mode);
  const payload: {
    mode: RaceMode;
    promptLength: number;
    typedLength: number;
    score: TypingScore;
    baseline?: {
      sampleSize: number;
      averageWpm: number;
      standardDeviationWpm: number;
    };
  } = {
    mode: input.mode,
    promptLength: input.promptLength,
    typedLength: input.typedLength,
    score: input.score
  };
  if (baseline) {
    payload.baseline = baseline;
  }

  const reasons = evaluateAntiCheatRules(payload);

  return {
    flagged: reasons.length > 0,
    reasons
  };
}
