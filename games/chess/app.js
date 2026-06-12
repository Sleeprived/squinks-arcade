/* Chess vs Stockfish — fully client-side (Stockfish WASM + chess.js).
 *
 * Mirrors the Python backend's logic: a tree of "timelines" (variations), an
 * eval/win bar, hint, undo/redo, and a clickable move timeline. The engine runs
 * in a Web Worker and is only queried for genuinely new positions, so navigating
 * existing lines is deterministic (a redone engine reply is always the same).
 */

import { Chess } from "./vendor/chess.js";

const FILES = "abcdefgh";
const GLYPHS = { p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚" };

// --- Stockfish (UCI over a Web Worker) -------------------------------------

function parseInfo(line) {
  const m = line.match(/ score (cp|mate) (-?\d+)/);
  if (!m) return null;
  const pv = line.match(/ pv (\S+)/);
  return { kind: m[1], value: parseInt(m[2], 10), pv: pv ? pv[1] : null };
}

class Engine {
  constructor(url) {
    this.listeners = new Set();
    this.lock = Promise.resolve();          // serializes searches
    this.worker = new Worker(url);
    this.worker.onmessage = (e) => {
      const line = typeof e.data === "string" ? e.data : (e.data && e.data.data) || "";
      this.listeners.forEach((fn) => fn(line));
    };
    this.worker.onerror = (e) => console.error("Stockfish worker error:", e.message || e);
    this.post("uci");
    // This build defaults Use NNUE = false (classical eval). Turn it on so the
    // ~40 MB net is fetched and we get full strength. If the net ever fails to
    // load, Stockfish falls back to classical automatically (still plays).
    this.post("setoption name Use NNUE value true");
    this.post("isready");
    this.readyPromise = new Promise((resolve) => {
      const fn = (line) => {
        if (line.includes("readyok")) { this.listeners.delete(fn); resolve(); }
      };
      this.listeners.add(fn);
    });
  }

  post(cmd) { this.worker.postMessage(cmd); }

  // Run a search to completion, returning {bestmove, info}. Serialized so UCI
  // state is never clobbered by overlapping searches.
  _run(commands) {
    const task = () => new Promise((resolve) => {
      let info = null;
      const fn = (line) => {
        if (line.startsWith("info") && line.includes(" pv ")) {
          const p = parseInfo(line);
          if (p) info = p;
        } else if (line.startsWith("bestmove")) {
          this.listeners.delete(fn);
          const bm = line.split(/\s+/)[1];
          resolve({ bestmove: bm && bm !== "(none)" ? bm : null, info });
        }
      };
      this.listeners.add(fn);
      commands.forEach((c) => this.post(c));
    });
    const p = this.lock.then(task, task);
    this.lock = p.catch(() => {});
    return p;
  }

  analyse(fen, movetime = 200) {
    return this._run([
      "setoption name Skill Level value 20",
      "position fen " + fen,
      "go movetime " + movetime,
    ]);
  }

  play(fen, skillLevel, movetime = 300) {
    return this._run([
      "setoption name Skill Level value " + skillLevel,
      "position fen " + fen,
      "go movetime " + movetime,
    ]);
  }
}

// --- Game state: a tree of timelines ---------------------------------------

let engine = null;
let game = new Chess();
let lines = [[]];          // each line = array of canonical UCI strings from start
let currentLine = 0;
let cursor = 0;            // plies of the current line on the board
let playerColor = "w";
let skill = 5;
let evalData = null;
let evalToken = 0;

// UI state
let flipped = false, selected = null, legalDests = [], hintSquares = [];
let pendingPromo = null, busy = false;

const uciToMove = (u) => ({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u.length > 4 ? u[4] : undefined });
const curMoves = () => lines[currentLine];
const playerIsWhite = () => playerColor === "w";
const whiteToMoveAt = (c) => c % 2 === 0;

function rebuild() {
  game.reset();
  for (const u of curMoves().slice(0, cursor)) game.move(uciToMove(u));
}

function cursorBack(c) {
  for (let n = c - 1; n >= 0; n--) if (whiteToMoveAt(n) === playerIsWhite()) return n;
  return null;
}
function cursorFwd(c, len) {
  for (let n = c + 1; n <= len; n++) if (whiteToMoveAt(n) === playerIsWhite()) return n;
  return null;
}

function sanOf(moves) {
  const t = new Chess();
  return moves.map((u) => { const m = t.move(uciToMove(u)); return m ? m.san : u; });
}

function kingSquare(color) {
  const b = game.board();
  for (let r = 0; r < 8; r++)
    for (let f = 0; f < 8; f++) {
      const c = b[r][f];
      if (c && c.type === "k" && c.color === color) return FILES[f] + (8 - r);
    }
  return null;
}

function outcomeText() {
  if (game.in_checkmate()) return (game.turn() === "b" ? "White" : "Black") + " wins by checkmate";
  if (game.in_stalemate()) return "Draw (stalemate)";
  if (game.insufficient_material()) return "Draw (insufficient material)";
  if (game.in_threefold_repetition()) return "Draw (threefold repetition)";
  if (game.in_draw()) return "Draw (50-move rule)";
  return null;
}

// --- Engine interaction ----------------------------------------------------

function winProb(cp) { return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1); }

