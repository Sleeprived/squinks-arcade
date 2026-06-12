import { getNumber, setNumber, remove } from "../../js/storage.js";

const DIFFS = {
  beginner: { w: 8, h: 10, m: 10 },
  intermediate: { w: 10, h: 14, m: 30 },
  expert: { w: 12, h: 18, m: 55 },
};
const NUMCOLORS = { 1: "#3b82f6", 2: "#16a34a", 3: "#dc2626", 4: "#7c3aed", 5: "#b45309", 6: "#0891b2", 7: "#9333ea", 8: "#6b7280" };

const boardEl = document.getElementById("board");
const timeEl = document.getElementById("time");
const minesEl = document.getElementById("mines");
const bestEl = document.getElementById("best");
const flagBtn = document.getElementById("flagmode");
const overlay = document.getElementById("over");
const overTitle = document.getElementById("over-title");
const overMsg = document.getElementById("over-msg");

let diff = "beginner";
let cols, rows, mineCount, cells, started, dead, won, flagMode, flags, seconds, timer;

function bestKey() {
  return `squinks.minesweeper.time.${diff}`;
}

function neighbors(i) {
  const x = i % cols, y = Math.floor(i / cols), out = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) out.push(ny * cols + nx);
    }
  return out;
}

function newGame() {
  const d = DIFFS[diff];
  cols = d.w; rows = d.h; mineCount = d.m;
  cells = Array.from({ length: cols * rows }, () => ({ mine: false, adj: 0, revealed: false, flagged: false }));
  started = false; dead = false; won = false; flags = 0; seconds = 0;
  stopTimer();
  overlay.classList.add("hidden");
  updateHud();
  render();
}

function placeMines(safe) {
  const forbidden = new Set([safe, ...neighbors(safe)]);
  let placed = 0;
  while (placed < mineCount) {
    const i = Math.floor(Math.random() * cells.length);
    if (forbidden.has(i) || cells[i].mine) continue;
    cells[i].mine = true;
    placed++;
  }
  for (let i = 0; i < cells.length; i++) {
    if (!cells[i].mine) cells[i].adj = neighbors(i).filter((n) => cells[n].mine).length;
  }
}

function startTimer() {
  timer = setInterval(() => {
    seconds++;
    timeEl.textContent = seconds;
  }, 1000);
}
function stopTimer() {
  if (timer) clearInterval(timer);
  timer = null;
}

function reveal(i) {
  const c = cells[i];
  if (dead || won || c.revealed || c.flagged) return;
  if (!started) {
    placeMines(i);
    started = true;
    startTimer();
  }
  if (c.mine) {
    c.revealed = true;
    lose();
    return;
  }
  // flood fill zeros
  const stack = [i];
  while (stack.length) {
    const k = stack.pop();
    const cc = cells[k];
    if (cc.revealed || cc.flagged) continue;
    cc.revealed = true;
    if (cc.adj === 0) for (const n of neighbors(k)) if (!cells[n].revealed) stack.push(n);
  }
  render();
  checkWin();
}

function toggleFlag(i) {
  const c = cells[i];
  if (dead || won || c.revealed) return;
  if (!started) return; // nothing to flag before first reveal
  c.flagged = !c.flagged;
  flags += c.flagged ? 1 : -1;
  updateHud();
  render();
}

function checkWin() {
  const revealed = cells.filter((c) => c.revealed).length;
  if (revealed === cells.length - mineCount) {
    won = true;
    stopTimer();
    const prev = getNumber(bestKey(), null);
    if (prev === null || seconds < prev) setNumber(bestKey(), seconds);
    updateHud();
    overTitle.textContent = "Cleared!";
    overMsg.textContent = `Time ${seconds}s · Best ${getNumber(bestKey(), seconds)}s`;
    overlay.classList.remove("hidden");
  }
}

function lose() {
  dead = true;
  stopTimer();
  for (const c of cells) if (c.mine) c.revealed = true;
  render();
  overTitle.textContent = "Boom";
  overMsg.textContent = "You hit a mine.";
  overlay.classList.remove("hidden");
}

function updateHud() {
  timeEl.textContent = seconds;
  minesEl.textContent = Math.max(0, mineCount - flags);
  const b = getNumber(bestKey(), null);
  bestEl.textContent = b === null ? "—" : b + "s";
}

function render() {
  boardEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  let html = "";
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    let cls = "cell", txt = "", style = "";
    if (c.revealed) {
      cls += " open";
      if (c.mine) { cls += " mine"; txt = "●"; }
      else if (c.adj) { txt = c.adj; style = `color:${NUMCOLORS[c.adj]}`; }
    } else if (c.flagged) {
      cls += " flag";
      txt = "⚑";
    }
    html += `<div class="${cls}" data-i="${i}"${style ? ` style="${style}"` : ""}>${txt}</div>`;
  }
  boardEl.innerHTML = html;
}

// Pointer: tap reveal, long-press flag
let pressTimer = null, longFired = false;
boardEl.addEventListener("pointerdown", (e) => {
  const el = e.target.closest(".cell");
  if (!el) return;
  const i = +el.dataset.i;
  longFired = false;
  pressTimer = setTimeout(() => { longFired = true; toggleFlag(i); }, 400);
});
boardEl.addEventListener("pointerup", (e) => {
  clearTimeout(pressTimer);
  if (e.button !== 0) return; // right/middle button flags via contextmenu, never reveals
  const el = e.target.closest(".cell");
  if (!el) return;
  if (longFired) return;
  const i = +el.dataset.i;
  if (flagMode) toggleFlag(i);
  else reveal(i);
});
boardEl.addEventListener("pointerleave", () => clearTimeout(pressTimer));
boardEl.addEventListener("pointercancel", () => clearTimeout(pressTimer));
boardEl.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  const el = e.target.closest(".cell");
  if (el) toggleFlag(+el.dataset.i);
});

flagBtn.addEventListener("click", () => {
  flagMode = !flagMode;
  flagBtn.textContent = `Flag mode: ${flagMode ? "ON" : "OFF"}`;
});

document.querySelectorAll(".diff").forEach((b) => {
  b.addEventListener("click", () => {
    diff = b.dataset.diff;
    document.querySelectorAll(".diff").forEach((x) => x.classList.toggle("active", x === b));
    newGame();
  });
});

document.getElementById("new").addEventListener("click", newGame);
document.getElementById("again").addEventListener("click", newGame);
document.getElementById("reset").addEventListener("click", () => {
  if (confirm("Clear ALL Minesweeper best times (every difficulty)?")) {
    remove("squinks.minesweeper.time.beginner");
    remove("squinks.minesweeper.time.intermediate");
    remove("squinks.minesweeper.time.expert");
    updateHud();
  }
});

// init
flagMode = false;
document.querySelector('.diff[data-diff="beginner"]').classList.add("active");
newGame();
