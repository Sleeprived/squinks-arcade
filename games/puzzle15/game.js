import { getNumber, setNumber, remove } from "../../js/storage.js";

const MOVES_KEY = "squinks.puzzle15.bestmoves";
const TIME_KEY = "squinks.puzzle15.besttime";
const N = 4;

const boardEl = document.getElementById("board");
const movesEl = document.getElementById("moves");
const timeEl = document.getElementById("time");
const bestMovesEl = document.getElementById("bestmoves");
const bestTimeEl = document.getElementById("besttime");
const overlay = document.getElementById("over");
const overMsg = document.getElementById("over-msg");

let tiles, blank, moves, started, startTime, timerId, solved;

function solvedState() {
  const a = [];
  for (let i = 1; i <= 15; i++) a.push(i);
  a.push(0);
  return a;
}

function isSolved() {
  for (let i = 0; i < 15; i++) if (tiles[i] !== i + 1) return false;
  return tiles[15] === 0;
}

function neighbors(idx) {
  const r = Math.floor(idx / N), c = idx % N;
  const out = [];
  if (r > 0) out.push(idx - N);
  if (r < N - 1) out.push(idx + N);
  if (c > 0) out.push(idx - 1);
  if (c < N - 1) out.push(idx + 1);
  return out;
}

// Scramble by walking the blank through random legal moves from the solved
// state — this can only produce solvable positions. Avoid undoing the previous
// move so the walk actually scrambles.
function shuffle() {
  tiles = solvedState();
  blank = 15;
  let prev = -1;
  for (let i = 0; i < 300; i++) {
    const ns = neighbors(blank).filter((n) => n !== prev);
    const pick = ns[Math.floor(Math.random() * ns.length)];
    prev = blank;
    tiles[blank] = tiles[pick];
    tiles[pick] = 0;
    blank = pick;
  }
  if (isSolved()) shuffle();
}

function fmtTime(secs) {
  return secs == null ? "—" : secs + "s";
}

function updateStats() {
  movesEl.textContent = moves;
  bestMovesEl.textContent = getNumber(MOVES_KEY, null) ?? "—";
  bestTimeEl.textContent = fmtTime(getNumber(TIME_KEY, null));
}

function render() {
  let html = "";
  for (let i = 0; i < 16; i++) {
    if (tiles[i] === 0) html += `<div class="t15 blank"></div>`;
    else html += `<div class="t15" data-i="${i}">${tiles[i]}</div>`;
  }
  boardEl.innerHTML = html;
}

function elapsedSec() {
  return started ? Math.floor((Date.now() - startTime) / 1000) : 0;
}

function tick() {
  timeEl.textContent = elapsedSec();
}

function startTimer() {
  started = true;
  startTime = Date.now();
  timerId = setInterval(tick, 250);
}

function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

function newGame() {
  shuffle();
  moves = 0;
  started = false;
  solved = false;
  stopTimer();
  timeEl.textContent = 0;
  overlay.classList.add("hidden");
  render();
  updateStats();
}

function doMove(idx) {
  if (solved) return;
  if (!neighbors(blank).includes(idx)) return;
  tiles[blank] = tiles[idx];
  tiles[idx] = 0;
  blank = idx;
  if (!started) startTimer();
  moves++;
  render();
  updateStats();
  if (isSolved()) finish();
}

function finish() {
  solved = true;
  stopTimer();
  const secs = Math.floor((Date.now() - startTime) / 1000);
  timeEl.textContent = secs;
  const bm = getNumber(MOVES_KEY, null);
  if (bm === null || moves < bm) setNumber(MOVES_KEY, moves);
  const bt = getNumber(TIME_KEY, null);
  if (bt === null || secs < bt) setNumber(TIME_KEY, secs);
  updateStats();
  overMsg.textContent = `Solved in ${moves} moves · ${secs}s`;
  overlay.classList.remove("hidden");
}

boardEl.addEventListener("click", (e) => {
  const cell = e.target.closest(".t15");
  if (!cell || !cell.dataset.i) return;
  doMove(+cell.dataset.i);
});

window.addEventListener("keydown", (e) => {
  const r = Math.floor(blank / N), c = blank % N;
  let target = -1;
  if (e.key === "ArrowUp" && r < N - 1) target = blank + N;
  else if (e.key === "ArrowDown" && r > 0) target = blank - N;
  else if (e.key === "ArrowLeft" && c < N - 1) target = blank + 1;
  else if (e.key === "ArrowRight" && c > 0) target = blank - 1;
  if (target >= 0) {
    e.preventDefault();
    doMove(target);
  }
});

document.getElementById("new").addEventListener("click", newGame);
document.getElementById("again").addEventListener("click", newGame);
document.getElementById("reset").addEventListener("click", () => {
  if (confirm("Clear 15-Puzzle records (best moves and fastest time)?")) {
    remove(MOVES_KEY);
    remove(TIME_KEY);
    updateStats();
  }
});

newGame();
