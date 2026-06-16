/* Muncher — original maze chomper. One hand-designed maze (verified connected),
   4 pursuers with distinct chase styles (direct chaser / ambusher / wanderer /
   patroller), power-pellets that flip pursuers edible for an escalating bonus,
   an occasional fruit, a side tunnel that wraps, an endless speed ramp on each
   maze clear, 3 lives + a bonus life every 10,000 points (capped at 5).

   Self-contained like the other one-off arcade games; only the shared lives /
   theme helpers are imported. Art is geometric, drawn from theme CSS vars;
   pursuer colors stay fixed for legibility (allowed by the theme rule). */

import { cssVar, makeLives, awardBonus, renderLives } from "../../js/arcade-engine.js";
import { getNumber, setNumber, remove } from "../../js/storage.js";

const KEY = "squinks.muncher.best";

// Hand-designed maze: '#' wall, '.' pellet, 'o' power-pellet, ' ' empty path.
// Row 10 has open ends — the side tunnel that wraps. Verified fully connected.
const MAZE = [
  "###################",
  "#........#........#",
  "#o###.##.#.##.###o#",
  "#.................#",
  "#.##.#.#####.#.##.#",
  "#....#...#...#....#",
  "####.###.#.###.####",
  "#......#...#......#",
  "#.####.#.#.#.####.#",
  "#.#......#......#.#",
  "...#.###.#.###.#...",
  "#.#......#......#.#",
  "#.####.#.#.#.####.#",
  "#......#...#......#",
  "####.###.#.###.####",
  "#....#...#...#....#",
  "#.##.#.#####.#.##.#",
  "#.................#",
  "#o###.##.#.##.###o#",
  "#........#........#",
  "###################",
];
const W = MAZE[0].length; // 19
const H = MAZE.length; // 21

const PLAYER_START = { cx: 9, cy: 17 };
const GHOST_DEFS = [
  { style: "chaser", color: "#ff4d4d", start: { cx: 8, cy: 9 } },
  { style: "ambusher", color: "#ff9ed8", start: { cx: 10, cy: 9 } },
  { style: "wanderer", color: "#4de2e6", start: { cx: 6, cy: 9 } },
  { style: "patroller", color: "#ffb24d", start: { cx: 12, cy: 9 } },
];
const CORNERS = [
  { cx: 1, cy: 1 },
  { cx: 17, cy: 1 },
  { cx: 1, cy: 19 },
  { cx: 17, cy: 19 },
];
const FRUIT_CELL = { cx: 9, cy: 7 };
const POWER_FRAMES = 7 * 60; // ~7s edible window
const FRUIT_FRAMES = 9 * 60;

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const livesEl = document.getElementById("lives");
const levelEl = document.getElementById("level");
const overlay = document.getElementById("over");
const overMsg = document.getElementById("over-msg");

let cell = 18;
let pellets, pelletCount, player, ghosts, lives, score, level;
let powerTime, chain, fruit, fruitTime, fruitsThisMaze, pelletsEaten;
let over, paused, last, ready;

const wrapX = (x) => ((x % W) + W) % W;
const isWall = (x, y) => y < 0 || y >= H || MAZE[y][wrapX(x)] === "#";
const canEnter = (x, y) => !isWall(x, y);

function fit() {
  const maxW = window.innerWidth - 24;
  const maxH = window.innerHeight - 240;
  cell = Math.max(10, Math.floor(Math.min(maxW / W, maxH / H)));
  canvas.width = cell * W;
  canvas.height = cell * H;
  draw();
}

function buildPellets() {
  pellets = new Map();
  pelletCount = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const ch = MAZE[y][x];
      if (ch === "." || ch === "o") {
        pellets.set(`${x},${y}`, ch);
        pelletCount++;
      }
    }
  }
}

function spawnActor(start, dir = { x: 0, y: 0 }) {
  return { cx: start.cx, cy: start.cy, dir: { ...dir }, progress: 0 };
}

function resetActors() {
  player = spawnActor(PLAYER_START, { x: -1, y: 0 });
  player.next = { x: -1, y: 0 };
  player.mouth = 0;
  ghosts = GHOST_DEFS.map((d, i) => {
    const g = spawnActor(d.start);
    g.def = d;
    g.wp = i; // patroller waypoint index
    g.dir = { x: i % 2 === 0 ? -1 : 1, y: 0 };
    return g;
  });
  powerTime = 0;
  chain = 0;
  fruit = false;
  fruitTime = 0;
  ready = 90; // brief "Ready" pause at start of a life/maze
}

