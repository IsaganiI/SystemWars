# SystemWars interface direction

## Reference patterns

- [Counter-Strike 2 Premier](https://www.strafe.com/news/read/how-to-unlock-premier-cs2/): mode navigation, party and rating context, leaderboard alongside play, one clear queue action.
- [VALORANT queue screen](https://ge.globo.com/esports/valorant/noticia/2022/10/13/valorant-tera-novas-interfaces-veja-imagens.ghtml): readiness and party state dominate the lobby; the primary action sits at the bottom.
- [Steam's CS2 rank guide](https://help.steampowered.com/en/faqs/view/3204-9FB1-967F-1AC6): competitive rating and progress are visible in the player's context.

These are interaction references, not a palette, typography, artwork, or layout to reproduce.

## SystemWars decisions

1. The home screen is a **Play lobby**, with a slim navigation rail, player rank, 1v1/2v2/3v3 selection, one match action, and recent matches. About and Results pages are deferred.
2. The lobby uses a dark routing field with a clear center for the player profile. The Diamond globe badge is vector art based on the supplied rank sheet; the other ranks are deferred. Keep win rate, record, and global rank off the main lobby until they have a natural home.
3. Use near-black surfaces, warm ivory selected actions, cyan system signals, and rank-specific color in the profile. Diamond uses blue. Avoid a universal orange accent.
4. Use Rajdhani for the interface and measured results. Keep the large lobby title restrained to the main scene.
5. The match screen should give the editor the most space; challenge and component catalog support it. A future result screen should explain why a player won, using raw metrics alongside any score.
6. Prototype states must be labeled clearly. A player must never mistake a sample match, ranking, or simulation for a live one.

## Game feel without decoration

- Show the player's party for the chosen 1v1, 2v2, or 3v3 format. The current player's slot stays filled; teammate slots are visibly open.
- The match action changes to a cancellable queue preview state, then an explicit match found ready check. Keep those states labeled as previews until real matchmaking exists.
- Keep rank progress and match history tied to competitive outcomes. Avoid budgets, practice challenges, extra currencies, daily contracts, season pass meters, and fake countdowns in this first lobby.
- Use brief entrance motion, mode selection and party-slot feedback, a searching indicator, and a ready-check reveal. Packet traces move along the desktop routing paths, and the format feed scrolls. Reduce or remove motion on small screens and when reduced motion is requested.
