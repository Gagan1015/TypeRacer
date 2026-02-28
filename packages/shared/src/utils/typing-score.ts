import type { TypingScore } from "../types/race.js";

type ComputeTypingScoreInput = {
  prompt: string;
  typed: string;
  durationMs: number;
};

const SINGLE_QUOTE_EQUIVALENTS = new Set(["'", "’", "‘", "`", "´", "ʼ"]);
const DOUBLE_QUOTE_EQUIVALENTS = new Set(['"', "“", "”", "„", "‟"]);

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function areEquivalentTypingChars(promptChar: string, typedChar: string): boolean {
  if (promptChar === typedChar) {
    return true;
  }
  if (SINGLE_QUOTE_EQUIVALENTS.has(promptChar) && SINGLE_QUOTE_EQUIVALENTS.has(typedChar)) {
    return true;
  }
  if (DOUBLE_QUOTE_EQUIVALENTS.has(promptChar) && DOUBLE_QUOTE_EQUIVALENTS.has(typedChar)) {
    return true;
  }
  return false;
}

function areEquivalentTypingStrings(prompt: string, typed: string): boolean {
  if (typed.length < prompt.length) {
    return false;
  }

  for (let i = 0; i < prompt.length; i += 1) {
    const promptChar = prompt[i];
    const typedChar = typed[i];
    if (!promptChar || !typedChar || !areEquivalentTypingChars(promptChar, typedChar)) {
      return false;
    }
  }

  return true;
}

export function computeTypingScore(input: ComputeTypingScoreInput): TypingScore {
  const prompt = input.prompt;
  const typed = input.typed;
  const durationMs = Math.max(input.durationMs, 1);

  let correctChars = 0;
  for (let i = 0; i < Math.min(prompt.length, typed.length); i += 1) {
    const promptChar = prompt[i];
    const typedChar = typed[i];
    if (promptChar && typedChar && areEquivalentTypingChars(promptChar, typedChar)) {
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
  const completed = areEquivalentTypingStrings(prompt, typed);

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
