# Squinks Arcade

An installable, offline arcade hub of nineteen browser games — vanilla HTML/CSS/JS,
no build step, no backend, no network calls. Open the hub, pick a game, play.
Scores and chip bankrolls are saved per-device in your browser.

---

## Quick summary

**What it is:** one web page (the "hub") that links to nineteen self-contained
games: Chess (vs Stockfish), Snake, 2048, Tetris, Minesweeper, Connect 4
(vs an AI), Doodle Jump, Blackjack, Video Poker, Muncher (a maze chomper),
two formation shooters (Star Divers and Twin Talon), plus the big-push batch —
Breakout, Asteroids, 15-Puzzle, Reversi (vs an AI), Simon, Whack-a-Mole, and
Roulette. The hub groups the tiles by category (Arcade / Puzzle / Skill /
Cards) with a filter bar. A shared service worker caches the games so they keep
working with no internet after the first load. It can be "installed" to a phone
home screen like an app.


### Installing it like an app

- **Android (Chrome):** open the hub, tap the browser menu, choose "Add to
  Home screen" / "Install app". It launches fullscreen with the arcade icon.
- **iPhone (Safari):** open the hub, tap the Share button, choose "Add to Home
  Screen". See the iOS notes below for details.

### Using the arcade

- **Pick a game:** tap a tile. Each tile shows that game's best stat (best
  score, best time, win count, or current chips).
- **Filter by category:** the chips above the grid (All / Arcade / Puzzle /
  Skill / Cards) narrow the tiles to one kind of game.
- **How to play:** every game page has a full "How to play" section at the
  bottom of the page, below the play area, with its controls, goal, and scoring.
- **Theme:** the **Theme** menu at the top right switches between *Neon Retro*
  (default), *Clean Dark*, and *Bright & Playful*. Your choice is remembered.
  (Chess keeps its own built-in look.)
- **Back to the hub:** every game has a "← Arcade" button at the top left.
- **Reset one game:** each game's "Reset" button clears just that game's score
  or bankroll.
- **Reset everything:** the hub's "Reset all arcade data" button wipes every
  score, bankroll, and the saved theme (it asks first).

### What you'll see in each game

- **Snake / 2048 / Doodle Jump:** swipe (or hold a screen side, for Doodle) to
  steer. Game-over screens show your score and best.
- **Tetris:** on-screen buttons move, rotate, soft-drop, and hard-drop.
- **Minesweeper:** tap to reveal, long-press (or right-click) to flag, or turn
  on "Flag mode". Pick Beginner/Intermediate/Expert. Best time is saved per
  difficulty.
- **Connect 4:** choose Easy/Medium/Hard, then tap a column to drop a disc.
  Your total wins against the AI are counted.
- **Blackjack / Video Poker:** you start with 1,000 chips. Choose a bet, then
  play. If you hit 0 chips you get a "Reset bankroll" button to start again at
  1,000 (your peak-chips record is kept).
- **Muncher:** clear the maze of pellets while four pursuers chase you. Swipe or
  use the arrows / WASD / on-screen d-pad to turn. Eat a big **power-pellet** to
  briefly turn the pursuers edible and chase them for a rising bonus; grab the
  occasional fruit; the side tunnel wraps you across the screen. Clearing the
  maze refills it and speeds the next one up. Start with 3 lives, gain one every
  10,000 points (up to 5). **Pause** with the button or Space.
- **Breakout:** drag to move the paddle, tap or Space to launch; clear the
  bricks to advance to faster levels, 3 lives.
- **Asteroids:** on-screen rotate / thrust / fire buttons (or arrows + Space);
  shoot rocks to split them, the screen wraps, bonus life every 10,000 points.
- **15-Puzzle:** tap a tile next to the gap (or use arrow keys) to slide the
  numbers into 1–15 order; fewest moves and fastest time are saved.
- **Reversi:** place a disc to outflank and flip the AI's pieces; pick
  Easy / Medium / Hard; the most discs at the end wins. You play dark, first.
- **Simon:** watch the panels flash, then repeat the growing sequence
  (visual-only, no sound); your best level is saved.
- **Whack-a-Mole:** tap moles as they pop up during a 30-second round; they pop
  faster as the clock runs down.
- **Roulette:** pick a chip value, stack chips on bets, then Spin; running out
  of chips gives you a Rebuy. Starts at 1,000 chips.
- **Star Divers / Twin Talon (shooters):** hold and drag anywhere in the **lower
  screen** to slide your ship; it **fires automatically** (Arrows or A/D on a
  keyboard). Enemies hold a formation, then peel off and dive at you. Endless,
  3 lives, bonus life every 10,000 points (up to 5). **Pause** with the button
  or Space. In **Twin Talon**, a captor can tractor-beam your ship: a capture
  costs a life immediately, and if it grabs your last ship the game ends. Shoot
  a captor that is carrying your captured ship to free it as a **dual fighter**
  (two ships firing together); dying then drops you back to a single ship.

