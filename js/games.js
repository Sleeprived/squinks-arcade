/* Single source of truth for the roster. The hub renders one tile per entry and
   shows each game's headline stat by calling read(g), where g(key) returns the
   stored number or null. Keys follow squinks.<game>.<field>.

   `category` drives the hub filter bar. The set, in display order, is
   Arcade / Puzzle / Skill / Cards. */

export const CATEGORIES = ["Arcade", "Puzzle", "Skill", "Cards"];

export const GAMES = [
  { id: "snake", name: "Snake", abbr: "SN", category: "Arcade", label: "Best", read: (g) => g("squinks.snake.best") ?? 0 },
  { id: "2048", name: "2048", abbr: "24", category: "Puzzle", label: "Best", read: (g) => g("squinks.2048.best") ?? 0 },
  { id: "tetris", name: "Tetris", abbr: "TT", category: "Puzzle", label: "Best", read: (g) => g("squinks.tetris.best") ?? 0 },
  {
    id: "minesweeper",
    name: "Minesweeper",
    abbr: "MS",
    category: "Puzzle",
    label: "Best",
    read: (g) => {
      const v = g("squinks.minesweeper.time.beginner");
      return v == null ? "—" : v + "s";
    },
  },
  { id: "connect4", name: "Connect 4", abbr: "C4", category: "Puzzle", label: "Wins", read: (g) => g("squinks.connect4.wins") ?? 0 },
  { id: "doodle", name: "Doodle Jump", abbr: "DJ", category: "Arcade", label: "Height", read: (g) => g("squinks.doodle.best") ?? 0 },
  { id: "blackjack", name: "Blackjack", abbr: "BJ", category: "Cards", label: "Chips", read: (g) => g("squinks.blackjack.chips") ?? 1000 },
  { id: "videopoker", name: "Video Poker", abbr: "VP", category: "Cards", label: "Chips", read: (g) => g("squinks.videopoker.chips") ?? 1000 },
  { id: "chess", name: "Chess", abbr: "CH", category: "Puzzle", label: "", read: () => "vs Stockfish" },
  { id: "muncher", name: "Muncher", abbr: "MU", category: "Arcade", label: "Best", read: (g) => g("squinks.muncher.best") ?? 0 },
  { id: "stardivers", name: "Star Divers", abbr: "SD", category: "Arcade", label: "Best", read: (g) => g("squinks.stardivers.best") ?? 0 },
  { id: "twintalon", name: "Twin Talon", abbr: "TW", category: "Arcade", label: "Best", read: (g) => g("squinks.twintalon.best") ?? 0 },
  { id: "breakout", name: "Breakout", abbr: "BK", category: "Arcade", label: "Best", read: (g) => g("squinks.breakout.best") ?? 0 },
  { id: "asteroids", name: "Asteroids", abbr: "AS", category: "Arcade", label: "Best", read: (g) => g("squinks.asteroids.best") ?? 0 },
  {
    id: "puzzle15",
    name: "15-Puzzle",
    abbr: "15",
    category: "Puzzle",
    label: "Best",
    read: (g) => {
      const v = g("squinks.puzzle15.bestmoves");
      return v == null ? "—" : v + " mv";
    },
  },
  { id: "reversi", name: "Reversi", abbr: "RV", category: "Puzzle", label: "Wins", read: (g) => g("squinks.reversi.wins") ?? 0 },
  { id: "simon", name: "Simon", abbr: "SI", category: "Skill", label: "Level", read: (g) => g("squinks.simon.best") ?? 0 },
  { id: "whack", name: "Whack-a-Mole", abbr: "WM", category: "Skill", label: "Best", read: (g) => g("squinks.whack.best") ?? 0 },
  { id: "roulette", name: "Roulette", abbr: "RO", category: "Cards", label: "Chips", read: (g) => g("squinks.roulette.chips") ?? 1000 },
];
