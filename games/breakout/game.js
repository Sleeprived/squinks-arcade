import { getNumber, setNumber, remove } from "../../js/storage.js";
import { cssVar, renderLives } from "../../js/arcade-engine.js";

const KEY = "squinks.breakout.best";

// Fixed internal resolution; CSS scales the canvas down on small screens, so
// physics never has to cope with a mid-game resize.
const W = 360, H = 480;
const PADDLE_W = 64, PADDLE_H = 12, PADDLE_Y = H - 30;
const BALL_R = 6;
const COLS = 8, ROWS = 5;
const PAD = 16, TOP = 52, GAP = 6;
const BRICK_W = (W - PAD * 2 - GAP * (COLS - 1)) / COLS;
const BRICK_H = 16;
const ROW_COLORS = ["#ff4d6d", "#ff9f1c", "#ffd23f", "#2ec4b6", "#4cc9f0"];

const BASE_SPEED = 4.2, MAX_SPEED = 11.0;
const LEVEL_SPEEDUP = 0.6; // base speed added at the start of each new level
const HIT_SPEEDUP = 0.05; // speed a ball gains for every brick it breaks
const PADDLE_SPEED = 8; // px/frame for smooth keyboard paddle movement

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
canvas.width = W;
canvas.height = H;

const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const bestEl = document.getElementById("best");
const levelEl = document.getElementById("level");
const overlay = document.getElementById("over");
const overMsg = document.getElementById("over-msg");
const pauseBtn = document.getElementById("pause");

let paddleX, balls, bricks, score, lives, level, alive, paused, last;
let keyLeft = false, keyRight = false;

// Each ball carries its own speed (`spd`): it climbs as the ball breaks bricks
// and resets to the level's base on a new level. The base rises each level.
function baseSpeedFor(lvl) {
  return Math.min(MAX_SPEED, BASE_SPEED + (lvl - 1) * LEVEL_SPEEDUP);
}

// One ball, plus an extra at every level that is a power of two: levels
// 1,2,4,8,16 give 1,2,3,4,5 balls. Integer-exact (no Math.log2 rounding).
function ballCountFor(lvl) {
  let n = 1;
  for (let t = 2; t <= lvl; t *= 2) n++;
  return n;
}

function buildBricks() {
  bricks = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      bricks.push({
        x: PAD + c * (BRICK_W + GAP),
        y: TOP + r * (BRICK_H + GAP),
        alive: true,
        color: ROW_COLORS[r % ROW_COLORS.length],
        points: (ROWS - r) * 10,
      });
    }
  }
}

// Spawn this level's full set of balls, all resting on the paddle. Multiple
// balls fan out horizontally so the count is visible before launch.
function spawnBalls() {
  const n = ballCountFor(level);
  const base = baseSpeedFor(level);
  balls = [];
  for (let i = 0; i < n; i++) {
    const offset = (i - (n - 1) / 2) * 14;
    balls.push({ x: paddleX + offset, y: PADDLE_Y - BALL_R - 1, vx: 0, vy: 0, spd: base, stuck: true, offset, dead: false });
  }
}

function launch() {
  if (!alive || paused) return false;
  const stuckBalls = balls.filter((b) => b.stuck);
  if (stuckBalls.length === 0) return false;
  const n = stuckBalls.length;
  stuckBalls.forEach((b, i) => {
    b.stuck = false;
    // one ball: random side; several: fan across a spread of angles.
    const rel = n > 1 ? (i / (n - 1) - 0.5) * 1.1 : Math.random() < 0.5 ? -0.45 : 0.45;
    b.vx = b.spd * rel;
    b.vy = -Math.sqrt(Math.max(1, b.spd * b.spd - b.vx * b.vx));
  });
  return true;
}

function updateScore() {
  scoreEl.textContent = score;
  bestEl.textContent = getNumber(KEY, 0);
  levelEl.textContent = level;
  renderLives(livesEl, lives);
}

function saveIfBest() {
  if (score > getNumber(KEY, 0)) setNumber(KEY, score);
}

function newGame() {
  paddleX = W / 2;
  score = 0;
  lives = 3;
  level = 1;
  buildBricks();
  spawnBalls();
  keyLeft = keyRight = false;
  alive = true;
  paused = false;
  pauseBtn.textContent = "Pause";
  overlay.classList.add("hidden");
  updateScore();
  last = performance.now();
}

function loseLife() {
  lives--;
  updateScore();
  if (lives <= 0) gameOver();
  else spawnBalls();
}

function nextLevel() {
  level++;
  buildBricks();
  spawnBalls();
  updateScore();
}

function gameOver() {
  alive = false;
  saveIfBest();
  overMsg.textContent = `Score ${score} · Best ${getNumber(KEY, 0)}`;
  overlay.classList.remove("hidden");
}

function reflectOffPaddle(b) {
  const rel = Math.max(-0.8, Math.min(0.8, (b.x - paddleX) / (PADDLE_W / 2)));
  b.vx = b.spd * rel;
  b.vy = -Math.sqrt(Math.max(1, b.spd * b.spd - b.vx * b.vx));
  b.y = PADDLE_Y - BALL_R - 0.5;
}

// Re-point a ball's velocity to its current speed, keeping direction. Called
// after a speed bump so the magnitude tracks `spd` without changing aim.
function rescale(b) {
  const m = Math.hypot(b.vx, b.vy) || 1;
  b.vx = (b.vx / m) * b.spd;
  b.vy = (b.vy / m) * b.spd;
}

