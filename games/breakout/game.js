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
const BASE_SPEED = 4.2, MAX_SPEED = 7.6;

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

let paddleX, ball, bricks, score, lives, level, speed, alive, paused, stuck, last;

function speedFor(lvl) {
  return Math.min(MAX_SPEED, BASE_SPEED + (lvl - 1) * 0.6);
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

function resetBall() {
  stuck = true;
  ball = { x: paddleX, y: PADDLE_Y - BALL_R - 1, vx: 0, vy: 0 };
}

function launch() {
  if (!stuck || !alive || paused) return;
  stuck = false;
  const dir = Math.random() < 0.5 ? -1 : 1;
  ball.vx = speed * 0.45 * dir;
  ball.vy = -Math.sqrt(speed * speed - ball.vx * ball.vx);
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
  speed = speedFor(level);
  buildBricks();
  resetBall();
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
  if (lives <= 0) {
    gameOver();
  } else {
    resetBall();
  }
}

function nextLevel() {
  level++;
  speed = speedFor(level);
  buildBricks();
  resetBall();
  updateScore();
}

function gameOver() {
  alive = false;
  saveIfBest();
  overMsg.textContent = `Score ${score} · Best ${getNumber(KEY, 0)}`;
  overlay.classList.remove("hidden");
}

function reflectOffPaddle() {
  const rel = Math.max(-0.8, Math.min(0.8, (ball.x - paddleX) / (PADDLE_W / 2)));
  ball.vx = speed * rel;
  ball.vy = -Math.sqrt(Math.max(1, speed * speed - ball.vx * ball.vx));
  ball.y = PADDLE_Y - BALL_R - 0.5;
}

function hitBricks() {
  for (const b of bricks) {
    if (!b.alive) continue;
    const cx = b.x + BRICK_W / 2;
    const cy = b.y + BRICK_H / 2;
    const ox = BRICK_W / 2 + BALL_R - Math.abs(ball.x - cx);
    const oy = BRICK_H / 2 + BALL_R - Math.abs(ball.y - cy);
    if (ox > 0 && oy > 0) {
      b.alive = false;
      score += b.points;
      saveIfBest();
      updateScore();
      if (ox < oy) ball.vx = ball.x < cx ? -Math.abs(ball.vx) : Math.abs(ball.vx);
      else ball.vy = ball.y < cy ? -Math.abs(ball.vy) : Math.abs(ball.vy);
      return true;
    }
  }
  return false;
}

// Advance the ball by fraction `f` of a frame. ball.vx/vy always hold the FULL
// per-frame velocity (magnitude ≈ speed); only the position step is fractional.
// Every collision response flips a sign or re-aims at full speed, so the
// magnitude is preserved without any rescaling. Returns false if the ball was
// lost or the level cleared (the caller should stop sub-stepping).
function moveStep(f) {
  ball.x += ball.vx * f;
  ball.y += ball.vy * f;

  if (ball.x < BALL_R) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx); }
  else if (ball.x > W - BALL_R) { ball.x = W - BALL_R; ball.vx = -Math.abs(ball.vx); }
  if (ball.y < BALL_R) { ball.y = BALL_R; ball.vy = Math.abs(ball.vy); }

  if (
    ball.vy > 0 &&
    ball.y + BALL_R >= PADDLE_Y &&
    ball.y - BALL_R <= PADDLE_Y + PADDLE_H &&
    ball.x >= paddleX - PADDLE_W / 2 - BALL_R &&
    ball.x <= paddleX + PADDLE_W / 2 + BALL_R
  ) {
    reflectOffPaddle();
  }

  hitBricks();

  if (ball.y - BALL_R > H) {
    loseLife();
    return false;
  }
  if (!bricks.some((b) => b.alive)) {
    nextLevel();
    return false;
  }
  return true;
}

function update(dt) {
  if (stuck) {
    ball.x = paddleX;
    ball.y = PADDLE_Y - BALL_R - 1;
    return;
  }
  // Sub-step so a fast ball can never tunnel through a brick or the paddle.
  const sub = Math.max(1, Math.ceil((speed * dt) / 4));
  const f = dt / sub;
  for (let i = 0; i < sub; i++) {
    if (!alive || stuck) break;
    if (!moveStep(f)) break;
  }
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

  ctx.beginPath();
  ctx.fillStyle = cssVar("--text");
  ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
  ctx.fill();

  if (stuck && alive) {
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
    if (stuck) launch();
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
    paddleX = Math.max(PADDLE_W / 2, paddleX - 26);
    e.preventDefault();
  } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
    paddleX = Math.min(W - PADDLE_W / 2, paddleX + 26);
    e.preventDefault();
  } else if (e.key === " ") {
    e.preventDefault();
    if (stuck) launch();
    else togglePause();
  }
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
