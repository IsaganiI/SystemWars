# SystemWars: Mid-build curveballs and sabotage cards

Design for two surprise mechanics. Players don't just suffer these events: they can **counter, redirect, amplify, delay, trade and bluff** with them. Status: designed, not built.

---

## Chaos Points (CP)

CP is a currency **earned during the match**. It is not a one-time budget. You start with a little, earn more by building well, and spend it on sabotage and defense. It resets every match.

**Start:** 2 CP, enough for one small play, so you have to choose early.

**Ways to earn CP** (max 6 CP held at once, so nobody can hoard)

| How | CP | Why it exists |
|---|---|---|
| Passive income: +1 every 90 s of build time | +1 | Steady trickle, so everyone gets some |
| Handle the curveball within 30 s | +1 | Rewards adapting fast |
| Meet a requirement early (for example, the DB failover is covered) | +1 | Rewards good design, not just aggression |
| Your Firewall or Mirror blocks a real card | +1 | Rewards reading your opponent |
| An opponent's card was a Decoy you didn't waste a counter on | +1 | Rewards keeping your nerve |
| Submit with 1:00 or more left | +1 | Rewards confidence and speed |

**Ways to spend CP:** play sabotage cards, play manipulation cards (Mirror, Firewall, Intel), or manipulate a curveball (Lobby, Insure, Rollback).

**Rules**
- CP doesn't carry over between matches, and it can't be bought.
- In 2v2 and 3v3, the team shares one CP pool. Teammates decide together over voice chat.
- Unspent CP at the end of the build converts to a small amount of XP (+10 per CP), so saving isn't wasted.
- Every card and curveball stays **face-down** until the battle. You know something is coming, but not what.

---

## Part 1: Mid-build curveballs

These hit both teams at the midpoint of the build. The game plays them, but players can manipulate them.

| Curveball | What changes | Ways to manipulate it |
|---|---|---|
| **Budget cut** | Lose 20% of your budget, and the most expensive part is removed | **Sell back:** remove a part yourself for a 50% refund instead of losing the priciest. **Absorb (1 CP):** take only a 10% cut |
| **Data residency law** | All user data must stay in one region. Cross-region replicas stop counting | **Lobby (1 CP):** delay the law until wave 3. **Comply early:** if you're already compliant, gain +1 CP |
| **Celebrity drop** | Traffic triples during wave 2 | **Pre-warm:** stage a cache now for +20% cache hit rate. **Redirect (2 CP):** move the spike to your opponent's wave 1, when they're least ready |
| **Vendor outage** | Your CDN provider is down for the whole battle | **Swap:** turn your CDN into an app server for free. **Insure (1 CP):** CDN comes back after 30 s |
| **Feature request** | The PM adds "live chat," which needs a message queue or you lose 10% score | **Negotiate (1 CP):** turn it into a bonus objective instead. **Ship it:** if you add the queue, gain +1 CP |
| **Database migration** | Your primary DB is read-only during wave 1 | **Queue it:** a message queue buffers the writes. **Rollback (2 CP):** cancel the migration for your team only |
| **Security audit** | Any part without a WAF or gateway loses 5% availability | **Patch:** add a WAF at half price. **Bribe the auditor (1 CP):** pass the audit, but your opponent sees that you did |
| **Hiring freeze** | You can't add new parts for 45 s | **Crunch time (1 CP):** cut it to 15 s. **Pair up:** in 2v2, one teammate unlocks early |

**Twist: Curveball Draft.** Instead of a random curveball, both teams see 2 options face-down. Each team may **flip one card face-up** (1 CP) to peek. Then a quick team vote decides which curveball is applied to everyone.

---

## Part 2: Sabotage cards

Each team draws **3 random cards** at the midpoint of the build and can play **one** (or two, with enough CP) against the opponent. Played cards stay face-down until they trigger in battle.

### Attack cards

| Card | Cost | Effect in battle | How the target can counter |
|---|---|---|---|
| **Cold Cache** | 1 CP | Opponent's cache starts empty, at a 0% hit rate for 20 s | A CDN halves the effect |
| **Hot Key** | 1 CP | One item gets 40% of all traffic (like a single popular ticket) | A replica spreads the reads |
| **Region Down** | 2 CP | One region goes dark for 30 s | A cross-region replica fails over |
| **Bot Swarm** | 1 CP | 2× fake checkout traffic | A WAF or rate limiter blocks 70% |
| **Slow Disk** | 1 CP | The opponent's DB is 3× slower for a full wave | A cache absorbs the reads |
| **Thundering Herd** | 2 CP | Every client retries at once after an outage | A message queue smooths it out |
| **Noisy Neighbor** | 1 CP | One of the opponent's app servers runs at half speed | More app servers dilute it |
| **Expired Certificate** | 2 CP | The opponent's load balancer rejects requests for 10 s | A second load balancer, or a gateway |

