# SystemWars interface direction

## Reference patterns

- [Counter-Strike 2 Premier](https://www.strafe.com/news/read/how-to-unlock-premier-cs2/): mode navigation, party and rating context, leaderboard alongside play, one clear queue action.
- [VALORANT queue screen](https://ge.globo.com/esports/valorant/noticia/2022/10/13/valorant-tera-novas-interfaces-veja-imagens.ghtml): readiness and party state dominate the lobby; the primary action sits at the bottom.
- [Steam's CS2 rank guide](https://help.steampowered.com/en/faqs/view/3204-9FB1-967F-1AC6): competitive rating and progress are visible in the player's context.

These are interaction references, not a palette, typography, artwork, or layout to reproduce.

## SystemWars decisions

1. The home screen is a **lobby**, with left navigation, player rank, 1v1/2v2/3v3 selection, one match action, recent matches, activity, and a practice challenge. The explanation belongs on `/about`.
2. The lobby follows the supplied game-client reference's information hierarchy, while using SystemWars content and a separate color system. Rank artwork is a placeholder until its visual language is designed.
3. Use midnight slate, pale type, and restrained periwinkle blue for selection and the match action. Results use small success and loss indicators. Avoid color on every label.
4. Use Manrope for the interface and monospaced numerals for measured results. Avoid oversized slogans and condensed display fonts.
5. The match screen should give the editor the most space; challenge and component catalog support it. The result screen should explain why a player won, using raw metrics alongside any score.
6. Prototype states must be labeled clearly. A player must never mistake a sample match, ranking, or simulation for a live one.

## Game feel without decoration

- Show the player's party for the chosen 1v1, 2v2, or 3v3 format. The current player's slot stays filled; teammate slots are visibly open.
- The match action changes to a cancellable queue preview state. Keep that state explicit until real matchmaking exists.
- Keep rank progress and match history tied to competitive outcomes. Avoid extra currencies, daily contracts, season pass meters, and fake countdowns in this first lobby.
- Use motion only for state changes and feedback, with reduced motion support.
