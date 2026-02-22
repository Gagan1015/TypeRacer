import mongoose from "mongoose";
import {
  raceModes,
  type LeaderboardEntry,
  type LeaderboardScope,
  type RaceMode,
  type TypingLeaderboard
} from "@typeracrer/shared";
import { LeaderboardEntryModel } from "../../db/models/leaderboard-entry.model.js";
import { TypingAttemptModel } from "../../db/models/typing-attempt.model.js";
import { UserModel } from "../../db/models/user.model.js";
import { getCurrentSeasonWindow, parseSeasonWindow, type SeasonWindow } from "./season.js";

const SCORE_ROUNDING_PRECISION = 100;

type UserModeAggregate = {
  _id: RaceMode;
  attemptsCount: number;
  averageWpm: number;
  bestWpm: number;
  bestAccuracy: number;
  lastAttemptAt: Date;
};

type GlobalModeAggregate = {
  _id: {
    userId: mongoose.Types.ObjectId;
    mode: RaceMode;
  };
  attemptsCount: number;
  averageWpm: number;
  bestWpm: number;
  bestAccuracy: number;
  lastAttemptAt: Date;
};

type TypingLeaderboardQuery = {
  mode: RaceMode;
  scope: LeaderboardScope;
  limit: number;
  seasonId?: string;
};

type FullRecomputeInput = {
  scope: LeaderboardScope;
  seasonId?: string;
  mode?: RaceMode;
};

function roundScore(value: number): number {
  return Math.round(value * SCORE_ROUNDING_PRECISION) / SCORE_ROUNDING_PRECISION;
}

function resolveSeason(scope: LeaderboardScope, seasonId?: string): SeasonWindow | null {
  if (scope === "global") {
    return null;
  }

  if (seasonId) {
    return parseSeasonWindow(seasonId);
  }

  return getCurrentSeasonWindow();
}

function toMongooseObjectId(value: string): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId(value);
}

function buildUserAggregatePipeline(
  userId: mongoose.Types.ObjectId,
  season: SeasonWindow | null
): mongoose.PipelineStage[] {
  const match: mongoose.FilterQuery<unknown> = { userId };
  if (season) {
    match.createdAt = {
      $gte: new Date(season.startsAt),
      $lt: new Date(season.endsAt)
    };
  }

  return [
    { $match: match },
    {
      $group: {
        _id: "$mode",
        attemptsCount: { $sum: 1 },
        averageWpm: { $avg: "$score.wpm" },
        bestWpm: { $max: "$score.wpm" },
        bestAccuracy: { $max: "$score.accuracy" },
        lastAttemptAt: { $max: "$createdAt" }
      }
    }
  ];
}

async function aggregateUserByMode(userId: mongoose.Types.ObjectId, season: SeasonWindow | null): Promise<Map<RaceMode, UserModeAggregate>> {
  const aggregated = await TypingAttemptModel.aggregate<UserModeAggregate>(buildUserAggregatePipeline(userId, season));

  const byMode = new Map<RaceMode, UserModeAggregate>();
  for (const item of aggregated) {
    if ((raceModes as readonly string[]).includes(item._id)) {
      byMode.set(item._id, item);
    }
  }

  return byMode;
}

export async function recomputeUserTypingLeaderboards(userId: string): Promise<void> {
  const userObjectId = toMongooseObjectId(userId);
  const user = await UserModel.findById(userObjectId).select({ username: 1 }).lean();

  if (!user) {
    await LeaderboardEntryModel.deleteMany({ userId: userObjectId });
    return;
  }

  const currentSeason = getCurrentSeasonWindow();
  const [globalStats, seasonalStats] = await Promise.all([
    aggregateUserByMode(userObjectId, null),
    aggregateUserByMode(userObjectId, currentSeason)
  ]);

  const operations: Parameters<typeof LeaderboardEntryModel.bulkWrite>[0] = [];
  for (const mode of raceModes) {
    const global = globalStats.get(mode);
    const seasonal = seasonalStats.get(mode);

    if (global) {
      operations.push({
        updateOne: {
          filter: { scope: "global", seasonId: null, mode, userId: userObjectId },
          update: {
            $set: {
              username: user.username,
              attemptsCount: global.attemptsCount,
              bestWpm: roundScore(global.bestWpm),
              bestAccuracy: roundScore(global.bestAccuracy),
              averageWpm: roundScore(global.averageWpm),
              lastAttemptAt: global.lastAttemptAt
            }
          },
          upsert: true
        }
      });
    } else {
      operations.push({
        deleteOne: { filter: { scope: "global", seasonId: null, mode, userId: userObjectId } }
      });
    }

    if (seasonal) {
      operations.push({
        updateOne: {
          filter: { scope: "seasonal", seasonId: currentSeason.id, mode, userId: userObjectId },
          update: {
            $set: {
              username: user.username,
              attemptsCount: seasonal.attemptsCount,
              bestWpm: roundScore(seasonal.bestWpm),
              bestAccuracy: roundScore(seasonal.bestAccuracy),
              averageWpm: roundScore(seasonal.averageWpm),
              lastAttemptAt: seasonal.lastAttemptAt
            }
          },
          upsert: true
        }
      });
    } else {
      operations.push({
        deleteOne: {
          filter: { scope: "seasonal", seasonId: currentSeason.id, mode, userId: userObjectId }
        }
      });
    }
  }

  if (operations.length > 0) {
    await LeaderboardEntryModel.bulkWrite(operations, { ordered: false });
  }
}

