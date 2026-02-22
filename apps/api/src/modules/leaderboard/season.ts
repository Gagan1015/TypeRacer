import { seasonIdSchema, type LeaderboardSeason } from "@typeracrer/shared";
import { HttpError } from "../../utils/http-error.js";

export type SeasonWindow = LeaderboardSeason;

function startOfMonthUtc(year: number, monthIndex: number): Date {
  return new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
}

function toSeasonId(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function getSeasonWindowByDate(date: Date): SeasonWindow {
  const startsAt = startOfMonthUtc(date.getUTCFullYear(), date.getUTCMonth());
  const endsAt = startOfMonthUtc(date.getUTCFullYear(), date.getUTCMonth() + 1);
  return {
    id: toSeasonId(startsAt),
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    isCurrent: false
  };
}

export function getCurrentSeasonWindow(nowMs = Date.now()): SeasonWindow {
  const now = new Date(nowMs);
  const current = getSeasonWindowByDate(now);
  return { ...current, isCurrent: true };
}

export function parseSeasonWindow(seasonId: string): SeasonWindow {
  const parsed = seasonIdSchema.safeParse(seasonId);
  if (!parsed.success) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid seasonId format");
  }

  const [yearRaw, monthRaw] = parsed.data.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const startsAt = startOfMonthUtc(year, month - 1);
  const endsAt = startOfMonthUtc(year, month);

  return {
    id: parsed.data,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    isCurrent: parsed.data === getCurrentSeasonWindow().id
  };
}
