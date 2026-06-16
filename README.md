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

**Quick start (local test):**

```
cd squinks-arcade
python -m http.server 8000
```

Then open `http://localhost:8000/` in a browser. To play on your phone, find
your PC's LAN IP (e.g. `192.168.1.20`) and open `http://192.168.1.20:8000/` on
the phone while it is on the same Wi-Fi.

> A static server is required because the games use ES modules, which browsers
> refuse to load from a bare `file://` path. The server just hands files to the
> browser — it does not process or send your data anywhere.

---

## Plain-English guide

### Running it on your computer

1. **Open a terminal in the project folder.** On Windows you can type `! ` in
   Claude Code, or open PowerShell and run:

   ```
   cd squinks-arcade
   ```

   `cd` means "change directory" — it moves the terminal into the arcade
   folder so the next command runs there.

2. **Start a tiny local web server:**

   ```
   python -m http.server 8000
   ```

   Part by part: `python` runs Python; `-m http.server` tells Python to run its
   built-in mini web server module; `8000` is the port number (an address on
   your own machine). After you run it, Python keeps running and serves the
   files in this folder. It listens only on your computer/LAN — nothing is sent
   to the internet.

3. **Open the arcade.** In your browser go to `http://localhost:8000/`.
   `localhost` means "this same computer"; `:8000` is the port from step 2. You
   should see the **Squinks Arcade** hub with a grid of game tiles.

4. **Stop the server when done.** Click the terminal and press `Ctrl + C`.
   That sends a "stop" signal to Python. The arcade pages you already loaded
   may still work offline, but new loads need the server running again.

### Playing on your phone (same Wi-Fi)

1. Make sure the server from above is running on your PC.
2. Find your PC's local network address. In PowerShell run `ipconfig` and look
   for the "IPv4 Address" (looks like `192.168.x.x`).
3. On the phone's browser, go to `http://<that-address>:8000/` — for example
   `http://192.168.1.20:8000/`. The phone and PC must be on the same Wi-Fi.

> **Important — offline and "install to home screen" do NOT work over a plain
> `http://` LAN IP.** Browsers only enable the offline service worker and the
> install prompt in a "secure context": that means **HTTPS**, or the special
> addresses `localhost` / `127.0.0.1`. A LAN IP like `http://192.168.1.20:8000`
> is not secure, so over LAN the games are fully playable **online**, but
> airplane-mode offline and Add-to-Home-Screen will be unavailable — that is a
> browser rule, not a bug. To test offline/install on a phone, deploy to GitHub
> Pages (HTTPS — see "Deploying it live") and open that `https://` link, or use
> an HTTPS tunnel. To test offline on your computer, use `http://localhost:8000`,
> which counts as secure.

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

## Detailed guide

### Project layout

```
squinks-arcade/
  index.html              hub (game grid, theme switcher, reset-all)
  manifest.webmanifest    PWA manifest (installable, standalone, portrait)
  sw.js                   root service worker (offline caching)
  .nojekyll               tells GitHub Pages to serve files as-is
  css/
    themes.css            the three themes (CSS variables)
    base.css              shared layout + components (incl. .pcard cards)
  js/
    storage.js            defensive localStorage helpers (squinks.* keys)
    theme.js              theme load/apply/switch
    games.js              the game roster + categories (drives tiles + filter)
    cards.js              shared deck/shuffle/card rendering (card games)
    hub.js                hub rendering + category filter + SW registration
    arcade-engine.js      shared theme/canvas/lives helpers (the 3 new games)
    shooter.js            shared formation-shooter engine (Star Divers, Twin Talon)
  icons/                  PWA PNG icons (192, 512, apple-touch 180)
  tools/make-icons.py     dev-only icon generator (not used at runtime)
  games/
    snake/ 2048/ tetris/ minesweeper/ connect4/ doodle/ blackjack/
      videopoker/         each: index.html + game.js + game.css
    muncher/ stardivers/ twintalon/   the Retro Wave games (same shape)
    breakout/ asteroids/ puzzle15/ reversi/ simon/ whack/ roulette/
                          the big-push games (same shape; each ends with a
                          bottom-of-page "How to play" section)
    chess/                copied Stockfish app (its own style.css/theme)
  docs/                   design notes (e.g. the big-push design doc)
```

### How offline works

