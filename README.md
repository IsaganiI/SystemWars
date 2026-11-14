# SystemWars

Competitive system design, built around ranked 1v1, 2v2, and 3v3 matches: solve the same architecture challenge, run the same deterministic workload, and compare results.

## Frontend design prototype

The frontend uses **Next.js App Router, React, TypeScript, and Tailwind CSS**. The lobby is a scene-led game client: a crisp vector routing backdrop with animated packet traces, a scrolling format feed, near-black/ivory/cyan colors, a Diamond rank emblem, mode selection, party state, and one match action.

Routes:

- `/` — game lobby with rank, match history, and selectable 1v1, 2v2, and 3v3 modes
- `/leaderboard` — sample global standings with format filters and player search
- `/matches` — sample match history with result and format filters, plus match details
- `/about` — game rules and match flow
- `/match` — challenge brief, architecture canvas, and component catalog

The rank, standings, match history, and architecture are illustrative. The home page mode selector, party slots, queue state, ready check, leaderboard filters, and history filters work locally; live matchmaking, drag and drop editing, simulation, and rating are not implemented yet.

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
2. Both players build from the same component catalog. The editor stores a graph of nodes, edges, and configuration. Match pacing remains to be designed.
3. Each submitted graph is validated server side, then passed to a deterministic simulator with the same workload and failure sequence.
4. The result records raw metrics, score breakdown, and the exact input versions so a match can be replayed and audited.
5. Rating changes only after both valid simulations complete; the result screen explains the outcome.

Keep scoring, validation, and simulation on the server. The browser should render the editor and results and send user actions, but never decide the winner. The next design milestone is defining the graph schema, first challenge, component behavior, and transparent scoring formula before building the multiplayer services.
