# Changelog

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