function buildGlobalAggregatePipeline(input: FullRecomputeInput, season: SeasonWindow | null): mongoose.PipelineStage[] {
  const match: mongoose.FilterQuery<unknown> = {};
  if (input.mode) {
    match.mode = input.mode;
  }
  if (season) {
    match.createdAt = {
      $gte: new Date(season.startsAt),
      $lt: new Date(season.endsAt)
    };
  }

  return [
    { $match: match },
    {
      $group: {
        _id: { userId: "$userId", mode: "$mode" },
        attemptsCount: { $sum: 1 },
        averageWpm: { $avg: "$score.wpm" },
        bestWpm: { $max: "$score.wpm" },
        bestAccuracy: { $max: "$score.accuracy" },
        lastAttemptAt: { $max: "$createdAt" }
      }
    }
  ];
}

export async function recomputeTypingLeaderboardSnapshot(input: FullRecomputeInput): Promise<{ updatedEntries: number }> {
  const season = resolveSeason(input.scope, input.seasonId);
  const scopeSeasonId = season?.id ?? null;

  const aggregates = await TypingAttemptModel.aggregate<GlobalModeAggregate>(buildGlobalAggregatePipeline(input, season));
  const userIds = aggregates.map((entry) => entry._id.userId);
  const users = userIds.length
    ? await UserModel.find({ _id: { $in: userIds } }).select({ username: 1 }).lean()
    : [];

  const usernameById = new Map<string, string>();
  for (const user of users) {
    usernameById.set(user._id.toString(), user.username);
  }

  const cleanupFilter: mongoose.FilterQuery<unknown> = {
    scope: input.scope,
    seasonId: scopeSeasonId
  };
  if (input.mode) {
    cleanupFilter.mode = input.mode;
  }

  await LeaderboardEntryModel.deleteMany(cleanupFilter);

  if (aggregates.length === 0) {
    return { updatedEntries: 0 };
  }

  const documents = aggregates
    .map((entry) => {
      const userId = entry._id.userId.toString();
      const username = usernameById.get(userId);
      if (!username) {
        return null;
      }

      return {
        scope: input.scope,
        seasonId: scopeSeasonId,
        mode: entry._id.mode,
        userId: entry._id.userId,
        username,
        attemptsCount: entry.attemptsCount,
        bestWpm: roundScore(entry.bestWpm),
        bestAccuracy: roundScore(entry.bestAccuracy),
        averageWpm: roundScore(entry.averageWpm),
        lastAttemptAt: entry.lastAttemptAt
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  if (documents.length > 0) {
    await LeaderboardEntryModel.insertMany(documents, { ordered: false });
  }

  return { updatedEntries: documents.length };
}

function toApiEntry(document: {
  userId: mongoose.Types.ObjectId;
  username: string;
  attemptsCount: number;
  bestWpm: number;
  bestAccuracy: number;
  averageWpm: number;
  lastAttemptAt: Date;
}, rank: number): LeaderboardEntry {
  return {
    rank,
    userId: document.userId.toString(),
    username: document.username,
    attemptsCount: document.attemptsCount,
    bestWpm: roundScore(document.bestWpm),
    bestAccuracy: roundScore(document.bestAccuracy),
    averageWpm: roundScore(document.averageWpm),
    lastAttemptAt: document.lastAttemptAt.toISOString()
  };
}

export async function getTypingLeaderboard(query: TypingLeaderboardQuery): Promise<TypingLeaderboard> {
  const season = resolveSeason(query.scope, query.seasonId);
  const seasonId = season?.id ?? null;

  const entries = await LeaderboardEntryModel.find({
    scope: query.scope,
    seasonId,
    mode: query.mode
  })
    .sort({
      bestWpm: -1,
      bestAccuracy: -1,
      averageWpm: -1,
      attemptsCount: -1,
      lastAttemptAt: 1,
      userId: 1
    })
    .limit(query.limit)
    .lean();

  return {
    mode: query.mode,
    scope: query.scope,
    seasonId,
    generatedAt: new Date().toISOString(),
    entries: entries.map((entry, index) =>
      toApiEntry(
        {
          userId: entry.userId,
          username: entry.username,
          attemptsCount: entry.attemptsCount,
          bestWpm: entry.bestWpm,
          bestAccuracy: entry.bestAccuracy,
          averageWpm: entry.averageWpm,
          lastAttemptAt: entry.lastAttemptAt
        },
        index + 1
      )
    )
  };
}
