# SystemWars interface direction

## Reference patterns

- [Counter-Strike 2 Premier](https://www.strafe.com/news/read/how-to-unlock-premier-cs2/): mode navigation, party and rating context, leaderboard alongside play, one clear queue action.
- [VALORANT queue screen](https://ge.globo.com/esports/valorant/noticia/2022/10/13/valorant-tera-novas-interfaces-veja-imagens.ghtml): readiness and party state dominate the lobby; the primary action sits at the bottom.
- [Steam's CS2 rank guide](https://help.steampowered.com/en/faqs/view/3204-9FB1-967F-1AC6): competitive rating and progress are visible in the player's context.

These are interaction references, not a palette, typography, artwork, or layout to reproduce.

## SystemWars decisions

1. The home screen is a **lobby**, with mode, player, rank, selected challenge, and match action. The explanation belongs on `/about`.
2. A network route diagram is the game's own visual motif. It can later show the selected challenge, a player's build, and the simulated request path.
3. Use neutral charcoal, pale type, and a restrained amber action color. Rank uses a quiet steel tone. Avoid color on every label.
4. Use Manrope for the interface and monospaced numerals for measured results. Avoid oversized slogans and condensed display fonts.
5. The match screen should give the editor the most space; challenge and component catalog support it. The result screen should explain why a player won, using raw metrics alongside any score.
6. Prototype states must be labeled clearly. A player must never mistake a sample match, ranking, or simulation for a live one.
