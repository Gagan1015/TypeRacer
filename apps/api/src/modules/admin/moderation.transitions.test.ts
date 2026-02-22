import assert from "node:assert/strict";
import test from "node:test";
import { isValidReportTransition } from "./moderation.transitions.js";

test("allows open report progression to review and resolutions", () => {
  assert.equal(isValidReportTransition("open", "in_review"), true);
  assert.equal(isValidReportTransition("open", "resolved_cheat"), true);
  assert.equal(isValidReportTransition("open", "resolved_clean"), true);
  assert.equal(isValidReportTransition("open", "dismissed"), true);
});

test("allows reopening from in_review only", () => {
  assert.equal(isValidReportTransition("in_review", "open"), true);
  assert.equal(isValidReportTransition("resolved_cheat", "open"), false);
  assert.equal(isValidReportTransition("resolved_clean", "open"), false);
});

test("resolved reports only move to in_review or dismissed", () => {
  assert.equal(isValidReportTransition("resolved_cheat", "in_review"), true);
  assert.equal(isValidReportTransition("resolved_clean", "dismissed"), true);
  assert.equal(isValidReportTransition("resolved_clean", "resolved_cheat"), false);
});