function reset() {
  buildPellets();
  score = 0;
  level = 1;
  lives = makeLives(3);
  fruitsThisMaze = 0;
  pelletsEaten = 0;
  resetActors();
  over = false;
  paused = false;
  overlay.classList.add("hidden");
  syncHud();
  last = performance.now();
}

function nextMaze() {
  buildPellets();
  level++;
  fruitsThisMaze = 0;
  pelletsEaten = 0;
  resetActors();
  syncHud();
}

function syncHud() {
  scoreEl.textContent = score;
  bestEl.textContent = getNumber(KEY, 0);
  renderLives(livesEl, lives.count);
  levelEl.textContent = level;
}

function saveBest() {
  if (score > getNumber(KEY, 0)) setNumber(KEY, score);
}

function speedPlayer() {
  return Math.min(0.2, 0.11 + (level - 1) * 0.008);
}
function speedGhost(g) {
  let s = Math.min(0.18, 0.1 + (level - 1) * 0.008);
  if (powerTime > 0) s *= 0.55; // edible pursuers slow down
  return s;
}

// ---- direction choice --------------------------------------------------
const DIRS = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

function candidates(a, allowReverse) {
  const rev = { x: -a.dir.x, y: -a.dir.y };
  const out = [];
  for (const d of DIRS) {
    if (!allowReverse && d.x === rev.x && d.y === rev.y) continue;
    if (canEnter(a.cx + d.x, a.cy + d.y)) out.push(d);
  }
  return out;
}

