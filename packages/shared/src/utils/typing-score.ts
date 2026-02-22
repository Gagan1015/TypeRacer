import type { TypingScore } from "../types/race.js";

type ComputeTypingScoreInput = {
  prompt: string;
  typed: string;
  durationMs: number;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeTypingScore(input: ComputeTypingScoreInput): TypingScore {
  const prompt = input.prompt;
  const typed = input.typed;
  const durationMs = Math.max(input.durationMs, 1);

  let correctChars = 0;
  for (let i = 0; i < Math.min(prompt.length, typed.length); i += 1) {
    if (prompt[i] === typed[i]) {
      correctChars += 1;
    }
  }

  const totalTypedChars = typed.length;
  const incorrectChars = Math.max(totalTypedChars - correctChars, 0);
  const minutes = durationMs / 60_000;
  const rawWpm = minutes > 0 ? totalTypedChars / 5 / minutes : 0;
  const wpm = minutes > 0 ? correctChars / 5 / minutes : 0;
  const accuracy = totalTypedChars > 0 ? (correctChars / totalTypedChars) * 100 : 100;
  const progress = prompt.length > 0 ? Math.min(totalTypedChars / prompt.length, 1) : 0;
  const completed = typed.length >= prompt.length && typed.slice(0, prompt.length) === prompt;

  return {
    wpm: round2(wpm),
    rawWpm: round2(rawWpm),
    accuracy: round2(accuracy),
    correctChars,
    incorrectChars,
    totalTypedChars,
    progress: round2(progress * 100),
    completed,
    durationMs
  };
}

