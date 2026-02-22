import mongoose from "mongoose";
import {
  computeTypingScore,
  isPresetTimedRaceMode,
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

const GENERATED_TEXT_TTL_MS = 2 * 60 * 60 * 1000;
const MAX_GENERATED_TEXTS = 500;
const TIMED_PROMPT_CHARS_PER_MS = 1 / 46;

type CachedRaceText = RaceText & { createdAtMs: number };

const generatedTexts = new Map<string, CachedRaceText>();

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

function pruneGeneratedTexts(): void {
  const now = Date.now();
  for (const [textId, text] of generatedTexts.entries()) {
    if (now - text.createdAtMs > GENERATED_TEXT_TTL_MS) {
      generatedTexts.delete(textId);
    }
  }

  if (generatedTexts.size <= MAX_GENERATED_TEXTS) {
    return;
  }

  const overflow = generatedTexts.size - MAX_GENERATED_TEXTS;
  let removed = 0;
  for (const key of generatedTexts.keys()) {
    generatedTexts.delete(key);
    removed += 1;
    if (removed >= overflow) {
      break;
    }
  }
}

function cacheGeneratedText(text: RaceText): RaceText {
  generatedTexts.set(text.id, { ...text, createdAtMs: Date.now() });
  pruneGeneratedTexts();
  return text;
}

function buildTimedPrompt(targetChars: number): string {
  if (raceTexts.length === 0) {
    throw new HttpError(500, "NO_TEXTS_CONFIGURED", "No race texts configured");
  }

  const parts: string[] = [];
  let lastIndex = -1;
  let totalChars = 0;

  while (totalChars < targetChars) {
    let index = Math.floor(Math.random() * raceTexts.length);

    if (raceTexts.length > 1 && index === lastIndex) {
      index = (index + 1) % raceTexts.length;
    }

    const segment = raceTexts[index];
    if (!segment) {
      continue;
    }

    parts.push(segment.content);
    totalChars += segment.content.length + 1;
    lastIndex = index;

    if (parts.length >= 300) {
      break;
    }
  }

  return parts.join(" ");
}

function targetCharsForDuration(durationMs: number): number {
  return Math.max(260, Math.min(Math.round(durationMs * TIMED_PROMPT_CHARS_PER_MS), 4_500));
}

function createTimedRaceText(mode: RaceMode, durationMs: number): RaceText {
  const content = buildTimedPrompt(targetCharsForDuration(durationMs));
  const uniqueId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

  return cacheGeneratedText({
    id: `timed-${mode}-${uniqueId}`,
    content,
    language: "en"
  });
}

function getRaceTextById(textId: string): RaceText | undefined {
  const baseText = raceTexts.find((text) => text.id === textId);
  if (baseText) {
    return baseText;
  }

  const generated = generatedTexts.get(textId);
  if (!generated) {
    return undefined;
  }

  if (Date.now() - generated.createdAtMs > GENERATED_TEXT_TTL_MS) {
    generatedTexts.delete(textId);
    return undefined;
  }

  return {
    id: generated.id,
    content: generated.content,
    language: generated.language
  };
}

function getModeDurationCapMs(mode: RaceMode, targetDurationMs?: number): number | null {
  if (isPresetTimedRaceMode(mode)) {
    return timedModeDurationMs[mode];
  }

  if (mode === "timed_custom") {
    if (!targetDurationMs) {
      return null;
    }
    return Math.max(10_000, Math.min(targetDurationMs, 600_000));
  }

  return null;
}

export function getRaceText(mode: RaceMode, durationMs?: number): RaceText {
  if (mode === "timed_custom" && !durationMs) {
    throw new HttpError(400, "MISSING_DURATION", "Custom timed mode requires durationMs");
  }

  const timedCapMs = getModeDurationCapMs(mode, durationMs);
  if (timedCapMs !== null) {
    return createTimedRaceText(mode, timedCapMs);
  }

  return pickRandomText();
}

export async function createTypingAttempt(userId: string, input: CreateTypingAttemptInput): Promise<TypingAttempt> {
  if (input.mode === "timed_custom" && !input.targetDurationMs) {
    throw new HttpError(400, "MISSING_DURATION", "Custom timed mode requires targetDurationMs");
  }

  const selectedText = getRaceTextById(input.textId);
  if (!selectedText) {
    throw new HttpError(400, "UNKNOWN_TEXT", "Provided text is invalid");
  }

  const timedCapMs = getModeDurationCapMs(input.mode, input.targetDurationMs);
  const boundedDurationMs = timedCapMs ? Math.min(input.durationMs, timedCapMs) : input.durationMs;

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