function dist(ax, ay, bx, by) {
  return (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
}

function chooseGhostDir(g) {
  let opts = candidates(g, false);
  if (opts.length === 0) opts = candidates(g, true); // dead end: allow reverse
  if (opts.length === 0) {
    g.dir = { x: 0, y: 0 };
    return;
  }
  if (g.def.style === "wanderer" && powerTime <= 0) {
    g.dir = opts[Math.floor(Math.random() * opts.length)];
    return;
  }
  // pick a target cell, then the option that best approaches (or flees) it
  let target;
  if (powerTime > 0) {
    // edible: flee the player
    target = { cx: player.cx, cy: player.cy };
    g.dir = pickByDist(g, opts, target, true);
    return;
  }
  if (g.def.style === "chaser") target = { cx: player.cx, cy: player.cy };
  else if (g.def.style === "ambusher")
    target = { cx: player.cx + player.dir.x * 4, cy: player.cy + player.dir.y * 4 };
  else if (g.def.style === "patroller") {
    const c = CORNERS[g.wp];
    if (Math.abs(g.cx - c.cx) + Math.abs(g.cy - c.cy) <= 1) g.wp = (g.wp + 1) % CORNERS.length;
    target = CORNERS[g.wp];
  } else target = { cx: player.cx, cy: player.cy };
  g.dir = pickByDist(g, opts, target, false);
}

function pickByDist(g, opts, target, flee) {
  let best = opts[0];
  let bestD = flee ? -Infinity : Infinity;
  for (const d of opts) {
    const nd = dist(g.cx + d.x, g.cy + d.y, target.cx, target.cy);
    if ((flee && nd > bestD) || (!flee && nd < bestD)) {
      bestD = nd;
      best = d;
    }
  }
  return best;
}

function choosePlayerDir() {
  const n = player.next;
  if ((n.x || n.y) && canEnter(player.cx + n.x, player.cy + n.y)) {
    player.dir = { ...n };
  } else if (!canEnter(player.cx + player.dir.x, player.cy + player.dir.y)) {
    player.dir = { x: 0, y: 0 };
  }
}

// ---- stepping ----------------------------------------------------------
function stepPlayer(dt) {
  if (player.dir.x === 0 && player.dir.y === 0) {
    choosePlayerDir();
    if (player.dir.x === 0 && player.dir.y === 0) return;
  }
  player.progress += speedPlayer() * dt;
  player.mouth = (player.mouth + dt * 0.3) % 1;
  if (player.progress >= 1) {
    player.progress = 0;
    player.cx = wrapX(player.cx + player.dir.x);
    player.cy += player.dir.y;
    eatAt(player.cx, player.cy);
    choosePlayerDir();
  }
}

function stepGhost(g, dt) {
  if (g.dir.x === 0 && g.dir.y === 0) chooseGhostDir(g);
  if (g.dir.x === 0 && g.dir.y === 0) return;
  g.progress += speedGhost(g) * dt;
  if (g.progress >= 1) {
    g.progress = 0;
    g.cx = wrapX(g.cx + g.dir.x);
    g.cy += g.dir.y;
    chooseGhostDir(g);
  }
}

function eatAt(x, y) {
  const k = `${x},${y}`;
  const p = pellets.get(k);
  if (!p) return;
  pellets.delete(k);
  pelletCount--;
  pelletsEaten++;
  if (p === "o") {
    score += 50;
    powerTime = POWER_FRAMES;
    chain = 0;
  } else {
    score += 10;
  }
  // fruit appears twice per maze
  if (!fruit && (pelletsEaten === 70 || pelletsEaten === 150) && fruitsThisMaze < 2) {
    fruit = true;
    fruitTime = FRUIT_FRAMES;
    fruitsThisMaze++;
  }
  awardBonus(lives, score);
  saveBest();
  syncHud();
  if (pelletCount === 0) nextMaze();
}

function posX(a) {
  return a.cx + a.dir.x * a.progress;
}
function posY(a) {
  return a.cy + a.dir.y * a.progress;
}

function checkCollisions() {
  const px = posX(player);
  const py = posY(player);
  // fruit
  if (fruit && player.cx === FRUIT_CELL.cx && player.cy === FRUIT_CELL.cy) {
    fruit = false;
    score += 200;
    awardBonus(lives, score);
    saveBest();
    syncHud();
  }
  for (const g of ghosts) {
    if (dist(px, py, posX(g), posY(g)) > 0.45 * 0.45) continue;
    if (powerTime > 0 && !g.eaten) {
      // eat the pursuer: escalating 200/400/800/1600, respawn at its start
      const gain = 200 * Math.pow(2, Math.min(chain, 3));
      score += gain;
      chain++;
      Object.assign(g, spawnActor(g.def.start));
      g.def = GHOST_DEFS[ghosts.indexOf(g)];
      g.wp = ghosts.indexOf(g);
      g.dir = { x: 0, y: 0 };
      awardBonus(lives, score);
      saveBest();
      syncHud();
    } else if (powerTime <= 0) {
      loseLife();
      return;
    }
  }
}

function loseLife() {
  lives.count--;
  if (lives.count <= 0) {
    syncHud();
    gameOver();
    return;
  }
  resetActors();
  syncHud();
}

function gameOver() {
  over = true;
  saveBest();
  overMsg.textContent = `Score ${score} · Best ${getNumber(KEY, 0)}`;
  overlay.classList.remove("hidden");
}

// ---- render ------------------------------------------------------------
function draw() {
  if (!pellets) return;
  ctx.fillStyle = cssVar("--panel");
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // walls
  const wall = cssVar("--accent");
  ctx.fillStyle = wall;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (MAZE[y][x] === "#") {
        ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
      }
    }
  }

  // pellets
  ctx.fillStyle = cssVar("--text");
  for (const [k, type] of pellets) {
    const [x, y] = k.split(",").map(Number);
    const cx = x * cell + cell / 2;
    const cy = y * cell + cell / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, type === "o" ? cell * 0.3 : cell * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }

  // fruit
  if (fruit) {
    ctx.fillStyle = cssVar("--danger");
    const cx = FRUIT_CELL.cx * cell + cell / 2;
    const cy = FRUIT_CELL.cy * cell + cell / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, cell * 0.32, 0, Math.PI * 2);
    ctx.fill();
  }

  // ghosts
  for (const g of ghosts) {
    const gx = posX(g) * cell;
    const gy = posY(g) * cell;
    drawGhost(gx, gy, powerTime > 0 ? cssVar("--accent2") : g.def.color);
  }

  // player (chomping circle)
  const cxp = posX(player) * cell + cell / 2;
  const cyp = posY(player) * cell + cell / 2;
  const r = cell * 0.42;
  const open = 0.06 + 0.22 * Math.abs(Math.sin(player.mouth * Math.PI));
  let ang = 0;
  if (player.dir.x === 1) ang = 0;
  else if (player.dir.x === -1) ang = Math.PI;
  else if (player.dir.y === 1) ang = Math.PI / 2;
  else if (player.dir.y === -1) ang = -Math.PI / 2;
  ctx.fillStyle = cssVar("--accent2");
  ctx.beginPath();
  ctx.moveTo(cxp, cyp);
  ctx.arc(cxp, cyp, r, ang + open * Math.PI, ang - open * Math.PI + Math.PI * 2);
  ctx.closePath();
  ctx.fill();

  if (ready > 0) banner("Ready!");
  if (paused) banner("Paused");
}

