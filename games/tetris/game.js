import { getNumber, setNumber, remove } from "../../js/storage.js";

const KEY = "squinks.tetris.best";
const COLS = 10;
const ROWS = 20;

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const linesEl = document.getElementById("lines");
const bestEl = document.getElementById("best");
const overlay = document.getElementById("over");
const overMsg = document.getElementById("over-msg");

// Fixed piece colors for legibility.
const SHAPES = {
  I: { color: "#2de2e6", cells: [[0, 1], [1, 1], [2, 1], [3, 1]] },
  O: { color: "#f6e05e", cells: [[1, 0], [2, 0], [1, 1], [2, 1]] },
  T: { color: "#b794f4", cells: [[1, 0], [0, 1], [1, 1], [2, 1]] },
  S: { color: "#68d391", cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
  Z: { color: "#fc8181", cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  J: { color: "#63b3ed", cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  L: { color: "#f6ad55", cells: [[2, 0], [0, 1], [1, 1], [2, 1]] },
};
const TYPES = Object.keys(SHAPES);

let cell = 24;
let board, piece, score, lines, level, over, dropAcc, last, bag;

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#fff";
}

function fit() {
  const maxW = window.innerWidth - 32;
  const maxH = window.innerHeight - 230;
  cell = Math.max(12, Math.floor(Math.min(maxW / COLS, maxH / ROWS)));
  canvas.width = cell * COLS;
  canvas.height = cell * ROWS;
  draw();
}

function nextType() {
  if (!bag || !bag.length) {
    bag = TYPES.slice();
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
  }
  return bag.pop();
}

function spawn() {
  const type = nextType();
  const cells = SHAPES[type].cells.map(([x, y]) => ({ x, y }));
  piece = { type, color: SHAPES[type].color, cells, ox: 3, oy: -1 };
  if (collides(piece, 0, 0)) gameOver();
}

function absCells(p, dx = 0, dy = 0, cells = p.cells) {
  return cells.map((c) => ({ x: p.ox + c.x + dx, y: p.oy + c.y + dy }));
}

function collides(p, dx, dy, cells = p.cells) {
  return absCells(p, dx, dy, cells).some(
    (c) => c.x < 0 || c.x >= COLS || c.y >= ROWS || (c.y >= 0 && board[c.y][c.x])
  );
}

function rotate() {
  if (piece.type === "O") return;
  // rotate around a 3x3 (or 4x4 for I) origin
  const size = piece.type === "I" ? 4 : 3;
  const rotated = piece.cells.map((c) => ({ x: size - 1 - c.y, y: c.x }));
  // normalize for non-I to keep within typical bounds (kick handled by wall test)
  for (const kick of [0, -1, 1, -2, 2]) {
    if (!collides(piece, kick, 0, rotated)) {
      piece.cells = rotated;
      piece.ox += kick;
      draw();
      return;
    }
  }
}

function lock() {
  for (const c of absCells(piece)) {
    if (c.y < 0) {
      gameOver();
      return;
    }
    board[c.y][c.x] = piece.color;
  }
  clearLines();
  spawn();
}

function clearLines() {
  let cleared = 0;
  for (let y = ROWS - 1; y >= 0; y--) {
    if (board[y].every((v) => v)) {
      board.splice(y, 1);
      board.unshift(Array(COLS).fill(0));
      cleared++;
      y++;
    }
  }
  if (cleared) {
    lines += cleared;
    score += [0, 100, 300, 500, 800][cleared] * (level + 1);
    level = Math.floor(lines / 10);
    if (score > getNumber(KEY, 0)) setNumber(KEY, score);
    updateHud();
  }
}

function softDrop() {
  if (over) return;
  if (!collides(piece, 0, 1)) {
    piece.oy++;
    score += 1;
    updateHud();
  } else {
    lock();
  }
  draw();
}

function hardDrop() {
  if (over) return;
  let d = 0;
  while (!collides(piece, 0, d + 1)) d++;
  piece.oy += d;
  score += d * 2;
  lock();
  updateHud();
  draw();
}

function moveX(dir) {
  if (over) return;
  if (!collides(piece, dir, 0)) {
    piece.ox += dir;
    draw();
  }
}

function updateHud() {
  scoreEl.textContent = score;
  linesEl.textContent = lines;
  bestEl.textContent = getNumber(KEY, 0);
}

function gameOver() {
  over = true;
  if (score > getNumber(KEY, 0)) setNumber(KEY, score);
  overMsg.textContent = `Score ${score} · Lines ${lines} · Best ${getNumber(KEY, 0)}`;
  overlay.classList.remove("hidden");
}

function newGame() {
  board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  score = 0;
  lines = 0;
  level = 0;
  over = false;
  bag = [];
  dropAcc = 0;
  last = performance.now();
  overlay.classList.add("hidden");
  spawn();
  updateHud();
  draw();
}

function draw() {
  ctx.fillStyle = cssVar("--panel");
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (const [y, row] of board.entries()) {
    for (const [x, v] of row.entries()) {
      if (v) drawCell(x, y, v);
    }
  }
  if (piece && !over) {
    for (const c of absCells(piece)) {
      if (c.y >= 0) drawCell(c.x, c.y, piece.color);
    }
  }
}

function drawCell(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
}

function loop(t) {
  if (!over) {
    const speed = Math.max(80, 600 - level * 50);
    dropAcc += t - last;
    last = t;
    while (dropAcc >= speed) {
      dropAcc -= speed;
      if (!collides(piece, 0, 1)) piece.oy++;
      else {
        lock();
        break;
      }
    }
    draw();
  } else {
    last = t;
  }
  requestAnimationFrame(loop);
}

// Buttons
document.getElementById("left").addEventListener("click", () => moveX(-1));
document.getElementById("right").addEventListener("click", () => moveX(1));
document.getElementById("rotate").addEventListener("click", () => !over && rotate());
document.getElementById("soft").addEventListener("click", softDrop);
document.getElementById("hard").addEventListener("click", hardDrop);

// Keyboard
window.addEventListener("keydown", (e) => {
  if (over) return;
  switch (e.key) {
    case "ArrowLeft": e.preventDefault(); moveX(-1); break;
    case "ArrowRight": e.preventDefault(); moveX(1); break;
    case "ArrowUp": case "x": e.preventDefault(); rotate(); break;
    case "ArrowDown": e.preventDefault(); softDrop(); break;
    case " ": e.preventDefault(); hardDrop(); break;
  }
});

document.getElementById("again").addEventListener("click", newGame);
document.getElementById("reset").addEventListener("click", () => {
  if (confirm("Clear Tetris best score?")) { remove(KEY); updateHud(); }
});

window.addEventListener("resize", fit);

newGame();
fit();
requestAnimationFrame(loop);
