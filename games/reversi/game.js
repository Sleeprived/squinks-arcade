import { getNumber, setNumber, remove } from "../../js/storage.js";

const WINS_KEY = "squinks.reversi.wins";
const SIZE = 8;
const HUMAN = 1;
const AI = 2;
const DEPTHS = { easy: 1, medium: 3, hard: 4 };

const DIRS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
];

// Positional weights: corners are gold, the squares next to them are traps.
const WEIGHTS = [
  [120, -20, 20, 5, 5, 20, -20, 120],
  [-20, -40, -5, -5, -5, -5, -40, -20],
  [20, -5, 15, 3, 3, 15, -5, 20],
  [5, -5, 3, 3, 3, 3, -5, 5],
  [5, -5, 3, 3, 3, 3, -5, 5],
  [20, -5, 15, 3, 3, 15, -5, 20],
  [-20, -40, -5, -5, -5, -5, -40, -20],
  [120, -20, 20, 5, 5, 20, -20, 120],
];

const boardEl = document.getElementById("board");
const msgEl = document.getElementById("msg");
const youEl = document.getElementById("you");
const aiEl = document.getElementById("ai");
const winsEl = document.getElementById("wins");

let grid, turn, over, diff, thinking;

const opp = (p) => (p === HUMAN ? AI : HUMAN);

function emptyBoard() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}
function clone(g) {
  return g.map((r) => r.slice());
}

// Cells flipped if `player` plays (r,c). Empty array means the move is illegal.
function flipsFor(g, r, c, player) {
  if (g[r][c] !== 0) return [];
  const out = [];
  for (const [dr, dc] of DIRS) {
    const line = [];
    let rr = r + dr, cc = c + dc;
    while (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE && g[rr][cc] === opp(player)) {
      line.push([rr, cc]);
      rr += dr;
      cc += dc;
    }
    if (line.length && rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE && g[rr][cc] === player) {
      out.push(...line);
    }
  }
  return out;
}

function legalMoves(g, player) {
  const out = [];
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (g[r][c] === 0 && flipsFor(g, r, c, player).length) out.push({ r, c });
  return out;
}

function applyMove(g, r, c, player) {
  const flips = flipsFor(g, r, c, player);
  g[r][c] = player;
  for (const [fr, fc] of flips) g[fr][fc] = player;
}

function counts(g) {
  let h = 0, a = 0;
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) {
      if (g[r][c] === HUMAN) h++;
      else if (g[r][c] === AI) a++;
    }
  return { h, a };
}

// ---- AI ----
function evalBoard(g) {
  let s = 0;
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) {
      if (g[r][c] === AI) s += WEIGHTS[r][c];
      else if (g[r][c] === HUMAN) s -= WEIGHTS[r][c];
    }
  s += (legalMoves(g, AI).length - legalMoves(g, HUMAN).length) * 5;
  return s;
}

function minimax(g, depth, alpha, beta, player) {
  if (depth === 0) return evalBoard(g);
  const moves = legalMoves(g, player);
  if (moves.length === 0) {
    if (legalMoves(g, opp(player)).length === 0) return evalBoard(g); // terminal
    return minimax(g, depth, alpha, beta, opp(player)); // forced pass
  }
  if (player === AI) {
    let best = -Infinity;
    for (const m of moves) {
      const ng = clone(g);
      applyMove(ng, m.r, m.c, AI);
      best = Math.max(best, minimax(ng, depth - 1, alpha, beta, HUMAN));
      alpha = Math.max(alpha, best);
      if (alpha >= beta) break;
    }
    return best;
  }
  let best = Infinity;
  for (const m of moves) {
    const ng = clone(g);
    applyMove(ng, m.r, m.c, HUMAN);
    best = Math.min(best, minimax(ng, depth - 1, alpha, beta, AI));
    beta = Math.min(beta, best);
    if (alpha >= beta) break;
  }
  return best;
}

