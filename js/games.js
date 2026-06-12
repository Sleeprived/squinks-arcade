/* Single source of truth for the roster. The hub renders one tile per entry and
   shows each game's headline stat by calling read(g), where g(key) returns the
   stored number or null. Keys follow squinks.<game>.<field>. */

export const GAMES = [
  { id: "snake", name: "Snake", abbr: "SN", label: "Best", read: (g) => g("squinks.snake.best") ?? 0 },
  { id: "2048", name: "2048", abbr: "24", label: "Best", read: (g) => g("squinks.2048.best") ?? 0 },
  { id: "tetris", name: "Tetris", abbr: "TT", label: "Best", read: (g) => g("squinks.tetris.best") ?? 0 },
  {
    id: "minesweeper",
    name: "Minesweeper",
    abbr: "MS",
    label: "Best",
    read: (g) => {
      const v = g("squinks.minesweeper.time.beginner");
      return v == null ? "—" : v + "s";
    },
  },
  { id: "connect4", name: "Connect 4", abbr: "C4", label: "Wins", read: (g) => g("squinks.connect4.wins") ?? 0 },
  { id: "doodle", name: "Doodle Jump", abbr: "DJ", label: "Height", read: (g) => g("squinks.doodle.best") ?? 0 },
  { id: "blackjack", name: "Blackjack", abbr: "BJ", label: "Chips", read: (g) => g("squinks.blackjack.chips") ?? 1000 },
  { id: "videopoker", name: "Video Poker", abbr: "VP", label: "Chips", read: (g) => g("squinks.videopoker.chips") ?? 1000 },
  { id: "chess", name: "Chess", abbr: "CH", label: "", read: () => "vs Stockfish" },
  { id: "muncher", name: "Muncher", abbr: "MU", label: "Best", read: (g) => g("squinks.muncher.best") ?? 0 },
  { id: "stardivers", name: "Star Divers", abbr: "SD", label: "Best", read: (g) => g("squinks.stardivers.best") ?? 0 },
  { id: "twintalon", name: "Twin Talon", abbr: "TW", label: "Best", read: (g) => g("squinks.twintalon.best") ?? 0 },
];
