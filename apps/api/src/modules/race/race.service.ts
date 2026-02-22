import mongoose from "mongoose";
import {
  computeTypingScore,
  raceTexts,
  timedModeDurationMs,
  type CreateTypingAttemptInput,
  type RaceMode,
  type RaceStats,
  type RaceText,
  type TypingAttempt
} from "@typeracrer/shared";
import { TypingAttemptModel } from "../../db/models/typing-attempt.model.js";
import { HttpError } from "../../utils/http-error.js";

function toTypingAttempt(document: {
  _id: mongoose.Types.ObjectId;
  mode: RaceMode;
  textId: string;
  prompt: string;
  typed: string;
  score: TypingAttempt["score"];
  createdAt: Date;
}): TypingAttempt {
  return {
    id: document._id.toString(),
    mode: document.mode,
    textId: document.textId,
    prompt: document.prompt,
    typed: document.typed,
    score: document.score,
    createdAt: document.createdAt.toISOString()
  };
}

function pickRandomText(): RaceText {
  const index = Math.floor(Math.random() * raceTexts.length);
  const selected = raceTexts[index];
  if (!selected) {
    throw new HttpError(500, "NO_TEXTS_CONFIGURED", "No race texts configured");
  }
  return selected;
}

export function getRaceText(_mode: RaceMode): RaceText {
  return pickRandomText();
}

export async function createTypingAttempt(userId: string, input: CreateTypingAttemptInput): Promise<TypingAttempt> {
  const selectedText = raceTexts.find((text) => text.id === input.textId);
  if (!selectedText) {
    throw new HttpError(400, "UNKNOWN_TEXT", "Provided text is invalid");
  }

  const boundedDurationMs =
    input.mode === "timed_30" || input.mode === "timed_60"
      ? Math.min(input.durationMs, timedModeDurationMs[input.mode])
      : input.durationMs;

  const score = computeTypingScore({
    prompt: selectedText.content,
    typed: input.typed,
    durationMs: boundedDurationMs
  });

  const created = await TypingAttemptModel.create({
    userId,
    mode: input.mode,
    textId: selectedText.id,
    prompt: selectedText.content,
    typed: input.typed,
    score
  });

  return toTypingAttempt({
    _id: created._id,
    mode: created.mode,
    textId: created.textId,
    prompt: created.prompt,
    typed: created.typed,
    score: created.score,
    createdAt: created.createdAt
  });
}

export async function getUserAttempts(userId: string, limit: number): Promise<TypingAttempt[]> {
  const attempts = await TypingAttemptModel.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean();
  return attempts.map((attempt) =>
    toTypingAttempt({
      _id: attempt._id,
      mode: attempt.mode,
      textId: attempt.textId,
      prompt: attempt.prompt,
      typed: attempt.typed,
      score: attempt.score,
      createdAt: attempt.createdAt
    })
  );
}

export async function getUserRaceStats(userId: string): Promise<RaceStats> {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const [summaryResult] = await TypingAttemptModel.aggregate<{
    attemptsCount: number;
    averageWpm: number;
    bestWpm: number;
    bestAccuracy: number;
  }>([
    { $match: { userId: userObjectId } },
    {
      $group: {
        _id: null,
        attemptsCount: { $sum: 1 },
        averageWpm: { $avg: "$score.wpm" },
        bestWpm: { $max: "$score.wpm" },
        bestAccuracy: { $max: "$score.accuracy" }
      }
    }
  ]);

  const byModeResults = await TypingAttemptModel.aggregate<{ _id: RaceMode; bestWpm: number }>([
    { $match: { userId: userObjectId } },
    {
      $group: {
        _id: "$mode",
        bestWpm: { $max: "$score.wpm" }
      }
    }
  ]);

  const personalBestByMode: RaceStats["personalBestByMode"] = {};
  for (const result of byModeResults) {
    personalBestByMode[result._id] = Math.round(result.bestWpm * 100) / 100;
  }

  if (!summaryResult) {
    return {
      attemptsCount: 0,
      averageWpm: 0,
      bestWpm: 0,
      bestAccuracy: 0,
      personalBestByMode
    };
  }

  return {
    attemptsCount: summaryResult.attemptsCount,
    averageWpm: Math.round(summaryResult.averageWpm * 100) / 100,
    bestWpm: Math.round(summaryResult.bestWpm * 100) / 100,
    bestAccuracy: Math.round(summaryResult.bestAccuracy * 100) / 100,
    personalBestByMode
  };
}

