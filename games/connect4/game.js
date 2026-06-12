import { getNumber, setNumber, remove } from "../../js/storage.js";

const WINS_KEY = "squinks.connect4.wins";
const ROWS = 6;
const COLS = 7;
const HUMAN = 1;
const AI = 2;
const DEPTHS = { easy: 2, medium: 4, hard: 6 };

const boardEl = document.getElementById("board");
const msgEl = document.getElementById("msg");
const winsEl = document.getElementById("wins");

let grid, turn, over, diff, thinking;

// ---- board helpers ----
function emptyGrid() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}
function clone(g) {
  return g.map((r) => r.slice());
}
function validCols(g) {
  const out = [];
  for (let c = 0; c < COLS; c++) if (g[0][c] === 0) out.push(c);
  return out;
}
function dropOn(g, c, piece) {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (g[r][c] === 0) { g[r][c] = piece; return r; }
  }
  return -1;
}
function winsOn(g, p) {
  // horizontal, vertical, both diagonals
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      if (g[r][c] !== p) continue;
      if (c + 3 < COLS && g[r][c + 1] === p && g[r][c + 2] === p && g[r][c + 3] === p) return true;
      if (r + 3 < ROWS && g[r + 1][c] === p && g[r + 2][c] === p && g[r + 3][c] === p) return true;
      if (r + 3 < ROWS && c + 3 < COLS && g[r + 1][c + 1] === p && g[r + 2][c + 2] === p && g[r + 3][c + 3] === p) return true;
      if (r + 3 < ROWS && c - 3 >= 0 && g[r + 1][c - 1] === p && g[r + 2][c - 2] === p && g[r + 3][c - 3] === p) return true;
    }
  return false;
}
function isFull(g) {
  return validCols(g).length === 0;
}

// ---- AI ----
function evalWindow(cells, piece) {
  const opp = piece === AI ? HUMAN : AI;
  let me = 0, op = 0, empty = 0;
  for (const v of cells) {
    if (v === piece) me++;
    else if (v === opp) op++;
    else empty++;
  }
  if (me === 4) return 100;
  if (me === 3 && empty === 1) return 5;
  if (me === 2 && empty === 2) return 2;
  if (op === 3 && empty === 1) return -4;
  return 0;
}
function scorePosition(g, piece) {
  let score = 0;
  for (let r = 0; r < ROWS; r++) if (g[r][3] === piece) score += 3; // center column
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS - 3; c++)
      score += evalWindow([g[r][c], g[r][c + 1], g[r][c + 2], g[r][c + 3]], piece);
  for (let c = 0; c < COLS; c++)
    for (let r = 0; r < ROWS - 3; r++)
      score += evalWindow([g[r][c], g[r + 1][c], g[r + 2][c], g[r + 3][c]], piece);
  for (let r = 0; r < ROWS - 3; r++)
    for (let c = 0; c < COLS - 3; c++)
      score += evalWindow([g[r][c], g[r + 1][c + 1], g[r + 2][c + 2], g[r + 3][c + 3]], piece);
  for (let r = 0; r < ROWS - 3; r++)
    for (let c = 3; c < COLS; c++)
      score += evalWindow([g[r][c], g[r + 1][c - 1], g[r + 2][c - 2], g[r + 3][c - 3]], piece);
  return score;
}
function minimax(g, depth, alpha, beta, maximizing) {
  if (winsOn(g, AI)) return 100000 + depth;
  if (winsOn(g, HUMAN)) return -100000 - depth;
  const valid = validCols(g);
  if (valid.length === 0) return 0;
  if (depth === 0) return scorePosition(g, AI);
  if (maximizing) {
    let v = -Infinity;
    for (const c of valid) {
      const ng = clone(g);
      dropOn(ng, c, AI);
      v = Math.max(v, minimax(ng, depth - 1, alpha, beta, false));
      alpha = Math.max(alpha, v);
      if (alpha >= beta) break;
    }
    return v;
  } else {
    let v = Infinity;
    for (const c of valid) {
      const ng = clone(g);
      dropOn(ng, c, HUMAN);
      v = Math.min(v, minimax(ng, depth - 1, alpha, beta, true));
      beta = Math.min(beta, v);
      if (alpha >= beta) break;
    }
    return v;
  }
}
function chooseAI() {
  const valid = validCols(grid);
  if (diff === "easy" && Math.random() < 0.25) {
    return valid[Math.floor(Math.random() * valid.length)];
  }
  const depth = DEPTHS[diff];
  let bestScore = -Infinity;
  let bestCol = valid[0];
  // prefer center ordering for better pruning
  const ordered = valid.slice().sort((a, b) => Math.abs(3 - a) - Math.abs(3 - b));
  for (const c of ordered) {
    const ng = clone(grid);
    dropOn(ng, c, AI);
    const sc = winsOn(ng, AI) ? 1000000 : minimax(ng, depth - 1, -Infinity, Infinity, false);
    if (sc > bestScore) { bestScore = sc; bestCol = c; }
  }
  return bestCol;
}

// ---- flow ----
function newGame() {
  grid = emptyGrid();
  turn = HUMAN;
  over = false;
  thinking = false;
  msgEl.textContent = "Your turn. Tap a column.";
  render();
}

function humanMove(col) {
  if (over || thinking || turn !== HUMAN) return;
  if (grid[0][col] !== 0) return;
  dropOn(grid, col, HUMAN);
  render();
  if (winsOn(grid, HUMAN)) return finish(HUMAN);
  if (isFull(grid)) return finish(0);
  turn = AI;
  thinking = true;
  msgEl.textContent = "AI is thinking…";
  setTimeout(aiMove, 280);
}

function aiMove() {
  const col = chooseAI();
  dropOn(grid, col, AI);
  thinking = false;
  render();
  if (winsOn(grid, AI)) return finish(AI);
  if (isFull(grid)) return finish(0);
  turn = HUMAN;
  msgEl.textContent = "Your turn. Tap a column.";
}

function finish(winner) {
  over = true;
  render();
  if (winner === HUMAN) {
    const w = getNumber(WINS_KEY, 0) + 1;
    setNumber(WINS_KEY, w);
    winsEl.textContent = w;
    msgEl.textContent = "You win!";
  } else if (winner === AI) {
    msgEl.textContent = "AI wins. Try again.";
  } else {
    msgEl.textContent = "Draw.";
  }
}

function render() {
  let html = "";
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const v = grid[r][c];
      const cls = "c4cell" + (v === HUMAN ? " p1" : v === AI ? " p2" : "");
      html += `<div class="${cls}" data-col="${c}"></div>`;
    }
  }
  boardEl.innerHTML = html;
  winsEl.textContent = getNumber(WINS_KEY, 0);
}

boardEl.addEventListener("click", (e) => {
  const cell = e.target.closest(".c4cell");
  if (!cell) return;
  humanMove(+cell.dataset.col);
});

document.querySelectorAll(".diff").forEach((b) => {
  b.addEventListener("click", () => {
    diff = b.dataset.diff;
    document.querySelectorAll(".diff").forEach((x) => x.classList.toggle("active", x === b));
    newGame();
  });
});

document.getElementById("new").addEventListener("click", newGame);
document.getElementById("reset").addEventListener("click", () => {
  if (confirm("Clear Connect 4 win count?")) {
    remove(WINS_KEY);
    winsEl.textContent = 0;
  }
});

// init
diff = "medium";
document.querySelector('.diff[data-diff="medium"]').classList.add("active");
newGame();
