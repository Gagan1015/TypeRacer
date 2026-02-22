import type { LeaderboardEntry } from "@typeracrer/shared";

export function compareTypingLeaderboardEntries(a: LeaderboardEntry, b: LeaderboardEntry): number {
  if (a.bestWpm !== b.bestWpm) {
    return b.bestWpm - a.bestWpm;
  }
  if (a.bestAccuracy !== b.bestAccuracy) {
    return b.bestAccuracy - a.bestAccuracy;
  }
  if (a.averageWpm !== b.averageWpm) {
    return b.averageWpm - a.averageWpm;
  }
  if (a.attemptsCount !== b.attemptsCount) {
    return b.attemptsCount - a.attemptsCount;
  }
  if (a.lastAttemptAt !== b.lastAttemptAt) {
    return a.lastAttemptAt.localeCompare(b.lastAttemptAt);
  }
  return a.userId.localeCompare(b.userId);
}
