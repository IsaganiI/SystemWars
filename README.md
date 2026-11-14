# SystemWars

A competitive system design game in progress. The current build includes a public landing page with an interactive architecture preview, account registration, onboarding, protected lobby, local ranked matchmaking for 1v1, 2v2, and 3v3, ready checks, a first build canvas, and submission tracking.

## Run locally

Use Node.js 20.9 or newer. Install dependencies and create a local environment file:

```bash
npm install
cp .env.example .env.local
```

Set `BETTER_AUTH_SECRET` in `.env.local` to a long random value. Keep `BETTER_AUTH_URL` set to `http://localhost:3000` for local development. Create the auth tables, then start the server:

```bash
npx auth@latest migrate --yes
npm run dev
```

Open `http://localhost:3000`. Local data is stored in `.data/systemwars.sqlite` and is ignored by Git. Run `npm run lint`, `npm run typecheck`, and `npm run build` before shipping.

## Current routes

- `/` — public landing page and animated system building preview
- `/register`, `/login`, `/onboarding` — account setup
- `/play` — signed-in lobby with mode selection and live queue
- `/match?id=…` — first architecture build flow for a ready match
- `/results?id=…` — saved submission status
- `/leaderboard`, `/matches`, `/about`, `/account` — standings, history, rules, and profile

The queue pairs signed-in players in the same mode on this local server. Every player must accept before the match opens. The canvas currently supports a small selectable component set and stores a team submission. The deterministic simulator, scoring, ratings, shared canvas editing, and completed match history are next milestones. Until the simulator is connected, results show submission status without fabricated metrics or winners.

SQLite is suitable for the current single-server development build. A shared persistent database and cross-instance matchmaking coordination are required before running multiple application instances.
