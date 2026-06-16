# Squinks Arcade — "Big Push" expansion design (2026-06-15)

Freehand extension of the existing 12-game offline PWA. Adds 7 new games
(12 -> 19) plus hub categories + a filter. Same contract as the rest of the
arcade: vanilla HTML/CSS/JS, no build step, no backend, no network calls,
per-device localStorage, three-theme switcher.

## Decisions locked (from brainstorming)

- **7 new games**, drawn from all four requested genres:
  | Game | Genre | Reuses | Stat |
  |---|---|---|---|
  | Breakout | Arcade | canvas + `cssVar` | Best score |
  | Asteroids | Arcade | canvas + lives model (`arcade-engine.js`) | Best score |
  | 15-Puzzle | Puzzle | DOM grid | Best moves / best time |
  | Reversi (vs AI) | Puzzle | Connect-4 minimax pattern | Wins |
  | Simon | Skill | DOM | Best level |
  | Whack-a-mole | Skill | DOM | Best score |
  | Roulette | Cards/Casino | chips/bankroll pattern (Blackjack) | Peak chips |

- **Dropped from the earlier proposal:** Klondike Solitaire (too heavy for this
  round), a shared sound/beep helper, and any service-worker change.

- **Simon is VISUAL-ONLY** (no audio). Panels flash in sequence; the player
  repeats by tapping. Iconic tone feedback is intentionally out, per the
  "no sound" decision.

- **Service worker is intentionally NOT touched.** Consequence accepted by the
  user: returning visitors to the live Pages site keep the old cached hub and
  will not see the new tiles, and the new games are not precached for offline,
  until the cache version (`squinks-v2`) is bumped in `sw.js`. That bump is a
  one-line change to be made later on request. Locally, testing the new games
  may require unregistering the SW or hard-refresh.

- **How-to text lives at the BOTTOM of each game page.** Every new game page
  gets a `<section class="howto">` placed AFTER the game area (and after the
  game-over overlay markup) so it never crowds or shifts the play surface. The
  existing one-line `.hint` stays for at-a-glance use. A shared `.howto` style
  is added to `base.css` so all seven look consistent. (Existing 12 games are
  not retrofitted — surgical scope.)

## Hub categories + filter

- Add a `category` field to every entry in `js/games.js`
  (`Arcade` | `Puzzle` | `Skill` | `Cards`). Existing 12 games are categorized
  too (pure data change, no game code touched).
- `index.html` gains a filter bar (All + one chip per category).
- `hub.js` renders tiles as today, then filters the grid by the active
  category. "All" is the default. Selection is cosmetic/session-only (not
  persisted) to keep it simple.

## Per-game shape (unchanged convention)

`games/<id>/index.html` + `game.js` + `game.css`, theme bootstrap script in
`<head>`, `.topbar` with "<- Arcade" back link, `.game-wrap` for play area,
`.overlay`/`.card` for game-over, ES-module `game.js` importing from
`../../js/storage.js`. Storage keys namespaced `squinks.<id>.<field>`.

## Verification plan

- `node --check` every new/changed `.js` for syntax.
- Serve with `python -m http.server` and confirm each new page returns 200 and
  references its assets.
- Careful logic self-review, then `/review-build` audit -> `/fix` until the
  audit is clean (0 critical / 0 major).
- True in-browser play smoke (touch, render, no console errors) remains a
  human step, consistent with prior arcade batches.

## Out of scope (this round)

Sound engine, achievements, daily challenge, stats dashboard, gamepad support,
Klondike, any online/leaderboard feature (would break the no-backend contract),
service-worker/version bump, retrofitting how-to sections onto the existing 12.