function hitBricks(b) {
  for (const brick of bricks) {
    if (!brick.alive) continue;
    const cx = brick.x + BRICK_W / 2;
    const cy = brick.y + BRICK_H / 2;
    const ox = BRICK_W / 2 + BALL_R - Math.abs(b.x - cx);
    const oy = BRICK_H / 2 + BALL_R - Math.abs(b.y - cy);
    if (ox > 0 && oy > 0) {
      brick.alive = false;
      score += brick.points;
      saveIfBest();
      updateScore();
      if (ox < oy) b.vx = b.x < cx ? -Math.abs(b.vx) : Math.abs(b.vx);
      else b.vy = b.y < cy ? -Math.abs(b.vy) : Math.abs(b.vy);
      // every brick this ball breaks nudges it faster, up to the cap.
      b.spd = Math.min(MAX_SPEED, b.spd + HIT_SPEEDUP);
      rescale(b);
      return true;
    }
  }
  return false;
}

// Advance one ball by fraction `f` of a frame. vx/vy hold the full per-frame
// velocity (magnitude ≈ spd); only the position step is fractional. Returns
// false once the ball is lost so the caller stops sub-stepping it.
function moveStep(b, f) {
  b.x += b.vx * f;
  b.y += b.vy * f;

  if (b.x < BALL_R) { b.x = BALL_R; b.vx = Math.abs(b.vx); }
  else if (b.x > W - BALL_R) { b.x = W - BALL_R; b.vx = -Math.abs(b.vx); }
  if (b.y < BALL_R) { b.y = BALL_R; b.vy = Math.abs(b.vy); }

  if (
    b.vy > 0 &&
    b.y + BALL_R >= PADDLE_Y &&
    b.y - BALL_R <= PADDLE_Y + PADDLE_H &&
    b.x >= paddleX - PADDLE_W / 2 - BALL_R &&
    b.x <= paddleX + PADDLE_W / 2 + BALL_R
  ) {
    reflectOffPaddle(b);
  }

  hitBricks(b);

  if (b.y - BALL_R > H) { b.dead = true; return false; }
  return true;
}

function update(dt) {
  // smooth keyboard paddle movement (held keys, continuous velocity).
  if (keyLeft) paddleX -= PADDLE_SPEED * dt;
  if (keyRight) paddleX += PADDLE_SPEED * dt;
  paddleX = Math.max(PADDLE_W / 2, Math.min(W - PADDLE_W / 2, paddleX));

  // glue any not-yet-launched balls to the paddle.
  for (const b of balls) {
    if (b.stuck) {
      b.x = Math.max(BALL_R, Math.min(W - BALL_R, paddleX + b.offset));
      b.y = PADDLE_Y - BALL_R - 1;
    }
  }

  // advance each live ball, sub-stepping so a fast ball can't tunnel through.
  for (const b of balls) {
    if (b.stuck || b.dead) continue;
    const sub = Math.max(1, Math.ceil((b.spd * dt) / 4));
    const f = dt / sub;
    for (let i = 0; i < sub; i++) {
      if (!moveStep(b, f)) break;
      if (!bricks.some((br) => br.alive)) break; // level cleared mid-step
    }
  }

  // drop fallen balls; losing the last ball in play costs a life.
  if (balls.some((b) => b.dead)) {
    balls = balls.filter((b) => !b.dead);
    if (balls.length === 0) { loseLife(); return; }
  }

  // clearing every brick advances the level.
  if (alive && !bricks.some((b) => b.alive)) nextLevel();
}

function draw() {
  ctx.fillStyle = cssVar("--panel");
  ctx.fillRect(0, 0, W, H);

  for (const b of bricks) {
    if (!b.alive) continue;
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, BRICK_W, BRICK_H);
  }

  ctx.fillStyle = cssVar("--accent2");
  ctx.fillRect(paddleX - PADDLE_W / 2, PADDLE_Y, PADDLE_W, PADDLE_H);

  ctx.fillStyle = cssVar("--text");
  for (const b of balls) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();
  }

  if (alive && balls.some((b) => b.stuck)) {
    ctx.fillStyle = cssVar("--muted");
    ctx.font = "14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Tap or Space to launch", W / 2, PADDLE_Y - 28);
  }
}

function loop(t) {
  let dt = (t - last) / 16.6667;
  last = t;
  if (!Number.isFinite(dt) || dt < 0) dt = 1;
  if (dt > 2.5) dt = 2.5;
  if (alive && !paused) update(dt);
  draw();
  requestAnimationFrame(loop);
}

// ---- input ----
function movePaddleTo(clientX) {
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left) * (W / rect.width);
  paddleX = Math.max(PADDLE_W / 2, Math.min(W - PADDLE_W / 2, x));
}

canvas.addEventListener(
  "pointerdown",
  (e) => {
    movePaddleTo(e.clientX);
    launch();
  },
  { passive: true }
);
canvas.addEventListener(
  "pointermove",
  (e) => {
    if (e.pressure > 0 || e.buttons > 0 || e.pointerType === "touch") movePaddleTo(e.clientX);
  },
  { passive: true }
);

window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
    keyLeft = true;
    e.preventDefault();
  } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
    keyRight = true;
    e.preventDefault();
  } else if (e.key === " ") {
    e.preventDefault();
    if (balls.some((b) => b.stuck)) launch();
    else togglePause();
  }
});

window.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keyLeft = false;
  else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keyRight = false;
});

function togglePause() {
  if (!alive) return;
  paused = !paused;
  pauseBtn.textContent = paused ? "Resume" : "Pause";
}

pauseBtn.addEventListener("click", togglePause);
document.getElementById("again").addEventListener("click", newGame);
document.getElementById("reset").addEventListener("click", () => {
  if (confirm("Clear Breakout high score?")) {
    remove(KEY);
    updateScore();
  }
});

newGame();
requestAnimationFrame(loop);