async function evaluate() {
  if (game.game_over()) {
    if (game.in_checkmate()) {
      const whiteWins = game.turn() === "b";
      return { win_white: whiteWins ? 100 : 0, label: whiteWins ? "1–0" : "0–1" };
    }
    return { win_white: 50, label: "½–½" };
  }
  const { info } = await engine.analyse(game.fen(), 200);
  if (!info) return { win_white: 50, label: "…" };
  let value = info.value;
  if (game.turn() === "b") value = -value;            // convert to White's POV
  if (info.kind === "mate") return { mate: value, win_white: value > 0 ? 100 : 0, label: "M" + Math.abs(value) };
  return { cp: value, win_white: winProb(value), label: (value > 0 ? "+" : "") + (value / 100).toFixed(1) };
}

function updateEval() {
  const mine = ++evalToken;
  evalData = null;
  renderEval();
  evaluate().then((e) => { if (mine === evalToken) { evalData = e; renderEval(); } });
}

async function engineReply() {
  if (game.game_over() || game.turn() === playerColor) return null;
  const { bestmove } = await engine.play(game.fen(), skill, 300);
  if (bestmove) {
    game.move(uciToMove(bestmove));
    curMoves().push(bestmove);
    cursor++;
  }
  return bestmove;
}

// --- Moves & branching -----------------------------------------------------

async function commitMove(from, to, promotion) {
  busy = true; selected = null; legalDests = []; hintSquares = [];
  render();

  // Validate & canonicalize against the live position.
  const test = new Chess(game.fen());
  const res = test.move({ from, to, promotion: promotion || undefined });
  if (!res) { busy = false; render(); return; }
  const uci = res.from + res.to + (res.promotion || "");

  const line = curMoves();
  const replaying = cursor < line.length && line[cursor] === uci;
  if (replaying) {
    cursor++;
  } else if (cursor < line.length) {
    lines.push(line.slice(0, cursor).concat([uci]));   // branch into a new timeline
    currentLine = lines.length - 1;
    cursor++;
  } else {
    line.push(uci);                                    // extend current timeline
    cursor++;
  }
  game.move({ from, to, promotion: promotion || undefined });

  render();            // show the player's move immediately
  updateEval();

  if (game.game_over()) { busy = false; render(); updateEval(); return; }

  if (replaying && cursor < curMoves().length && game.turn() !== playerColor) {
    game.move(uciToMove(curMoves()[cursor]));          // replay stored engine reply
    cursor++;
  } else {
    await new Promise((r) => setTimeout(r, 200));      // tiny beat before engine moves
    await engineReply();
  }
  busy = false;
  render();
  updateEval();
}

function tryMove(from, to) {
  const pieces = parseFEN(game.fen());
  const p = pieces[from];
  const rank = +to[1];
  if (p && p.type === "p" && (rank === 8 || rank === 1)) {
    pendingPromo = { from, to };
    document.getElementById("promoOverlay").classList.remove("hidden");
    return;
  }
  commitMove(from, to, null);
}

