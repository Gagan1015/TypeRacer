import type { RaceMode } from "../constants/race.js";
import type { TypingScore } from "./race.js";

export type MultiplayerRoomStatus = "waiting" | "countdown" | "racing" | "finished";

export type MultiplayerRoomPlayer = {
  userId: string;
  username: string;
  ready: boolean;
  progress: number;
  wpm: number;
  accuracy: number;
  finishedAtMs: number | null;
  place: number | null;
};

export type MultiplayerRoomState = {
  id: string;
  hostUserId: string;
  mode: RaceMode;
  raceDurationMs: number | null;
  status: MultiplayerRoomStatus;
  countdownSecondsLeft: number | null;
  textId: string | null;
  prompt: string | null;
  createdAt: string;
  updatedAt: string;
  players: MultiplayerRoomPlayer[];
};

export type MultiplayerRaceResult = {
  userId: string;
  username: string;
  place: number;
  score: TypingScore;
  finishedAtMs: number | null;
};
