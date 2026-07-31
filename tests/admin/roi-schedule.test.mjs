import assert from "node:assert/strict";
import test from "node:test";

import {
  isAutomaticRoiExpected,
  isRoiRunStalled,
} from "../../src/features/admin/roi/roi-schedule.ts";

test("automatic ROI is not considered missing before 2 AM IST", () => {
  assert.equal(
    isAutomaticRoiExpected(new Date("2026-07-30T20:29:59.000Z")),
    false,
  );
  assert.equal(
    isAutomaticRoiExpected(new Date("2026-07-30T20:30:00.000Z")),
    true,
  );
});

test("a running ROI job is considered stalled after twenty minutes", () => {
  const startedAt = new Date("2026-07-31T00:00:00.000Z");
  assert.equal(
    isRoiRunStalled(startedAt, new Date("2026-07-31T00:20:00.000Z")),
    false,
  );
  assert.equal(
    isRoiRunStalled(startedAt, new Date("2026-07-31T00:20:00.001Z")),
    true,
  );
});