// --- Navigation (no engine; deterministic) ---------------------------------

function afterNav() { selected = null; legalDests = []; hintSquares = []; render(); updateEval(); }

function undo() { if (busy) return; const t = cursorBack(cursor); if (t !== null) { cursor = t; rebuild(); afterNav(); } }
function redo() { if (busy) return; const t = cursorFwd(cursor, curMoves().length); if (t !== null) { cursor = t; rebuild(); afterNav(); } }
function gotoPly(line, ply) {
  if (busy || line < 0 || line >= lines.length) return;
  currentLine = line;
  cursor = Math.max(0, Math.min(lines[line].length, ply));
  rebuild();
  afterNav();
}

async function hint() {
  if (busy || game.game_over() || game.turn() !== playerColor) return;
  document.getElementById("hint").disabled = true;
  const { bestmove } = await engine.analyse(game.fen(), 500);
  if (bestmove) hintSquares = [bestmove.slice(0, 2), bestmove.slice(2, 4)];
  render();
}

// --- Rendering -------------------------------------------------------------

function parseFEN(fen) {
  const rows = fen.split(" ")[0].split("/");
  const map = {};
  rows.forEach((row, r) => {
    let file = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) { file += +ch; continue; }
      map[FILES[file] + (8 - r)] = { type: ch.toLowerCase(), color: ch === ch.toUpperCase() ? "w" : "b" };
      file++;
    }
  });
  return map;
}

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const turnEl = document.getElementById("turn");
const skillEl = document.getElementById("skill");
const skillLabel = document.getElementById("skillLabel");
const colorSelect = document.getElementById("color");
const undoBtn = document.getElementById("undo");
const redoBtn = document.getElementById("redo");
const hintBtn = document.getElementById("hint");
const evalNum = document.getElementById("evalNum");
const timelineEl = document.getElementById("timeline");
const promoOverlay = document.getElementById("promoOverlay");

function lastMoveSquares() {
  if (cursor < 1) return null;
  const u = curMoves()[cursor - 1];
  return [u.slice(0, 2), u.slice(2, 4)];
}

function renderEval() {
  const bar = document.getElementById("evalbar");
  bar.classList.toggle("flip", flipped);
  // --win drives the white share: height of the vertical bar on desktop,
  // width of the horizontal bar on phones (see style.css media query).
  if (!evalData) { bar.style.setProperty("--win", "50%"); evalNum.textContent = "…"; return; }
  bar.style.setProperty("--win", Math.max(0, Math.min(100, evalData.win_white)) + "%");
  evalNum.textContent = evalData.label;
}

function renderTimeline() {
  timelineEl.innerHTML = "";
  if (!lines.some((l) => l.length > 0)) {
    const span = document.createElement("span");
    span.className = "timeline-empty";
    span.textContent = "No moves yet — make your first move.";
    timelineEl.appendChild(span);
    return;
  }
  lines.forEach((moves, li) => {
    if (moves.length === 0) return;
    const sans = sanOf(moves);
    const row = document.createElement("div");
    row.className = "tl-row" + (li === currentLine ? " active" : "");
    const label = document.createElement("span");
    label.className = "tl-label";
    label.textContent = li + 1;
    row.appendChild(label);
    sans.forEach((san, i) => {
      if (i % 2 === 0) {
        const no = document.createElement("span");
        no.className = "move-no";
        no.textContent = i / 2 + 1 + ".";
        row.appendChild(no);
      }
      const ply = document.createElement("span");
      ply.className = "ply";
      if (li === currentLine && i === cursor - 1) ply.classList.add("current");
      else if (li === currentLine && i >= cursor) ply.classList.add("future");
      else if (li !== currentLine) ply.classList.add("alt");
      ply.textContent = san;
      ply.addEventListener("click", () => gotoPly(li, i + 1));
      row.appendChild(ply);
    });
    timelineEl.appendChild(row);
  });
}

