import type { RaceMode, TypingScore } from "@typeracrer/shared";

export type AntiCheatReasonCode = "IMPOSSIBLE_CADENCE" | "PASTE_BURST" | "TIMING_ANOMALY";
export type AntiCheatReasonSeverity = "low" | "medium" | "high";

export type AntiCheatReason = {
  code: AntiCheatReasonCode;
  severity: AntiCheatReasonSeverity;
  confidence: number;
  message: string;
};

type EvaluateRulesInput = {
  mode: RaceMode;
  promptLength: number;
  typedLength: number;
  score: TypingScore;
  baseline?: {
    sampleSize: number;
    averageWpm: number;
    standardDeviationWpm: number;
  };
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function confidence(value: number): number {
  return Math.max(0.05, Math.min(0.99, round2(value)));
}

function evaluateImpossibleCadence(input: EvaluateRulesInput): AntiCheatReason | null {
  const charsPerSecond = input.score.totalTypedChars / Math.max(input.score.durationMs / 1000, 0.001);
  const exceedsAbsoluteHumanRange = input.score.wpm >= 330 || input.score.rawWpm >= 370 || charsPerSecond >= 33;

  if (!exceedsAbsoluteHumanRange) {
    return null;
  }

  const cadenceOverrun = Math.max(
    (input.score.wpm - 300) / 180,
    (input.score.rawWpm - 340) / 220,
    (charsPerSecond - 30) / 12
  );

  return {
    code: "IMPOSSIBLE_CADENCE",
    severity: "high",
    confidence: confidence(0.75 + cadenceOverrun * 0.2),
    message: `Cadence exceeded plausible limits (${round2(input.score.wpm)} WPM, ${round2(charsPerSecond)} cps).`
  };
}

function evaluatePasteBurst(input: EvaluateRulesInput): AntiCheatReason | null {
  const completionRatio = input.promptLength > 0 ? input.typedLength / input.promptLength : 0;
  const millisPerChar = input.score.durationMs / Math.max(input.score.totalTypedChars, 1);
  const veryFastDenseInput =
    input.score.totalTypedChars >= 120 && millisPerChar <= 14 && input.score.accuracy >= 98.5 && completionRatio >= 0.92;
  const nearInstantFullCompletion =
    input.score.completed && input.score.totalTypedChars >= 120 && input.score.durationMs <= Math.max(1000, input.promptLength * 8);

  if (!veryFastDenseInput && !nearInstantFullCompletion) {
    return null;
  }

  const burstFactor = Math.max((16 - millisPerChar) / 10, nearInstantFullCompletion ? 0.5 : 0);

  return {
    code: "PASTE_BURST",
    severity: nearInstantFullCompletion ? "high" : "medium",
    confidence: confidence(0.62 + burstFactor * 0.25),
    message: `Input burst resembled paste-like behavior (${round2(millisPerChar)} ms/char at ${input.score.accuracy}% accuracy).`
  };
}

function evaluateTimingAnomaly(input: EvaluateRulesInput): AntiCheatReason | null {
  if (!input.baseline || input.baseline.sampleSize < 12) {
    return null;
  }

  const std = Math.max(input.baseline.standardDeviationWpm, 1);
  const zScore = (input.score.wpm - input.baseline.averageWpm) / std;
  const absoluteJump = input.score.wpm - input.baseline.averageWpm;
  const isAnomalous = zScore >= 3.6 && absoluteJump >= 28;

  if (!isAnomalous) {
    return null;
  }

  return {
    code: "TIMING_ANOMALY",
    severity: zScore >= 5 ? "high" : "medium",
    confidence: confidence(0.58 + Math.min(zScore / 10, 0.32)),
    message: `Performance was a statistical outlier (${round2(zScore)}σ above personal baseline).`
  };
}

export function evaluateAntiCheatRules(input: EvaluateRulesInput): AntiCheatReason[] {
  if (input.mode === "timed_custom") {
    return [];
  }

  const reasons: AntiCheatReason[] = [];
  const impossibleCadence = evaluateImpossibleCadence(input);
  if (impossibleCadence) {
    reasons.push(impossibleCadence);
  }

  const pasteBurst = evaluatePasteBurst(input);
  if (pasteBurst) {
    reasons.push(pasteBurst);
  }

  const timingAnomaly = evaluateTimingAnomaly(input);
  if (timingAnomaly) {
    reasons.push(timingAnomaly);
  }

  return reasons;
}