### Manipulation cards (the mind games)

| Card | Cost | Effect |
|---|---|---|
| **Mirror** | 2 CP | Reflects the next card played on you back at the sender |
| **Firewall** | 1 CP | Blocks one incoming card. You don't learn which one until battle |
| **Amplify** | 1 CP | Doubles the strength of one card you played |
| **Delay** | 1 CP | Pushes an incoming card from wave 1 to the final wave, or forward from the final wave to wave 1 |
| **Decoy** | 0 CP | A fake face-down card. Opponents might waste a Firewall or Mirror on it |
| **Intel** | 1 CP | Peek at one face-down card your opponent sent you |
| **Swap** | 2 CP | Trade one of your unplayed cards for a random card from the opponent's hand |
| **Chain Reaction** | 3 CP | If your attack causes an outage, the next attack is free and lands immediately |
| **Insurance** | 1 CP | If you lose a wave to a sabotage card, you get the SR difference back as XP |

### Combos (rewarding clever play)

- **Hot Key + Cold Cache:** a popular item hits an empty cache. Brutal unless they have a replica.
- **Region Down + Thundering Herd:** the outage, then everyone retries at once.
- **Decoy + Decoy + real card:** three face-down cards, and they can only Firewall one.
- **Mirror + Delay:** reflect a card and delay it to the opponent's final wave.

---

## How a match plays out

Timeline for a 5:00 1v1 build:

| Time left | What happens |
|---|---|
| **5:00** | Brief revealed. You have 2 CP. |
| **3:30** | +1 CP passive (3 CP). |
| **2:30** | **Curveball hits both teams.** You have 30 s to handle it or manipulate it. |
| **2:00** | **Each team draws 3 sabotage cards.** A hand appears at the bottom of the screen. +1 CP passive. |
| **2:00 → 0:30** | **Play phase.** Drag a card onto the opponent's side to play it face-down. Each card costs CP. Your opponent sees a face-down card arrive, but not what it is. |
| **0:30 → 0:00** | **Response window.** You see how many face-down cards are aimed at you. Spend CP on Firewall, Mirror or Intel, or bluff with a Decoy. No new attacks after 0:30, which prevents last-second sniping. |
| **0:00** | Build locks. Cards stay face-down. |
| **Battle** | Cards flip as their wave arrives, with a reveal moment: "HOT KEY! … countered by your read replica." |
| **Results** | A "Cards played" timeline shows every card, who played it, whether it was blocked, and how much it hurt. |

### Examples

- **Simple attack:** you have 3 CP and play **Slow Disk** (1 CP) on your opponent, leaving 2. In battle their DB slows down. They had a cache, so the damage is small. A good build beats a lucky card.
- **The bluff:** you play a **Decoy** (0 CP) and **Hot Key** (1 CP). Your opponent sees two face-down cards and has only enough CP for one Firewall. They pick the Decoy. Hot Key lands.
- **The reversal:** your opponent sends **Region Down** (2 CP). You suspect a big hit and spend 1 CP on **Intel**: it's Region Down. You spend 2 CP on **Mirror**. It flips back on them in battle, and they spent 2 CP for nothing.

---

## Balance and fairness

- **Everyone earns CP,** but good builders earn more, so skill matters more than luck.
- **The 6 CP cap and the 0:30 cutoff** stop hoarding and last-second sniping.
- **Every attack has a counter that can be built,** so you can defend just by building well, without spending any CP.
- **Damage is capped at 15% per card,** so one card can't decide a match on its own.
- **Hidden decks:** cards come from a shared, balanced deck. No buying cards, ever.
- **Separate playlists:** a **Chaos** mode (more cards, crazier combos) and a **ranked** mode (fewer cards, stricter balance).

## What it needs to be built

- The simulator, so card effects and counters actually change the battle.
- Server-side card state: hands, CP and face-down plays live on the server, so players can't peek by inspecting the page (anti-cheat).
- Real-time updates (WebSockets) so face-down cards appear on the opponent's screen instantly.
