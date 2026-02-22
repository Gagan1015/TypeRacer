import type { RankedMatchDelta, RankedOutcome } from "@typeracrer/shared";

const DEFAULT_RATING = 1200;
const MIN_RATING = 100;
const MAX_RATING = 4000;
const SCORE_ROUNDING_PRECISION = 100;

export type RankedParticipant = {
  userId: string;
  username: string;
  place: number;
};

type RatingMap = Map<string, number>;

function roundScore(value: number): number {
  return Math.round(value * SCORE_ROUNDING_PRECISION) / SCORE_ROUNDING_PRECISION;
}

function clampRating(value: number): number {
  return Math.max(MIN_RATING, Math.min(MAX_RATING, value));
}

function expectedScore(playerRating: number, opponentRating: number): number {
  return 1 / (1 + 10 ** ((opponentRating - playerRating) / 400));
}

function actualScoreAgainstOpponent(playerPlace: number, opponentPlace: number): number {
  if (playerPlace < opponentPlace) {
    return 1;
  }
  if (playerPlace > opponentPlace) {
    return 0;
  }
  return 0.5;
}

function toOutcome(actualNormalized: number): RankedOutcome {
  if (actualNormalized > 0.5) {
    return "win";
  }
  if (actualNormalized < 0.5) {
    return "loss";
  }
  return "draw";
}

export function normalizeRankedParticipants(participants: RankedParticipant[]): RankedParticipant[] {
  return [...participants]
    .sort((a, b) => {
      if (a.place !== b.place) {
        return a.place - b.place;
      }
      return a.userId.localeCompare(b.userId);
    })
    .filter((participant, index, list) => index === 0 || list[index - 1]?.userId !== participant.userId);
}

export function computeRankedMatchDeltas(
  participants: RankedParticipant[],
  ratingByUserId: RatingMap,
  kFactor = 24
): RankedMatchDelta[] {
  const normalized = normalizeRankedParticipants(participants);
  if (normalized.length === 0) {
    return [];
  }

  if (normalized.length === 1) {
    const single = normalized[0];
    if (!single) {
      return [];
    }
    const oldRating = roundScore(ratingByUserId.get(single.userId) ?? DEFAULT_RATING);
    return [
      {
        userId: single.userId,
        username: single.username,
        place: single.place,
        oldRating,
        newRating: oldRating,
        delta: 0,
        outcome: "draw"
      }
    ];
  }

  return normalized.map((player) => {
    const currentRating = ratingByUserId.get(player.userId) ?? DEFAULT_RATING;
    let expected = 0;
    let actual = 0;

    for (const opponent of normalized) {
      if (opponent.userId === player.userId) {
        continue;
      }
      const opponentRating = ratingByUserId.get(opponent.userId) ?? DEFAULT_RATING;
      expected += expectedScore(currentRating, opponentRating);
      actual += actualScoreAgainstOpponent(player.place, opponent.place);
    }

    const denominator = normalized.length - 1;
    const expectedNormalized = denominator > 0 ? expected / denominator : 0;
    const actualNormalized = denominator > 0 ? actual / denominator : 0;
    const delta = roundScore(kFactor * (actualNormalized - expectedNormalized));
    const newRating = roundScore(clampRating(currentRating + delta));

    return {
      userId: player.userId,
      username: player.username,
      place: player.place,
      oldRating: roundScore(currentRating),
      newRating,
      delta: roundScore(newRating - currentRating),
      outcome: toOutcome(actualNormalized)
    };
  });
}

export function getDefaultRankedRatingValue(): number {
  return DEFAULT_RATING;
}