### Common messages

- **"Out of chips"** (Blackjack / Video Poker): your bankroll reached zero.
  Tap "Reset bankroll (1000)" to keep playing.
- **A game tile shows "—" or 0:** you have not set a score yet; play once.
- **Chess says "Loading engine (~40 MB)…":** the first time you open Chess it
  downloads its neural-net engine. Do this once while online; afterwards it
  works offline. The other eleven games do not need this.

---


### How offline works

- On install the worker **precaches** the app shell (hub, shared CSS/JS, icons,
  manifest) **and all nineteen game shells** (their HTML/CSS/JS), so every game
  is available offline after one load of the arcade.
- Day-to-day it serves **network-first**: when you're online, each refresh
  fetches the latest from the server (so a new deploy shows up on the next
  refresh) and quietly refreshes the cache; when you're offline, it falls back
  to the cached copy, so once loaded the arcade keeps working with no internet.
  An offline navigation to an uncached page falls back to the cached hub.
- Chess's heavy engine (~39 MB neural net + wasm) is the one exception: it stays
  **cache-first** so it is never re-downloaded, and it is fetched the first time
  you open Chess (do that once while online, then it works offline too).
- The precache is **tolerant**: if one file fails it does not break the rest.
- The cache name carries a version (currently `squinks-v4`). Because fetches are
  network-first, **content updates appear on a normal refresh while online — no
  version bump needed.** Bumping the version (with `skipWaiting` /
  `clients.claim`, plus the hub's auto-reload-when-a-new-worker-takes-control
  hook) is only needed when the service worker's own logic changes; it retires
  the old cache cleanly and the open page reloads itself once to pick it up.


### Game rules of note

- **Blackjack:** 6-deck shoe reshuffled near 75% penetration; blackjack pays
  3:2; dealer stands on all 17s including soft 17; Double on any first two
  cards; Double-after-split allowed; Split once (max 2 hands), split Aces get
  one card each and cannot re-hit; Insurance offered (pays 2:1) when the dealer
  shows an Ace.
- **Video Poker:** Jacks-or-Better on the 9/6 paytable, per coin: Royal Flush
  250 (4000 at a 5-credit bet), Straight Flush 50, Four of a Kind 25, Full
  House 9, Flush 6, Straight 4, Three of a Kind 3, Two Pair 2, Jacks-or-Better
  1. Bet 1–5 credits.
- **Connect 4 AI:** Easy = minimax depth 2 with a 25% chance of a random legal
  move; Medium = depth 4; Hard = depth 6 (alpha-beta pruned).
- **Reversi AI:** Easy = 1-ply (with a ~35% chance of a random legal move);
  Medium = 3-ply; Hard = 4-ply, alpha-beta pruned over a positional weight map
  (corners prized, the squares beside them penalised) plus a mobility term. You
  play dark and move first; a side with no legal move passes automatically, and
  the game ends when neither can move.
- **Roulette:** European single-zero wheel (0–36). Even-money bets (Red/Black,
  Even/Odd, 1–18/19–36) pay 1:1, the dozens pay 2:1, and a straight single
  number pays 35:1; the green 0 is the house edge. Bets are staked from a
  1,000-chip bankroll (peak balance tracked); chips leave the bankroll only on
  the spin.
- **Muncher:** one fixed, hand-designed maze. Four pursuers each chase
  differently — a direct chaser (targets your cell), an ambusher (targets a few
  cells ahead of you), a wanderer (random turns), and a patroller (cycles the
  four corners). A power-pellet makes all four edible for ~7 seconds; eating
  them in one window scores 200 → 400 → 800 → 1600, and an eaten pursuer
  respawns at its start. Fruit (200) appears twice per maze. The middle row is a
  wrap-around tunnel. Each maze clear refills pellets and raises the speed.
- **Muncher / Star Divers / Twin Talon lives:** all three start at 3 lives, gain
  one bonus life at every 10,000 points up to a cap of 5, and end at 0 lives.
- **Twin Talon capture:** being tractor-beamed costs a life immediately; if it
  was your last ship it is game over with no rescue. Destroying the captor while
  it still carries your captured ship frees that ship into a dual fighter
  (doubled fire); a death while flying the dual costs one life and reverts you
  to a single ship.

### iOS notes

- Installing on iPhone uses Safari → Share → **Add to Home Screen**. A PNG
  `apple-touch-icon` (180×180) is included because iOS does not reliably use an
  SVG manifest icon for the home-screen icon.
- iOS may **evict the offline cache** after about 7 days of non-use or under
  storage pressure. If a game stops loading offline, reconnect once and open
  the arcade to refresh the cache.


