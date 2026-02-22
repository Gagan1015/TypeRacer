import mongoose from "mongoose";
import type {
  RaceMode,
  RankedLeaderboard,
  RankedLeaderboardEntry,
  RankedMatchDelta,
  RankedMatchRecord,
  RankedProfile,
  RankedRating
} from "@typeracrer/shared";
import { RankedMatchModel } from "../../db/models/ranked-match.model.js";
import { RankedRatingModel } from "../../db/models/ranked-rating.model.js";
import { HttpError } from "../../utils/http-error.js";
import { getCurrentSeasonWindow, parseSeasonWindow } from "../leaderboard/season.js";
import { computeRankedMatchDeltas, getDefaultRankedRatingValue, type RankedParticipant } from "./ranked.math.js";

type RankedScope = "global" | "seasonal";

type RankedLeaderboardQuery = {
  scope: RankedScope;
  seasonId?: string;
  limit: number;
};

type ApplyRankedMatchInput = {
  roomId: string;
  mode: RaceMode;
  playedAtMs: number;
  participants: RankedParticipant[];
};

type RatingSnapshot = {
  userId: mongoose.Types.ObjectId;
  username: string;
  rating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  lastMatchAt?: Date | null;
};

const SCORE_ROUNDING_PRECISION = 100;

function roundScore(value: number): number {
  return Math.round(value * SCORE_ROUNDING_PRECISION) / SCORE_ROUNDING_PRECISION;
}

function toObjectId(value: string): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId(value);
}

function toApiRating(value?: {
  rating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  lastMatchAt?: Date | null;
} | null): RankedRating {
  if (!value) {
    return {
      rating: getDefaultRankedRatingValue(),
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      lastMatchAt: null
    };
  }

  return {
    rating: roundScore(value.rating),
    gamesPlayed: value.gamesPlayed,
    wins: value.wins,
    losses: value.losses,
    draws: value.draws,
    lastMatchAt: value.lastMatchAt ? value.lastMatchAt.toISOString() : null
  };
}

function toApiMatchDelta(delta: {
  userId: mongoose.Types.ObjectId;
  username: string;
  place: number;
  oldRating: number;
  newRating: number;
  delta: number;
  outcome: "win" | "loss" | "draw";
}): RankedMatchDelta {
  return {
    userId: delta.userId.toString(),
    username: delta.username,
    place: delta.place,
    oldRating: roundScore(delta.oldRating),
    newRating: roundScore(delta.newRating),
    delta: roundScore(delta.delta),
    outcome: delta.outcome
  };
}

function getSeasonIdForScope(scope: RankedScope, seasonId?: string): string | null {
  if (scope === "global") {
    return null;
  }

  if (seasonId) {
    return parseSeasonWindow(seasonId).id;
  }

  return getCurrentSeasonWindow().id;
}

function resolveWinRate(entry: Pick<RankedRating, "wins" | "gamesPlayed">): number {
  if (entry.gamesPlayed === 0) {
    return 0;
  }
  return roundScore((entry.wins / entry.gamesPlayed) * 100);
}

function toApiLeaderboardEntry(document: RatingSnapshot, rank: number): RankedLeaderboardEntry {
  const ratingInput: {
    rating: number;
    gamesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
    lastMatchAt?: Date | null;
  } = {
    rating: document.rating,
    gamesPlayed: document.gamesPlayed,
    wins: document.wins,
    losses: document.losses,
    draws: document.draws
  };
  if (document.lastMatchAt !== undefined) {
    ratingInput.lastMatchAt = document.lastMatchAt;
  }
  const rating = toApiRating(ratingInput);

  return {
    rank,
    userId: document.userId.toString(),
    username: document.username,
    rating: rating.rating,
    gamesPlayed: rating.gamesPlayed,
    wins: rating.wins,
    losses: rating.losses,
    draws: rating.draws,
    winRate: resolveWinRate(rating),
    lastMatchAt: rating.lastMatchAt
  };
}

export async function getUserRankedProfile(userId: string, seasonId?: string): Promise<RankedProfile> {
  const userObjectId = toObjectId(userId);
  const resolvedSeasonId = getSeasonIdForScope("seasonal", seasonId);
  if (!resolvedSeasonId) {
    throw new HttpError(500, "INTERNAL_ERROR", "Failed to resolve ranked season");
  }

  const [global, seasonal] = await Promise.all([
    RankedRatingModel.findOne({ userId: userObjectId, scope: "global", seasonId: null }).lean<RatingSnapshot | null>(),
    RankedRatingModel.findOne({ userId: userObjectId, scope: "seasonal", seasonId: resolvedSeasonId }).lean<RatingSnapshot | null>()
  ]);

  return {
    userId,
    global: toApiRating(global),
    seasonId: resolvedSeasonId,
    seasonal: toApiRating(seasonal)
  };
}

export async function getUserRankedHistory(userId: string, limit: number): Promise<RankedMatchRecord[]> {
  const userObjectId = toObjectId(userId);

  const matches = await RankedMatchModel.find({
    $or: [{ "globalDeltas.userId": userObjectId }, { "seasonalDeltas.userId": userObjectId }]
  })
    .sort({ playedAt: -1, _id: -1 })
    .limit(limit)
    .lean();

  return matches.map((match) => ({
    id: match._id.toString(),
    roomId: match.roomId,
    mode: match.mode,
    seasonId: match.seasonId,
    playedAt: match.playedAt.toISOString(),
    participantCount: match.participantCount,
    globalDeltas: match.globalDeltas.map(toApiMatchDelta),
    seasonalDeltas: match.seasonalDeltas.map(toApiMatchDelta)
  }));
}

