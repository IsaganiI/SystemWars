import test from "node:test";
import assert from "node:assert/strict";
import { selectMatchGroups } from "../src/lib/matchmaking-groups.ts";

function assertBalanced(result, teamSize) {
  assert.ok(result);
  const counts = [0, 0];
  result.groups.forEach((group, index) => { counts[result.assignment[index]] += group.size; });
  assert.deepEqual(counts, [teamSize, teamSize]);
}

test("a 2v2 party stays together while two solo players fill the match", () => {
  const result = selectMatchGroups([
    { group_id: "duo", queued_at: 0, size: 2, rating: 1000 },
    { group_id: "solo-a", queued_at: 1, size: 1, rating: 1000 },
    { group_id: "solo-b", queued_at: 2, size: 1, rating: 1000 },
  ], 2, 10);
  assertBalanced(result, 2);
  assert.equal(result.groups.find(group => group.group_id === "duo")?.size, 2);
});

test("a 3v3 party can fill with random solo teammates and opponents", () => {
  const groups = [
    { group_id: "duo", queued_at: 0, size: 2, rating: 1000 },
    ...Array.from({ length: 4 }, (_, index) => ({ group_id: `solo-${index}`, queued_at: index + 1, size: 1, rating: 1000 })),
  ];
  const result = selectMatchGroups(groups, 3, 10);
  assertBalanced(result, 3);
  const partyIndex = result.groups.findIndex(group => group.group_id === "duo");
  assert.notEqual(partyIndex, -1);
  assert.equal(result.assignment[partyIndex], 0);
  assert.equal(result.groups[partyIndex].size, 2);
});

test("3v3 selection skips party combinations that cannot fit intact on either team", () => {
  const groups = [
    ...Array.from({ length: 3 }, (_, index) => ({ group_id: `duo-${index}`, queued_at: index, size: 2, rating: 1000 })),
    ...Array.from({ length: 4 }, (_, index) => ({ group_id: `solo-${index}`, queued_at: index + 3, size: 1, rating: 1000 })),
  ];
  const result = selectMatchGroups(groups, 3, 10);
  assertBalanced(result, 3);
  assert.ok(result.groups.some(group => group.size === 2));
  for (let index = 0; index < result.groups.length; index++) {
    if (result.groups[index].size === 2) {
      const teamCount = result.groups.reduce((sum, group, groupIndex) => sum + (result.assignment[groupIndex] === result.assignment[index] ? group.size : 0), 0);
      assert.equal(teamCount, 3);
    }
  }
});

test("random 3v3 queues pair six solo tickets into two full teams", () => {
  const groups = Array.from({ length: 6 }, (_, index) => ({ group_id: `solo-${index}`, queued_at: index, size: 1, rating: 1000 }));
  const result = selectMatchGroups(groups, 3, 10);
  assertBalanced(result, 3);
  assert.equal(result.groups.length, 6);
});