function chooseAI() {
  const moves = legalMoves(grid, AI);
  if (moves.length === 0) return null;
  if (diff === "easy" && Math.random() < 0.35) return moves[Math.floor(Math.random() * moves.length)];
  const depth = DEPTHS[diff];
  // Corner-first ordering improves pruning.
  const cornerScore = (m) => WEIGHTS[m.r][m.c];
  const ordered = moves.slice().sort((a, b) => cornerScore(b) - cornerScore(a));
  let best = -Infinity, bestM = ordered[0];
  for (const m of ordered) {
    const ng = clone(grid);
    applyMove(ng, m.r, m.c, AI);
    const sc = minimax(ng, depth - 1, -Infinity, Infinity, HUMAN);
    if (sc > best) { best = sc; bestM = m; }
  }
  return bestM;
}

// ---- flow ----
function newGame() {
  grid = emptyBoard();
  grid[3][3] = AI; grid[4][4] = AI;
  grid[3][4] = HUMAN; grid[4][3] = HUMAN;
  turn = HUMAN;
  over = false;
  thinking = false;
  render();
  proceed();
}

function humanMove(r, c) {
  if (over || thinking || turn !== HUMAN) return;
  if (flipsFor(grid, r, c, HUMAN).length === 0) return;
  applyMove(grid, r, c, HUMAN);
  turn = AI;
  render();
  proceed();
}

function aiMove() {
  const mv = chooseAI();
  if (mv) applyMove(grid, mv.r, mv.c, AI);
  thinking = false;
  turn = HUMAN;
  render();
  proceed();
}

// Decide what happens for the player whose turn it now is: move, pass, or end.
function proceed() {
  if (over) return;
  if (legalMoves(grid, turn).length > 0) {
    if (turn === AI) {
      thinking = true;
      msgEl.textContent = "AI is thinking…";
      render();
      setTimeout(aiMove, 320);
    } else {
      msgEl.textContent = "Your turn.";
      render();
    }
    return;
  }
  // current player must pass
  if (legalMoves(grid, opp(turn)).length === 0) {
    finish();
    return;
  }
  msgEl.textContent = turn === HUMAN ? "You have no move — passing." : "AI has no move — passing.";
  turn = opp(turn);
  proceed();
}

function finish() {
  over = true;
  thinking = false;
  const { h, a } = counts(grid);
  render();
  if (h > a) {
    const w = getNumber(WINS_KEY, 0) + 1;
    setNumber(WINS_KEY, w);
    winsEl.textContent = w;
    msgEl.textContent = `You win ${h}–${a}!`;
  } else if (a > h) {
    msgEl.textContent = `AI wins ${a}–${h}. Try again.`;
  } else {
    msgEl.textContent = `Tie ${h}–${a}.`;
  }
}

function render() {
  const showLegal = !over && !thinking && turn === HUMAN;
  const legalSet = new Set();
  if (showLegal) for (const m of legalMoves(grid, HUMAN)) legalSet.add(m.r * SIZE + m.c);

  let html = "";
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = grid[r][c];
      let inner = "";
      if (v === HUMAN) inner = '<div class="rv-disc p1"></div>';
      else if (v === AI) inner = '<div class="rv-disc p2"></div>';
      else if (legalSet.has(r * SIZE + c)) inner = '<div class="legal"></div>';
      html += `<div class="rvcell" data-r="${r}" data-c="${c}">${inner}</div>`;
    }
  }
  boardEl.innerHTML = html;

  const { h, a } = counts(grid);
  youEl.textContent = h;
  aiEl.textContent = a;
  winsEl.textContent = getNumber(WINS_KEY, 0);
}

boardEl.addEventListener("click", (e) => {
  const cell = e.target.closest(".rvcell");
  if (!cell) return;
  humanMove(+cell.dataset.r, +cell.dataset.c);
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
  if (confirm("Clear Reversi win count?")) {
    remove(WINS_KEY);
    winsEl.textContent = 0;
  }
});

// init
diff = "medium";
document.querySelector('.diff[data-diff="medium"]').classList.add("active");
newGame();