function drawGhost(x, y, color) {
  ctx.fillStyle = color;
  const r = cell * 0.42;
  const cx = x + cell / 2;
  const top = y + cell * 0.12;
  ctx.beginPath();
  ctx.arc(cx, top + r, r, Math.PI, 0);
  ctx.lineTo(cx + r, top + r + cell * 0.34);
  ctx.lineTo(cx + r * 0.5, top + r + cell * 0.2);
  ctx.lineTo(cx, top + r + cell * 0.34);
  ctx.lineTo(cx - r * 0.5, top + r + cell * 0.2);
  ctx.lineTo(cx - r, top + r + cell * 0.34);
  ctx.closePath();
  ctx.fill();
  // eyes
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(cx - r * 0.4, top + r, r * 0.22, 0, Math.PI * 2);
  ctx.arc(cx + r * 0.4, top + r, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
}

function banner(text) {
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(0, canvas.height / 2 - 26, canvas.width, 52);
  ctx.fillStyle = cssVar("--text");
  ctx.textAlign = "center";
  ctx.font = `bold ${cell * 1.1}px system-ui, sans-serif`;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + cell * 0.4);
  ctx.textAlign = "start";
}

// ---- loop --------------------------------------------------------------
function update(dt) {
  if (ready > 0) {
    ready -= dt;
    return;
  }
  if (powerTime > 0) {
    powerTime -= dt;
    if (powerTime <= 0) chain = 0;
  }
  if (fruit && fruitTime > 0) {
    fruitTime -= dt;
    if (fruitTime <= 0) fruit = false;
  }
  stepPlayer(dt);
  for (const g of ghosts) stepGhost(g, dt);
  checkCollisions();
}

function loop(t) {
  let dt = (t - last) / 16.67;
  last = t;
  if (dt > 3) dt = 3;
  if (!over && !paused) update(dt);
  draw();
  requestAnimationFrame(loop);
}

// ---- input -------------------------------------------------------------
function setDir(x, y) {
  if (over) return;
  player.next = { x, y };
}

const KEYMAP = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  w: [0, -1],
  s: [0, 1],
  a: [-1, 0],
  d: [1, 0],
};
window.addEventListener("keydown", (e) => {
  if (e.key === " " || e.key === "p" || e.key === "P") {
    e.preventDefault();
    togglePause();
    return;
  }
  const m = KEYMAP[e.key];
  if (m) {
    e.preventDefault();
    setDir(m[0], m[1]);
  }
});

let tsx = 0,
  tsy = 0;
canvas.addEventListener(
  "touchstart",
  (e) => {
    if (paused) {
      togglePause();
      return;
    }
    const t = e.touches[0];
    tsx = t.clientX;
    tsy = t.clientY;
  },
  { passive: true }
);
canvas.addEventListener(
  "touchend",
  (e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - tsx;
    const dy = t.clientY - tsy;
    if (Math.abs(dx) < 16 && Math.abs(dy) < 16) return;
    if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0);
    else setDir(0, dy > 0 ? 1 : -1);
  },
  { passive: true }
);

document.querySelectorAll(".dpad .btn").forEach((b) => {
  b.addEventListener("click", () => {
    const m = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[b.dataset.dir];
    setDir(m[0], m[1]);
  });
});

function togglePause() {
  if (over) return;
  paused = !paused;
  last = performance.now();
}

document.getElementById("again").addEventListener("click", reset);
document.getElementById("pause").addEventListener("click", togglePause);
document.getElementById("reset").addEventListener("click", () => {
  if (confirm("Clear Muncher high score?")) {
    remove(KEY);
    syncHud();
  }
});
window.addEventListener("resize", fit);

reset();
fit();
requestAnimationFrame(loop);
