# SystemWars

A competitive system design game with account registration, a ranked queue, challenge veto, an interactive system builder, scored match results, ratings, leaderboards, match history, and friend requests.

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
- `/play` — protected lobby with mode selection and ranked queue
- `/veto?id=…` — each side bans one system design challenge before the build
- `/match?id=…` — architecture builder for the selected challenge
- `/results?id=…` — live match result and scorecard
- `/leaderboard`, `/matches`, `/account` — standings, match history, and account
- `/players`, `/players/:id` — player discovery, public profiles, and friend requests

The queue pairs signed-in players by mode and expanding rating range on this local server. After 30 seconds without a human opponent, a 1v1 player gets a clearly labeled System AI practice match. The AI submits a curated architecture, and the result shows both scores. Practice matches do not change SR. Every player accepts before veto. Each team bans one challenge, then builds an architecture for the remaining one. Each side has a server-stored canvas. Teammates in 2v2 and 3v3 can place, move, connect, and annotate components together; edits are merged by item and appear on teammates' screens after a short poll. The canvas also survives refresh. One teammate submits the shared design for the team. When both teams submit, a deterministic, scenario-specific rubric scores connected component choices and forward paths across five design metrics. These are architecture-readiness signals, not measured capacity or latency. The higher score wins; human ranked matches update Elo ratings once per player. Historical results keep their original scores and SR. The public landing page contains an explicitly labeled interactive example, separate from match records.

Human 2v2 and 3v3 matches have an opt-in team voice panel in the builder (teammates only; a 1v1 has no voice). Push to talk is the default (hold `V` or the talk button), with an open-mic option, speaking indicators, and per-teammate mute. Browser microphone permission is required. Audio uses peer-to-peer WebRTC with SQLite-backed signaling. Set `SYSTEMWARS_TURN_URLS`, `SYSTEMWARS_TURN_USERNAME`, and `SYSTEMWARS_TURN_CREDENTIAL` to use a TURN relay for players behind restrictive networks. `SYSTEMWARS_STUN_URLS` overrides the default public STUN server. Voice is not recorded or stored.

## Match pace

Timings live in `src/lib/match-pace.ts` and every deadline is enforced by the server. A found match must be accepted by every player within 15 seconds; players who accepted go back into the queue with their original place if someone does not. The build clock starts when the last player confirms the brief and runs 5:00 (1v1), 6:00 (2v2) or 7:00 (3v3). It turns into a warning for the last 30 seconds. At 0:00 the browser submits whatever is on the canvas, even half built. If a team never submits, the server locks in its saved canvas 10 seconds later and scores the match, so a match never stalls.

Design notes for upcoming surprise mechanics (mid-build curveballs and sabotage cards) are in `docs/curveballs-and-sabotage.md`.

SQLite is suitable for the current single-server development build. A shared persistent database and cross-instance matchmaking coordination are required before running multiple application instances.

Run `npm test` to check canvas merge behavior and scoring rules.
