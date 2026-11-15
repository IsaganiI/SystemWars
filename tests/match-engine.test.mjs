import test from "node:test";
import assert from "node:assert/strict";
import { scoreArchitecture } from "../src/lib/scoring.ts";
import { applyCanvasOperations, emptyCanvas, parseCanvasOperations } from "../src/lib/shared-canvas.ts";

test("live chat connection score requires a forward route", () => {
  const nodes = [{ id: "lb", kind: "balancer" }, { id: "ws", kind: "websocket" }, { id: "app", kind: "app" }];
  const forward = scoreArchitecture("live-chat", { nodes, edges: [{ from: "lb", to: "ws" }, { from: "lb", to: "app" }] });
  const reverse = scoreArchitecture("live-chat", { nodes, edges: [{ from: "ws", to: "lb" }, { from: "lb", to: "app" }] });
  assert.equal(forward.breakdown[0].earned, 20);
  assert.equal(reverse.breakdown[0].earned, 14);
});

test("isolated components do not earn architecture points", () => {
  const result = scoreArchitecture("live-chat", { nodes: [{ id: "lb", kind: "balancer" }, { id: "ws", kind: "websocket" }, { id: "app", kind: "app" }], edges: [{ from: "lb", to: "app" }] });
  assert.equal(result.breakdown[0].earned, 10);
});

test("team canvas merges edits to different nodes without replacing the board", () => {
  const first = parseCanvasOperations([{ collection: "nodes", action: "upsert", item: { id: "a", componentId: "app", x: 10, y: 20 } }]);
  const second = parseCanvasOperations([{ collection: "nodes", action: "upsert", item: { id: "b", componentId: "database", x: 70, y: 20 } }]);
  assert.ok(first && second);
  const canvas = applyCanvasOperations(applyCanvasOperations(emptyCanvas(), first), second);
  assert.deepEqual(canvas.nodes.map(node => node.id).sort(), ["a", "b"]);
  assert.equal(parseCanvasOperations([{ collection: "nodes", action: "upsert", item: { id: "x", componentId: "unknown", x: 10, y: 20 } }]), null);
});

test("removing a node also removes its connections", () => {
  const canvas = applyCanvasOperations(emptyCanvas(), parseCanvasOperations([
    { collection: "nodes", action: "upsert", item: { id: "a", componentId: "app", x: 10, y: 20 } },
    { collection: "nodes", action: "upsert", item: { id: "b", componentId: "database", x: 70, y: 20 } },
    { collection: "edges", action: "upsert", item: { id: "a-b", from: "a", to: "b" } },
  ]));
  const withoutNode = applyCanvasOperations(canvas, [{ collection: "nodes", action: "remove", id: "a" }]);
  assert.deepEqual(withoutNode.nodes.map(node => node.id), ["b"]);
  assert.equal(withoutNode.edges.length, 0);
});
