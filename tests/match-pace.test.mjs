import test from "node:test";
import assert from "node:assert/strict";
import { PACE, isReadyCheckExpired, readyCheckEndsAt, readyCheckExpiresAt } from "../src/lib/match-pace.ts";

test("match ready check gives players 30 seconds to accept", () => {
  const createdAt = 1_000_000;
  assert.equal(PACE.readyCheckSeconds, 30);
  assert.equal(readyCheckEndsAt(createdAt), createdAt + 30_000);
});

test("server keeps the ready check open for the late-accept grace period", () => {
  const createdAt = 1_000_000;
  const visibleDeadline = readyCheckEndsAt(createdAt);
  const serverDeadline = readyCheckExpiresAt(createdAt);
  assert.equal(PACE.readyCheckGraceSeconds, 10);
  assert.equal(isReadyCheckExpired(createdAt, visibleDeadline), false);
  assert.equal(isReadyCheckExpired(createdAt, serverDeadline - 1), false);
  assert.equal(isReadyCheckExpired(createdAt, serverDeadline), true);
});
