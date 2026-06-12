import { getNumber, setNumber, remove } from "../../js/storage.js";

const KEY = "squinks.2048.best";
const SIZE = 4;

const boardEl = document.getElementById("board");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const overlay = document.getElementById("over");
const overTitle = document.getElementById("over-title");
const overMsg = document.getElementById("over-msg");

// Fixed tile colors for legibility (spec allows constant gameplay colors).
const COLORS = {
  2: "#eee4da", 4: "#ede0c8", 8: "#f2b179", 16: "#f59563", 32: "#f67c5f",
  64: "#f65e3b", 128: "#edcf72", 256: "#edcc61", 512: "#edc850",
  1024: "#edc53f", 2048: "#edc22e",
};
const textColor = (v) => (v <= 4 ? "#776e65" : "#f9f6f2");

let grid, score, over, announcedWin;

function empties() {
  const out = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (!grid[r][c]) out.push([r, c]);
  return out;
}

function spawn() {
  const e = empties();
  if (!e.length) return;
  const [r, c] = e[Math.floor(Math.random() * e.length)];
  grid[r][c] = Math.random() < 0.9 ? 2 : 4;
}

function newGame() {
  grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  score = 0;
  over = false;
  announcedWin = false;
  overlay.classList.add("hidden");
  spawn();
  spawn();
  render();
}

function render() {
  boardEl.innerHTML = "";
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = grid[r][c];
      const d = document.createElement("div");
      d.className = "cell";
      if (v) {
        d.textContent = v;
        d.style.background = COLORS[v] || "#3c3a32";
        d.style.color = textColor(v);
        d.style.fontSize = v >= 1024 ? "1.15rem" : v >= 128 ? "1.3rem" : "1.5rem";
      } else {
        d.style.background = "var(--bg2)";
      }
      boardEl.appendChild(d);
    }
  }
  scoreEl.textContent = score;
  bestEl.textContent = getNumber(KEY, 0);
}

function slide(line) {
  const arr = line.filter((v) => v);
  let gained = 0;
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] === arr[i + 1]) {
      arr[i] *= 2;
      gained += arr[i];
      arr.splice(i + 1, 1);
    }
  }
  while (arr.length < SIZE) arr.push(0);
  return { line: arr, gained };
}

function move(dir) {
  if (over) return;
  let moved = false;
  let madeWin = false;
  const get = (i, j) => {
    if (dir === "left") return grid[i][j];
    if (dir === "right") return grid[i][SIZE - 1 - j];
    if (dir === "up") return grid[j][i];
    return grid[SIZE - 1 - j][i]; // down
  };
  const set = (i, j, v) => {
    if (dir === "left") grid[i][j] = v;
    else if (dir === "right") grid[i][SIZE - 1 - j] = v;
    else if (dir === "up") grid[j][i] = v;
    else grid[SIZE - 1 - j][i] = v;
  };
  for (let i = 0; i < SIZE; i++) {
    const line = [];
    for (let j = 0; j < SIZE; j++) line.push(get(i, j));
    const { line: out, gained } = slide(line);
    score += gained;
    for (let j = 0; j < SIZE; j++) {
      if (get(i, j) !== out[j]) moved = true;
      set(i, j, out[j]);
      if (out[j] === 2048) madeWin = true;
    }
  }
  if (!moved) return;
  if (score > getNumber(KEY, 0)) setNumber(KEY, score);
  spawn();
  render();
  if (madeWin && !announcedWin) {
    announcedWin = true;
    overTitle.textContent = "You made 2048!";
    overMsg.textContent = "Keep going for a higher score.";
    document.getElementById("again").textContent = "Keep going";
    overlay.classList.remove("hidden");
    return;
  }
  if (!hasMoves()) gameOver();
}

function hasMoves() {
  if (empties().length) return true;
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) {
      if (c < SIZE - 1 && grid[r][c] === grid[r][c + 1]) return true;
      if (r < SIZE - 1 && grid[r][c] === grid[r + 1][c]) return true;
    }
  return false;
}

function gameOver() {
  over = true;
  overTitle.textContent = "Game Over";
  overMsg.textContent = `Score ${score} · Best ${getNumber(KEY, 0)}`;
  document.getElementById("again").textContent = "New game";
  overlay.classList.remove("hidden");
}

// Input: swipe
let tsx = 0, tsy = 0;
boardEl.addEventListener("touchstart", (e) => { const t = e.touches[0]; tsx = t.clientX; tsy = t.clientY; }, { passive: true });
boardEl.addEventListener("touchend", (e) => {
  const t = e.changedTouches[0];
  const dx = t.clientX - tsx, dy = t.clientY - tsy;
  if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return;
  if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? "right" : "left");
  else move(dy > 0 ? "down" : "up");
}, { passive: true });

const KEYMAP = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
window.addEventListener("keydown", (e) => {
  const k = KEYMAP[e.key];
  if (k) { e.preventDefault(); move(k); }
});

document.getElementById("again").addEventListener("click", () => {
  if (over) newGame();
  else overlay.classList.add("hidden"); // "keep going" after 2048
});
document.getElementById("new").addEventListener("click", newGame);
document.getElementById("reset").addEventListener("click", () => {
  if (confirm("Clear 2048 best score?")) { remove(KEY); render(); }
});

newGame();
