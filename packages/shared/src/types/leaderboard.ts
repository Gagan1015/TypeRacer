import type { RaceMode } from "../constants/race.js";

export type LeaderboardScope = "global" | "seasonal";

export type LeaderboardSeason = {
  id: string;
  startsAt: string;
  endsAt: string;
  isCurrent: boolean;
};

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  username: string;
  attemptsCount: number;
  bestWpm: number;
  bestAccuracy: number;
  averageWpm: number;
  lastAttemptAt: string;
};

export type TypingLeaderboard = {
  mode: RaceMode;
  scope: LeaderboardScope;
  seasonId: string | null;
  generatedAt: string;
  entries: LeaderboardEntry[];
};
