import assert from "node:assert/strict";
import test from "node:test";
import { evaluateAntiCheatRules } from "./anti-cheat.rules.js";

const baselineScore = {
  wpm: 100,
  rawWpm: 105,
  accuracy: 97,
  correctChars: 500,
  incorrectChars: 12,
  totalTypedChars: 512,
  progress: 100,
  completed: true,
  durationMs: 60_000
} as const;

test("flags impossible cadence when speed exceeds plausible limits", () => {
  const reasons = evaluateAntiCheatRules({
    mode: "timed_60",
    promptLength: 600,
    typedLength: 600,
    score: {
      ...baselineScore,
      wpm: 360,
      rawWpm: 380,
      totalTypedChars: 650,
      durationMs: 30_000
    }
  });

  assert.ok(reasons.some((reason) => reason.code === "IMPOSSIBLE_CADENCE"));
});

test("flags paste-like burst for near-instant full completion", () => {
  const reasons = evaluateAntiCheatRules({
    mode: "fixed",
    promptLength: 420,
    typedLength: 420,
    score: {
      ...baselineScore,
      wpm: 290,
      rawWpm: 300,
      totalTypedChars: 420,
      durationMs: 950,
      accuracy: 100
    }
  });

  assert.ok(reasons.some((reason) => reason.code === "PASTE_BURST"));
});

test("flags timing anomaly when performance is a large baseline outlier", () => {
  const reasons = evaluateAntiCheatRules({
    mode: "timed_30",
    promptLength: 420,
    typedLength: 380,
    score: {
      ...baselineScore,
      wpm: 210,
      rawWpm: 220,
      durationMs: 30_000
    },
    baseline: {
      sampleSize: 20,
      averageWpm: 95,
      standardDeviationWpm: 18
    }
  });

  assert.ok(reasons.some((reason) => reason.code === "TIMING_ANOMALY"));
});

test("returns no flags for normal attempts", () => {
  const reasons = evaluateAntiCheatRules({
    mode: "timed_60",
    promptLength: 600,
    typedLength: 570,
    score: {
      ...baselineScore,
      wpm: 92,
      rawWpm: 98,
      totalTypedChars: 570,
      durationMs: 60_000
    },
    baseline: {
      sampleSize: 20,
      averageWpm: 90,
      standardDeviationWpm: 10
    }
  });

  assert.equal(reasons.length, 0);
});