function render() {
  const pieces = parseFEN(game.fen());
  const last = lastMoveSquares();
  const checkSq = game.in_check() ? kingSquare(game.turn()) : null;
  boardEl.innerHTML = "";

  const ranks = flipped ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
  const files = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

  for (const rank of ranks) {
    for (const f of files) {
      const sq = FILES[f] + rank;
      const cell = document.createElement("div");
      cell.className = "square " + ((f + rank) % 2 === 0 ? "dark" : "light");
      if (last && last.includes(sq)) cell.classList.add("last");
      if (hintSquares.includes(sq)) cell.classList.add("hint");
      if (checkSq === sq) cell.classList.add("check");
      if (selected === sq) cell.classList.add("sel");

      const p = pieces[sq];
      if (p) {
        const span = document.createElement("span");
        span.className = "piece " + p.color;
        span.textContent = GLYPHS[p.type];
        cell.appendChild(span);
      }
      if (legalDests.includes(sq)) {
        const dot = document.createElement("span");
        dot.className = "dot" + (p ? " capture" : "");
        cell.appendChild(dot);
      }
      cell.addEventListener("click", () => onSquareClick(sq));
      boardEl.appendChild(cell);
    }
  }

  renderEval();
  renderTimeline();

  const over = game.game_over();
  const myTurn = game.turn() === playerColor && !over;
  const reviewing = cursor < curMoves().length;
  undoBtn.disabled = busy || cursorBack(cursor) === null;
  redoBtn.disabled = busy || cursorFwd(cursor, curMoves().length) === null;
  hintBtn.disabled = busy || !myTurn;

  if (over) {
    statusEl.textContent = outcomeText();
    turnEl.textContent = "Game over";
  } else if (busy) {
    statusEl.textContent = "Stockfish is thinking…";
    turnEl.textContent = (game.turn() === "w" ? "White" : "Black") + " to move";
  } else if (reviewing) {
    statusEl.textContent = "Reviewing timeline " + (currentLine + 1);
    turnEl.textContent = myTurn
      ? "Play a move to branch into a new timeline, or Redo to continue"
      : "Click a later move or Redo to continue";
  } else {
    statusEl.textContent = myTurn ? "Your move" : "Stockfish to move";
    turnEl.textContent = (game.turn() === "w" ? "White" : "Black") + " to move";
  }
}

// --- Interaction -----------------------------------------------------------

function onSquareClick(sq) {
  if (busy || game.game_over() || game.turn() !== playerColor) return;
  hintSquares = [];
  const pieces = parseFEN(game.fen());
  const piece = pieces[sq];
  if (selected && legalDests.includes(sq)) { tryMove(selected, sq); return; }
  if (piece && piece.color === playerColor) {
    selected = sq;
    legalDests = game.moves({ square: sq, verbose: true }).map((m) => m.to);
  } else {
    selected = null; legalDests = [];
  }
  render();
}

promoOverlay.querySelectorAll("button").forEach((btn) => {
  btn.addEventListener("click", () => {
    promoOverlay.classList.add("hidden");
    if (pendingPromo) {
      const { from, to } = pendingPromo;
      pendingPromo = null;
      commitMove(from, to, btn.dataset.p);
    }
  });
});

skillEl.addEventListener("input", () => { skillLabel.textContent = skillEl.value; skill = +skillEl.value; });
undoBtn.addEventListener("click", undo);
redoBtn.addEventListener("click", redo);
hintBtn.addEventListener("click", hint);
document.getElementById("newGame").addEventListener("click", newGame);

async function newGame() {
  playerColor = colorSelect.value === "black" ? "b" : "w";
  flipped = playerColor === "b";
  skill = +skillEl.value;
  lines = [[]]; currentLine = 0; cursor = 0; game.reset();
  selected = null; legalDests = []; hintSquares = []; busy = true;
  render(); statusEl.textContent = "Starting…";
  if (playerColor === "b") await engineReply();
  busy = false;
  render(); updateEval();
}

// --- Boot ------------------------------------------------------------------

window.addEventListener("load", async () => {
  statusEl.textContent = "Loading engine (first run downloads the neural net ~40 MB)…";
  engine = new Engine("vendor/stockfish-nnue-16-single.js");
  await engine.readyPromise;
  await newGame();
  // Service worker is registered by the Squinks Arcade root (../../sw.js);
  // chess relies on that and does not register its own.
});
