import type { CharacterProfile, RaceDifficulty, RaceMode, RaceTheme } from "../constants/race.js";

export type RaceTextOptions = {
  themes?: RaceTheme[];
  characterProfile?: CharacterProfile;
  difficulty?: RaceDifficulty;
};

export type TypingScore = {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  correctChars: number;
  incorrectChars: number;
  totalTypedChars: number;
  progress: number;
  completed: boolean;
  durationMs: number;
};

export type TypingAttemptPayload = {
  mode: RaceMode;
  textId: string;
  typed: string;
  durationMs: number;
};

export type TypingAttempt = {
  id: string;
  mode: RaceMode;
  textId: string;
  prompt: string;
  typed: string;
  score: TypingScore;
  createdAt: string;
};

export type RaceStats = {
  attemptsCount: number;
  averageWpm: number;
  bestWpm: number;
  bestAccuracy: number;
  personalBestByMode: Partial<Record<RaceMode, number>>;
};
