# Changelog

## 2026-06-16 — gameplay timer fixes (Muncher, Star Divers, Twin Talon)
### Fixed
- **Muncher power-pellet, fruit, and "Ready!" timers were ~16× too short.** A
  stray `dt * 16` in their countdowns (the rest of the game advances by `dt`)
  drained them almost instantly. Now the power-pellet edible window lasts ~7s
  (was ~0.45s — the reported "split second"), fruit stays ~9s (was ~0.57s), and
  the "Ready!" pause is ~1.5s (was a ~0.1s flash) at the start of each life/maze.
- **Star Divers & Twin Talon (shared `js/shooter.js`) had the identical bug in
  four timers.** Fixed: post-respawn invulnerability is ~1.2s (was ~0.07s, so you
  could be re-killed the instant you respawned), the respawn delay is ~1.0–1.5s
  (was ~0.07s, basically no beat), and explosion particles last ~0.5s (were
  ~0.03s — effectively invisible).
- **Auto-fire rate normalised** from an unintended ~60-shots/sec firehose to
  ~7.5 shots/sec (one shot every 8 frames), frame-rate-independent.

## 2026-06-15 — auto-updating service worker (network-first) + offline kept
### Changed
- **Service worker switched from cache-first to network-first** for the app's
  own files (cache `squinks-v3` → `squinks-v4`). While online, a normal refresh
  now fetches the latest from the server, so a new deploy appears on the next
  refresh instead of being trapped behind a stale cache. When offline, it falls
  back to the cached copy, so a once-loaded arcade still works with no internet
  (navigations fall back to the cached hub).
- **Chess's heavy engine stays cache-first** (`games/chess/vendor/`), so it is
  never re-downloaded.
- **Added an auto-reload hook** (`js/hub.js`): when a new service worker takes
  control after a deploy, the hub reloads itself once so the update applies
  without a manual hard-refresh or cache clear. Guarded so it never reloads on a
  first visit and never loops.

### Note
- Returning visitors still on the old cache-first worker need to clear it
  **once** (hard-refresh / unregister the worker / clear site data) to pick up
  this network-first worker. After that, updates apply on a normal refresh.

## 2026-06-15 — service worker bump for the big-push games
### Changed
- **Service worker cache bumped `squinks-v2` → `squinks-v3`**, with the seven
  big-push game shells (Breakout, Asteroids, 15-Puzzle, Reversi, Simon,
  Whack-a-Mole, Roulette) added to the precache list. A returning visitor who
  already had the `squinks-v2` cache now receives the new hub (with all nineteen
  tiles) and the new games on the next load, and every game shell is precached
  for offline use — no longer relying on per-game runtime caching.

## 2026-06-15 — fixes from squinks-arcade-build-audit-3.md
### Fixed
- **Asteroids no longer carries a held control into the next game (m1):**
  `newGame()` now clears the rotate/thrust/fire input flags, so starting a new
  game while a key or on-screen button is still held no longer makes the fresh
  ship thrust or fire on its own.
- **Roulette straight-number bets use an unambiguous key (m2):** a single-number
  bet is now stored as `num:<n>` instead of `n<n>`, removing the fragile
  reliance on no other bet id starting with the letter "n" (payouts unchanged).
- **Roulette result badge starts neutral (m3):** before the first spin the
  badge shows "–" with no colour, instead of being tinted green from a
  placeholder zero.