export async function getRankedLeaderboard(query: RankedLeaderboardQuery): Promise<RankedLeaderboard> {
  const seasonId = getSeasonIdForScope(query.scope, query.seasonId);

  const entries = await RankedRatingModel.find({
    scope: query.scope,
    seasonId
  })
    .sort({
      rating: -1,
      gamesPlayed: -1,
      wins: -1,
      lastMatchAt: 1,
      userId: 1
    })
    .limit(query.limit)
    .lean<RatingSnapshot[]>();

  return {
    scope: query.scope,
    seasonId,
    generatedAt: new Date().toISOString(),
    entries: entries.map((entry, index) => toApiLeaderboardEntry(entry, index + 1))
  };
}

function toPersistedDelta(delta: RankedMatchDelta): {
  userId: mongoose.Types.ObjectId;
  username: string;
  place: number;
  oldRating: number;
  newRating: number;
  delta: number;
  outcome: "win" | "loss" | "draw";
} {
  return {
    userId: toObjectId(delta.userId),
    username: delta.username,
    place: delta.place,
    oldRating: delta.oldRating,
    newRating: delta.newRating,
    delta: delta.delta,
    outcome: delta.outcome
  };
}

function outcomeToCounters(outcome: RankedMatchDelta["outcome"]): { wins: number; losses: number; draws: number } {
  if (outcome === "win") {
    return { wins: 1, losses: 0, draws: 0 };
  }
  if (outcome === "loss") {
    return { wins: 0, losses: 1, draws: 0 };
  }
  return { wins: 0, losses: 0, draws: 1 };
}

function buildBulkUpdateFromDelta(scope: RankedScope, seasonId: string | null, delta: RankedMatchDelta, playedAt: Date) {
  const counters = outcomeToCounters(delta.outcome);
  const userObjectId = toObjectId(delta.userId);

  return {
    updateOne: {
      filter: { userId: userObjectId, scope, seasonId },
      update: {
        $set: {
          username: delta.username,
          rating: delta.newRating,
          lastMatchAt: playedAt
        },
        $inc: {
          gamesPlayed: 1,
          wins: counters.wins,
          losses: counters.losses,
          draws: counters.draws
        },
        $setOnInsert: {
          userId: userObjectId,
          scope,
          seasonId
        }
      },
      upsert: true
    }
  };
}

function toRatingsMap(
  documents: Array<{
    userId: mongoose.Types.ObjectId;
    rating: number;
  }>
): Map<string, number> {
  const map = new Map<string, number>();
  for (const document of documents) {
    map.set(document.userId.toString(), document.rating);
  }
  return map;
}

export async function applyRankedMatchResult(input: ApplyRankedMatchInput): Promise<{
  seasonId: string;
  globalDeltas: RankedMatchDelta[];
  seasonalDeltas: RankedMatchDelta[];
} | null> {
  if (input.mode === "fixed" || input.mode === "timed_custom") {
    return null;
  }

  const participants = [...input.participants]
    .sort((a, b) => {
      if (a.place !== b.place) {
        return a.place - b.place;
      }
      return a.userId.localeCompare(b.userId);
    })
    .filter((participant, index, list) => index === 0 || list[index - 1]?.userId !== participant.userId);

  if (participants.length < 2) {
    return null;
  }

  const seasonId = getCurrentSeasonWindow(input.playedAtMs).id;
  const playedAt = new Date(input.playedAtMs);
  const participantIds = participants.map((participant) => toObjectId(participant.userId));

  const [globalRatings, seasonalRatings] = await Promise.all([
    RankedRatingModel.find({
      userId: { $in: participantIds },
      scope: "global",
      seasonId: null
    })
      .select({ userId: 1, rating: 1 })
      .lean<Array<{ userId: mongoose.Types.ObjectId; rating: number }>>(),
    RankedRatingModel.find({
      userId: { $in: participantIds },
      scope: "seasonal",
      seasonId
    })
      .select({ userId: 1, rating: 1 })
      .lean<Array<{ userId: mongoose.Types.ObjectId; rating: number }>>()
  ]);

  const globalMap = toRatingsMap(globalRatings);
  const seasonalMap = toRatingsMap(seasonalRatings);

  const globalDeltas = computeRankedMatchDeltas(participants, globalMap);
  const seasonalDeltas = computeRankedMatchDeltas(participants, seasonalMap);

  const updates = [
    ...globalDeltas.map((delta) => buildBulkUpdateFromDelta("global", null, delta, playedAt)),
    ...seasonalDeltas.map((delta) => buildBulkUpdateFromDelta("seasonal", seasonId, delta, playedAt))
  ];

  if (updates.length > 0) {
    await RankedRatingModel.bulkWrite(updates, { ordered: false });
  }

  await RankedMatchModel.create({
    roomId: input.roomId,
    mode: input.mode,
    seasonId,
    playedAt,
    participantCount: participants.length,
    globalDeltas: globalDeltas.map(toPersistedDelta),
    seasonalDeltas: seasonalDeltas.map(toPersistedDelta)
  });

  return {
    seasonId,
    globalDeltas,
    seasonalDeltas
  };
}
