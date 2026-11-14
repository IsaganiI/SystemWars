# SystemWars

Competitive system design, built around a ranked 1v1 loop: match with a rival, solve the same architecture challenge, run the same deterministic workload, and compare results.

## Frontend design prototype

The frontend uses **Next.js App Router, React, TypeScript, and Tailwind CSS**. Its visual direction draws on competitive game interfaces: bold condensed headlines, a dark arena palette, red action cues, rank identity, and a focused match HUD.

Routes:

- `/` — ranked lobby and game loop
- `/match` — challenge brief, architecture canvas, and component catalog
- `/results` — head to head comparison and rank progression concept

The timer, rank, opponent, architecture, metrics, and result are illustrative. Matchmaking, drag and drop editing, simulation, and rating are not implemented yet. The original HTML design is kept in `design/reference/`.

## Run locally

Install Node.js 20.9 or newer, then:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Use `npm run build`, `npm run lint`, and `npm run typecheck` to verify changes.

## Product architecture direction

The first playable slice should complete one 1v1 match with one challenge and a small component catalog:

1. Matchmaking pairs two players and creates a match with a fixed challenge version, simulation version, and seed.
2. Both players build from the same component catalog under one timer and budget. The editor stores a graph of nodes, edges, and configuration.
3. Each submitted graph is validated server side, then passed to a deterministic simulator with the same workload and failure sequence.
4. The result records raw metrics, score breakdown, and the exact input versions so a match can be replayed and audited.
5. Rating changes only after both valid simulations complete; the result screen explains the outcome.

Keep scoring, validation, and simulation on the server. The browser should render the editor and results and send user actions, but never decide the winner. The next design milestone is defining the graph schema, first challenge, component behavior, and transparent scoring formula before building the multiplayer services.
