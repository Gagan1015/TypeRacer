import assert from "node:assert/strict";
import test from "node:test";
import type { LeaderboardEntry } from "@typeracrer/shared";
import { compareTypingLeaderboardEntries } from "./leaderboard.order.js";

function createEntry(partial: Partial<LeaderboardEntry> & Pick<LeaderboardEntry, "userId">): LeaderboardEntry {
  return {
    rank: partial.rank ?? 0,
    userId: partial.userId,
    username: partial.username ?? partial.userId,
    attemptsCount: partial.attemptsCount ?? 1,
    bestWpm: partial.bestWpm ?? 0,
    bestAccuracy: partial.bestAccuracy ?? 0,
    averageWpm: partial.averageWpm ?? 0,
    lastAttemptAt: partial.lastAttemptAt ?? new Date().toISOString()
  };
}

test("leaderboard ordering prioritizes speed then accuracy then consistency", () => {
  const entries: LeaderboardEntry[] = [
    createEntry({
      userId: "u2",
      bestWpm: 105,
      bestAccuracy: 99.5,
      averageWpm: 92,
      attemptsCount: 10,
      lastAttemptAt: "2026-02-10T00:00:00.000Z"
    }),
    createEntry({
      userId: "u1",
      bestWpm: 105,
      bestAccuracy: 99.5,
      averageWpm: 93,
      attemptsCount: 10,
      lastAttemptAt: "2026-02-12T00:00:00.000Z"
    }),
    createEntry({
      userId: "u3",
      bestWpm: 103,
      bestAccuracy: 100,
      averageWpm: 95,
      attemptsCount: 20,
      lastAttemptAt: "2026-02-11T00:00:00.000Z"
    })
  ];

  const sorted = [...entries].sort(compareTypingLeaderboardEntries);
  assert.equal(sorted[0]?.userId, "u1");
  assert.equal(sorted[1]?.userId, "u2");
  assert.equal(sorted[2]?.userId, "u3");
});

test("leaderboard ordering uses lastAttemptAt then userId as deterministic tie-breakers", () => {
  const early = createEntry({
    userId: "uA",
    bestWpm: 100,
    bestAccuracy: 98,
    averageWpm: 90,
    attemptsCount: 3,
    lastAttemptAt: "2026-02-01T00:00:00.000Z"
  });
  const late = createEntry({
    userId: "uB",
    bestWpm: 100,
    bestAccuracy: 98,
    averageWpm: 90,
    attemptsCount: 3,
    lastAttemptAt: "2026-02-02T00:00:00.000Z"
  });

  const sortedByTime = [late, early].sort(compareTypingLeaderboardEntries);
  assert.equal(sortedByTime[0]?.userId, "uA");

  const sameTimeA = createEntry({
    userId: "uA",
    bestWpm: 100,
    bestAccuracy: 98,
    averageWpm: 90,
    attemptsCount: 3,
    lastAttemptAt: "2026-02-01T00:00:00.000Z"
  });
  const sameTimeB = createEntry({
    userId: "uB",
    bestWpm: 100,
    bestAccuracy: 98,
    averageWpm: 90,
    attemptsCount: 3,
    lastAttemptAt: "2026-02-01T00:00:00.000Z"
  });

  const sortedById = [sameTimeB, sameTimeA].sort(compareTypingLeaderboardEntries);
  assert.equal(sortedById[0]?.userId, "uA");
});