## 2026-06-15 — big-push expansion (freehand)
### Added
- **Seven new games**, bringing the arcade to nineteen. Each is portrait,
  touch + keyboard, with its stat saved under `squinks.<id>.*`, a per-game
  reset, a "← Arcade" back link, and a full **"How to play"** section pinned to
  the bottom of the page (below the play area, so it never crowds the game). No
  image, sprite, or audio files were added — all visuals are canvas/DOM/CSS.
  - **Breakout** (`games/breakout/`, badge **BK**) — paddle/ball/brick canvas
    game at a fixed internal resolution (resize-safe physics, sub-stepped so the
    ball can't tunnel through bricks/paddle); drag or ←/→ paddle, tap/Space
    launch, 5 brick rows, rising level speed, 3 lives; best score.
  - **Asteroids** (`games/asteroids/`, badge **AS**) — vector ship with
    rotate/thrust/fire (on-screen buttons or arrows + Space), screen wrap, rocks
    that split large→medium→small, escalating waves; uses the shared lives model
    (3 lives, bonus every 10,000, cap 5); best score.
  - **15-Puzzle** (`games/puzzle15/`, badge **15**) — 4×4 sliding tiles, always
    solvable (scrambled by legal walks from solved), tap or arrow keys; separate
    best-moves and fastest-time records.
  - **Reversi** (`games/reversi/`, badge **RV**) — Othello vs an AI; legal-move
    highlighting, automatic passes, alpha-beta minimax (Easy 1-ply + occasional
    random / Medium 3-ply / Hard 4-ply) over a positional weight map + mobility;
    win counter.
  - **Simon** (`games/simon/`, badge **SI**) — visual-only colour-sequence
    memory (no sound), sequence grows and speeds up each round; best level.
  - **Whack-a-Mole** (`games/whack/`, badge **WM**) — 3×3 holes, 30-second
    round, moles appear faster as the clock runs down; best score.
  - **Roulette** (`games/roulette/`, badge **RO**) — European single-zero wheel;
    Red/Black, Even/Odd, 1–18/19–36 (1:1), dozens (2:1), straight number (35:1);
    stake multiple bets from a 1,000-chip bankroll with peak tracking and a
    rebuy on bust. Reuses the chips pattern from Blackjack/Video Poker.
- **Hub categories + filter:** each `js/games.js` entry now carries a `category`
  (Arcade / Puzzle / Skill / Cards), and the hub shows a filter bar (All + one
  chip per category) to narrow the now-nineteen tiles. The existing twelve games
  were categorised too — a pure data change, no game code touched.
- Shared `.howto` and `.filter-bar` styles in `css/base.css`; a design doc in
  `docs/2026-06-15-big-push-design.md`.

### Not changed (intentionally)
- **The service worker was deliberately left at `squinks-v2`.** The seven new
  shells are NOT in the precache list, so they rely on cache-first *runtime*
  caching (offline after one online open, like chess's engine), and a returning
  visitor who already cached `squinks-v2` keeps the old hub until the version is
  bumped. Bumping `squinks-v2` → `squinks-v3` and adding the new shells to
  `PRECACHE` is a deferred change (one line + seven list entries).
- No sound engine was added (Simon is intentionally visual-only).

## 2026-06-12 — squinks-arcade-2.md (extension)
### Added
- **Three new games**, bringing the arcade to twelve, each portrait, touch +
  keyboard, with a high score saved at `squinks.<id>.best`, a per-game reset,
  a Pause control, and a "← Arcade" back link. All run offline after one
  arcade load and are restyled by the theme switcher. All art is geometric and
  drawn in canvas code — no image, sprite, or audio files added.
  - **Muncher** (`games/muncher/`, badge **MU**) — original maze chomper on one
    hand-designed, fully-connected maze. Four pursuers with distinct chase
    styles (direct chaser / ambusher / wanderer / corner patroller);
    power-pellets flip pursuers edible for an escalating 200/400/800/1600 bonus
    chain; an occasional fruit bonus; a side tunnel that wraps left↔right; each
    maze clear refills the maze and speeds the next one up; endless. Swipe /
    on-screen d-pad / arrows / WASD.
  - **Star Divers** (`games/stardivers/`, badge **SD**) — fixed-screen formation
    shooter: enemies hold a grid, peel off and dive at the player. Drag the
    lower screen to slide; the ship auto-fires continuously (Arrows / A,D on
    desktop). The baseline shooter — no capture.
  - **Twin Talon** (`games/twintalon/`, badge **TW**) — the shooter with a
    capture mechanic: a captor can tractor-beam the ship. Capture costs a life
    immediately; if it was your last ship the game ends with no rescue.
    Destroying a captor that still carries the captive frees it into a **dual
    fighter** (two ships, doubled fire); a death while dual costs one life and
    reverts to a single ship.
- **Shared shooter engine** (`js/shooter.js`) reused by both shooters, plus
  shared canvas/theme/lives helpers (`js/arcade-engine.js`).
- **Common game structure for all three:** endless with escalating waves, start
  with 3 lives, a bonus life every 10,000 points capped at 5, game over at 0.
- **Three new hub tiles** auto-rendered from `js/games.js` (MU, SD, TW), each
  showing its best score.

### Changed
- Service worker cache bumped `squinks-v1` → `squinks-v2`, with the three new
  game shells (and the two shared JS modules) added to the precache list, so a
  returning visitor who already had the old cache receives the new games on the
  next load.

## 2026-06-11 — fixes from squinks-arcade-build-audit.md
### Fixed
- **Doodle Jump no longer distorts on resize (M2):** the canvas now only refits
  between runs, not during an active game, so a viewport change (mobile address
  bar collapsing, rotation) can't abruptly end or warp a run.
- **README documents the offline/install secure-context rule (M1):** added a
  clear note that offline play and "Add to Home Screen" only work over HTTPS or
  `localhost` — not over a plain `http://` LAN IP — so the phone-over-Wi-Fi test
  path won't show offline (a browser rule, not a bug).
- **Blackjack pays exact whole chips on a blackjack (m1):** the 3:2 payout uses
  integer math instead of rounding, so odd bets no longer add a half-chip.
- **Minesweeper right-click no longer reveals a cell (m2):** right/middle-button
  releases are ignored on reveal, so right-clicking to un-flag a cell only
  toggles the flag instead of also uncovering it.
- **Doodle Jump keyboard steering removed (m3):** matches the locked "touch-only
  steering" decision; the game is steered by holding the left/right screen half.
- **Removed dead styling/code (m5):** the unused Connect 4 `.c4cell.win` rule and
  the unused Tetris grid-stroke lines.
- **Service worker skips non-200 responses (m6):** only full `200` responses are
  runtime-cached, so a partial/`206` response can't be cached and later served
  as if complete.

### Changed
- Doodle Jump is now touch-only (keyboard arrows no longer steer it on desktop).

## 2026-06-11 — squinks-arcade.md (initial build)
### Added
- **Arcade hub** (`index.html`): responsive grid of nine game tiles, each
  showing that game's headline stat read from its `squinks.<game>.*`
  localStorage key; theme switcher; "Reset all arcade data" control.
- **Nine games**, each self-contained with a "← Arcade" back link and a
  per-game reset:
  - **Snake** — canvas; swipe / on-screen d-pad / keyboard; high score.
  - **2048** — DOM grid; swipe / arrow keys; merge to 2048; best score.
  - **Tetris** — canvas; on-screen left/right/rotate/soft-drop/hard-drop +
    keyboard; 7-bag pieces, line clears, levels; high score.
  - **Minesweeper** — three portrait-fit boards (Beginner 8×10/10,
    Intermediate 10×14/30, Expert 12×18/55); tap reveal, long-press / right-
    click / flag-mode flagging; first-click-safe; best time per difficulty.
  - **Connect 4** — 7×6; tap a column; minimax AI with alpha-beta
    (Easy depth 2 + 25% random / Medium depth 4 / Hard depth 6); aggregate
    win counter vs AI.
  - **Doodle Jump** — canvas vertical scroller; touch-only steering (hold
    left/right screen half), horizontal wrap, auto-bounce; best height.
  - **Blackjack** — 6-deck shoe (~75% reshuffle), 3:2 blackjack, dealer
    stands on all 17s (S17), Double, Double-after-split, Split once (split
    aces one card each), Insurance (2:1); 1,000-chip bankroll with bet
    clamping and bust→reset; current + peak chips.
  - **Video Poker** — Jacks-or-Better on the 9/6 paytable (Royal 250 /
    4000-at-5), tap-to-hold, 1–5 credit bet; 1,000-chip bankroll with
    bust→reset; current + peak chips.
  - **Chess** — the existing Stockfish app copied in as `games/chess/`, with
    its own service-worker registration and manifest link removed so it uses
    the arcade's root service worker; keeps its own board/UI theme.
- **Three-theme switcher** (Neon Retro default / Clean Dark / Bright &
  Playful): restyles all hub and game UI chrome and canvas backgrounds/accents
  via CSS variables; saved in `localStorage` and applied on every page load
  before first paint. Chess is exempt and keeps its native theme.
- **Offline support** via one root service worker (`sw.js`): tolerant precache
  of the app shell + every game's lightweight shell at install, so all nine
  game shells load offline after one arcade load; chess's ~39 MB engine is
  runtime-cached on first open; versioned cache with
  `skipWaiting` + `clients.claim` for clean updates.
- **Installable PWA**: root `manifest.webmanifest` (standalone, portrait,
  relative `start_url`/`scope`), maskable PNG icons (192/512) and a 180×180
  `apple-touch-icon`.
- **Per-device persistence**: high scores, best times, win counts, chip
  bankrolls, peak chips, and the selected theme, all under namespaced
  `squinks.<game>.<field>` keys; defensive parsing with safe defaults.
- **Reset controls**: per-game reset of that game's stat/bankroll, and a
  hub-level wipe of all `squinks.*` data (with confirmation).
- **Relative paths throughout** so the site runs from a GitHub Pages project
  subpath, not just localhost root.
- **README.md** (quick summary → plain-English guide → detailed guide →
  glossary, including iOS notes and "flip public to deploy" steps) and a
  dev-only `tools/make-icons.py` icon generator.
