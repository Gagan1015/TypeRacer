import type { LeaderboardScope, RaceMode } from "@typeracrer/shared";
import { recomputeTypingLeaderboardSnapshot, recomputeUserTypingLeaderboards } from "../modules/leaderboard/leaderboard.service.js";

type UserLeaderboardRecomputeJob = {
  key: string;
  type: "user_recompute";
  userId: string;
};

type FullLeaderboardRecomputeJob = {
  key: string;
  type: "full_recompute";
  scope: LeaderboardScope;
  seasonId?: string;
  mode?: RaceMode;
};

type LeaderboardRecomputeJob = UserLeaderboardRecomputeJob | FullLeaderboardRecomputeJob;

const pendingJobs: LeaderboardRecomputeJob[] = [];
const pendingKeys = new Set<string>();
let processing = false;

function processLater(): void {
  if (processing) {
    return;
  }

  processing = true;
  setImmediate(() => {
    void drainQueue().catch((error) => {
      console.error("[jobs] leaderboard queue processing failed", error);
    });
  });
}

async function runJob(job: LeaderboardRecomputeJob): Promise<void> {
  if (job.type === "user_recompute") {
    await recomputeUserTypingLeaderboards(job.userId);
    return;
  }

  const payload: {
    scope: LeaderboardScope;
    seasonId?: string;
    mode?: RaceMode;
  } = { scope: job.scope };
  if (job.seasonId !== undefined) {
    payload.seasonId = job.seasonId;
  }
  if (job.mode !== undefined) {
    payload.mode = job.mode;
  }

  await recomputeTypingLeaderboardSnapshot(payload);
}

async function drainQueue(): Promise<void> {
  try {
    while (pendingJobs.length > 0) {
      const next = pendingJobs.shift();
      if (!next) {
        continue;
      }

      pendingKeys.delete(next.key);
      try {
        await runJob(next);
      } catch (error) {
        console.error("[jobs] leaderboard job failed", { type: next.type, key: next.key, error });
      }
    }
  } finally {
    processing = false;
    if (pendingJobs.length > 0) {
      processLater();
    }
  }
}

function enqueue(job: LeaderboardRecomputeJob): void {
  if (pendingKeys.has(job.key)) {
    return;
  }

  pendingKeys.add(job.key);
  pendingJobs.push(job);
  processLater();
}

export function enqueueUserLeaderboardRecompute(userId: string): void {
  enqueue({
    type: "user_recompute",
    userId,
    key: `user:${userId}`
  });
}

export function enqueueFullLeaderboardRecompute(input: {
  scope: LeaderboardScope;
  seasonId?: string;
  mode?: RaceMode;
}): string {
  const key = `full:${input.scope}:${input.seasonId ?? "current"}:${input.mode ?? "all"}`;
  const job: FullLeaderboardRecomputeJob = {
    type: "full_recompute",
    key,
    scope: input.scope
  };
  if (input.seasonId !== undefined) {
    job.seasonId = input.seasonId;
  }
  if (input.mode !== undefined) {
    job.mode = input.mode;
  }

  enqueue(job);
  return key;
}

export function getLeaderboardQueueStatus(): { pending: number; processing: boolean } {
  return {
    pending: pendingJobs.length,
    processing
  };
}