- The service worker (`sw.js`) precaches the **app shell** (hub, shared CSS/JS,
  icons, manifest) **and all nineteen game shells** (their HTML/CSS/JS) on
  install. After one load of the arcade, every game opens offline.
- It does **not** precache chess's heavy engine (~39 MB neural net + wasm);
  those are cached at runtime the first time you open Chess. Open Chess once
  while online/local and it becomes fully offline-capable too.
- The precache is **tolerant**: if one file fails it does not break the rest.
- The cache name carries a version (currently `squinks-v3`). To ship an update,
  bump that string in `sw.js` (and add any new game shells to `PRECACHE`); the
  worker then clears old caches and takes over immediately (`skipWaiting` +
  `clients.claim`). This is how a returning visitor who already had an older
  cache receives newly added games on the next load.

### Data & storage

All progress is stored in your browser's `localStorage` under keys namespaced
`squinks.<game>.<field>` (e.g. `squinks.snake.best`, `squinks.blackjack.chips`,
`squinks.theme`). There is no account, server, cookie, or cloud sync — clearing
the browser's site data (or "Reset all arcade data") erases it. Stored values
are parsed defensively: a missing or corrupted value falls back to a safe
default instead of breaking a game.

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

### Deploying it live (when you choose)

This project is built to run from a **subpath** (all paths are relative), which
is exactly what GitHub Pages *project* sites need
(`https://<user>.github.io/squinks-arcade/`).

> Free GitHub Pages will not serve a **private** repo. To go live you must make
> the repo public, then enable Pages. The build process does not do this for
> you — it is a deliberate manual step.

Rough steps when you're ready: create the repo `Sleeprived/squinks-arcade`,
push this folder, make it public, then in the repo's **Settings → Pages** set
the source to the `main` branch root. The `.nojekyll` file is already here so
Pages serves every file as-is.

### Troubleshooting

- **Blank page / "module" error from `file://`:** you opened the HTML directly.
  Use the local server (`python -m http.server`) and a `http://` URL.
- **Changes not showing after editing:** a service worker may be serving the
  old cache. Bump the `squinks-v2` version in `sw.js`, or in DevTools →
  Application → Service Workers, "Unregister" and reload.
- **Chess won't load offline:** it was never opened while online, so its engine
  was never downloaded. Open it once with a connection.
- **Offline / install missing on my phone over Wi-Fi:** you are on a plain
  `http://` LAN IP, which is not a secure context, so the service worker and
  install prompt are disabled. Use the HTTPS GitHub Pages link (or `localhost`
  on the PC) to get offline and Add-to-Home-Screen. See "Playing on your phone."

---

## Glossary

- **PWA (Progressive Web App):** a website that can be installed and run like a
  native app, including offline, using a manifest and a service worker.
- **Service worker:** a background script the browser runs for a site; here it
  intercepts requests and serves cached files so the arcade works offline.
- **Manifest (`.webmanifest`):** a small JSON file describing the app's name,
  icons, colors, and how it launches (here: standalone, portrait).
- **Cache-first:** a strategy where the service worker returns a cached copy if
  it has one, only hitting the network when it doesn't.
- **Precache:** files cached up front when the service worker installs, so they
  are available offline immediately.
- **localStorage:** a small per-site key/value store in the browser that
  persists across visits on that one device.
- **ES modules:** JavaScript files that use `import`/`export`; browsers only
  load them over `http(s)`, not `file://`, which is why a local server is used.
- **Subpath / project site:** a site served from a folder under a domain
  (`/squinks-arcade/`) rather than the domain root, as GitHub Pages project
  sites are — the reason all paths here are relative.
- **NNUE:** the neural-network evaluation file Stockfish uses to judge chess
  positions; it is the large (~39 MB) download chess needs once.
- **Minimax / alpha-beta:** the algorithm the Connect 4 AI uses to look ahead
  several moves and pick a strong one; alpha-beta pruning skips branches that
  cannot change the result, making deeper search fast.
- **Penetration (Blackjack):** how far into the shoe the dealer deals before
  reshuffling; here about 75%.
- **Static server / port:** a program that hands files to browsers; a port
  (like 8000) is a numbered channel on your machine it listens on.
- **LAN IP:** your device's address on the local network (e.g. 192.168.x.x),
  used to reach the PC's server from your phone.
