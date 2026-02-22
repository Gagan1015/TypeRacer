import type { RaceMode } from "../constants/race.js";

export type RankedOutcome = "win" | "loss" | "draw";

export type RankedRating = {
  rating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  lastMatchAt: string | null;
};

export type RankedProfile = {
  userId: string;
  global: RankedRating;
  seasonId: string;
  seasonal: RankedRating;
};

export type RankedMatchDelta = {
  userId: string;
  username: string;
  place: number;
  oldRating: number;
  newRating: number;
  delta: number;
  outcome: RankedOutcome;
};

export type RankedMatchRecord = {
  id: string;
  roomId: string;
  mode: RaceMode;
  seasonId: string;
  playedAt: string;
  participantCount: number;
  globalDeltas: RankedMatchDelta[];
  seasonalDeltas: RankedMatchDelta[];
};

export type RankedLeaderboardEntry = {
  rank: number;
  userId: string;
  username: string;
  rating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  lastMatchAt: string | null;
};

export type RankedLeaderboard = {
  scope: "global" | "seasonal";
  seasonId: string | null;
  generatedAt: string;
  entries: RankedLeaderboardEntry[];
};
