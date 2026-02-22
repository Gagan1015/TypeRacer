import assert from "node:assert/strict";
import test from "node:test";
import { computeRankedMatchDeltas } from "./ranked.math.js";

test("ranked deltas are deterministic for identical input", () => {
  const participants = [
    { userId: "u1", username: "alpha", place: 1 },
    { userId: "u2", username: "bravo", place: 2 },
    { userId: "u3", username: "charlie", place: 3 }
  ];
  const ratings = new Map<string, number>([
    ["u1", 1200],
    ["u2", 1200],
    ["u3", 1200]
  ]);

  const first = computeRankedMatchDeltas(participants, ratings);
  const second = computeRankedMatchDeltas(participants, ratings);

  assert.deepEqual(first, second);
});

test("top finisher gains rating while bottom finisher loses rating", () => {
  const participants = [
    { userId: "u1", username: "alpha", place: 1 },
    { userId: "u2", username: "bravo", place: 2 },
    { userId: "u3", username: "charlie", place: 3 }
  ];
  const ratings = new Map<string, number>([
    ["u1", 1200],
    ["u2", 1200],
    ["u3", 1200]
  ]);

  const deltas = computeRankedMatchDeltas(participants, ratings);
  const winner = deltas.find((entry) => entry.userId === "u1");
  const loser = deltas.find((entry) => entry.userId === "u3");
  const middle = deltas.find((entry) => entry.userId === "u2");

  assert.ok(winner);
  assert.ok(loser);
  assert.ok(middle);
  assert.ok((winner?.delta ?? 0) > 0);
  assert.ok((loser?.delta ?? 0) < 0);
  assert.equal(middle?.delta, 0);
});

test("upset results produce larger transfer than expected results", () => {
  const favoriteWins = computeRankedMatchDeltas(
    [
      { userId: "high", username: "high", place: 1 },
      { userId: "low", username: "low", place: 2 }
    ],
    new Map<string, number>([
      ["high", 1600],
      ["low", 1200]
    ])
  );

  const upsetWin = computeRankedMatchDeltas(
    [
      { userId: "high", username: "high", place: 2 },
      { userId: "low", username: "low", place: 1 }
    ],
    new Map<string, number>([
      ["high", 1600],
      ["low", 1200]
    ])
  );

  const expectedDelta = favoriteWins.find((entry) => entry.userId === "high")?.delta ?? 0;
  const upsetDelta = upsetWin.find((entry) => entry.userId === "low")?.delta ?? 0;

  assert.ok(Math.abs(upsetDelta) > Math.abs(expectedDelta));
});
