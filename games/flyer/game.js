import { getNumber, setNumber, remove } from "../../js/storage.js";
import { cssVar } from "../../js/arcade-engine.js";

const KEY = "squinks.flyer.best";

// Fixed internal resolution; CSS scales the canvas down on small screens.
const W = 360, H = 560;
const GROUND_H = 44;
const GROUND_Y = H - GROUND_H;

const BIRD_X = 100, BIRD_R = 13;
const GRAVITY = 0.5; // px/frame² at 60fps
const FLAP = -7.6; // upward impulse on a flap
const MAX_FALL = 11; // terminal downward speed

const PIPE_W = 58;
const SPACING = 205; // horizontal gap between consecutive pipes
const GAP_START = 178, GAP_MIN = 120, GAP_SHRINK = 2.2; // gap narrows with score
const SPEED_START = 2.7, SPEED_MAX = 6.2, SPEED_GROW = 0.05; // scroll speeds up
const EDGE = 46; // keep gaps away from ceiling/ground

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
canvas.width = W;
canvas.height = H;

const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const overlay = document.getElementById("over");
const overMsg = document.getElementById("over-msg");
const pauseBtn = document.getElementById("pause");

let bird, pipes, clouds, score, state, paused, last, bob, flapAnim;

function speedFor() {
  return Math.min(SPEED_MAX, SPEED_START + score * SPEED_GROW);
}

function gapFor() {
  return Math.max(GAP_MIN, GAP_START - score * GAP_SHRINK);
}

function makePipe(x) {
  const gapH = gapFor();
  const lo = EDGE + gapH / 2;
  const hi = GROUND_Y - EDGE - gapH / 2;
  const gap = lo + Math.random() * Math.max(0, hi - lo);
  return { x, gap, gapH, scored: false };
}

function makeClouds() {
  clouds = [];
  for (let i = 0; i < 4; i++) {
    clouds.push({ x: Math.random() * W, y: 40 + Math.random() * (GROUND_Y - 120), r: 16 + Math.random() * 22, s: 0.3 + Math.random() * 0.4 });
  }
}

function newGame() {
  score = 0; // must precede makePipe — gap size/speed read `score`
  bird = { y: H * 0.42, vy: 0, angle: 0 };
  pipes = [makePipe(W + 80), makePipe(W + 80 + SPACING)];
  makeClouds();
  state = "ready"; // ready -> playing -> dead
  paused = false;
  bob = 0;
  flapAnim = 0;
  pauseBtn.textContent = "Pause";
  overlay.classList.add("hidden");
  updateScore();
  last = performance.now();
}

function updateScore() {
  scoreEl.textContent = score;
  bestEl.textContent = getNumber(KEY, 0);
}

function saveIfBest() {
  if (score > getNumber(KEY, 0)) setNumber(KEY, score);
}

function flap() {
  if (paused) return;
  if (state === "ready") state = "playing";
  if (state !== "playing") return;
  bird.vy = FLAP;
  flapAnim = 8;
}

function die() {
  state = "dead";
  saveIfBest();
  overMsg.textContent = `Score ${score} · Best ${getNumber(KEY, 0)}`;
  overlay.classList.remove("hidden");
}

function update(dt) {
  if (dt > 2) dt = 2; // never let a stall produce a tunneling step
  bob += dt;
  if (flapAnim > 0) flapAnim -= dt;

  // drifting background clouds (independent of pause-on-death)
  for (const c of clouds) {
    c.x -= c.s * dt;
    if (c.x + c.r < 0) { c.x = W + c.r; c.y = 40 + Math.random() * (GROUND_Y - 120); }
  }

  if (state === "ready") {
    bird.y = H * 0.42 + Math.sin(bob * 0.12) * 8; // gentle idle bob
    bird.angle = 0;
    return;
  }
  if (state !== "playing") return;

  // bird physics
  bird.vy = Math.min(MAX_FALL, bird.vy + GRAVITY * dt);
  bird.y += bird.vy * dt;
  bird.angle = Math.max(-0.5, Math.min(1.4, bird.vy / 16));

  if (bird.y < BIRD_R) { bird.y = BIRD_R; if (bird.vy < 0) bird.vy = 0; }

  const speed = speedFor();

  // move pipes, score, recycle
  for (const p of pipes) {
    p.x -= speed * dt;
    if (!p.scored && p.x + PIPE_W < BIRD_X) {
      p.scored = true;
      score++;
      saveIfBest();
      updateScore();
    }
  }
  if (pipes.length && pipes[0].x + PIPE_W < -10) pipes.shift();
  const lastPipe = pipes[pipes.length - 1];
  if (lastPipe.x <= W - SPACING) pipes.push(makePipe(lastPipe.x + SPACING));

  // collisions
  if (bird.y + BIRD_R >= GROUND_Y) { bird.y = GROUND_Y - BIRD_R; return die(); }
  for (const p of pipes) {
    const overX = BIRD_X + BIRD_R > p.x && BIRD_X - BIRD_R < p.x + PIPE_W;
    if (!overX) continue;
    const gapTop = p.gap - p.gapH / 2;
    const gapBot = p.gap + p.gapH / 2;
    if (bird.y - BIRD_R < gapTop || bird.y + BIRD_R > gapBot) return die();
  }
}

function drawBird() {
  ctx.save();
  ctx.translate(BIRD_X, bird.y);
  ctx.rotate(bird.angle);
  // body
  ctx.fillStyle = cssVar("--accent");
  ctx.beginPath();
  ctx.arc(0, 0, BIRD_R, 0, Math.PI * 2);
  ctx.fill();
  // wing (flips up briefly after a flap)
  ctx.fillStyle = cssVar("--accent2");
  ctx.beginPath();
  const wy = flapAnim > 0 ? -5 : 4;
  ctx.ellipse(-3, wy, 7, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // beak
  ctx.fillStyle = cssVar("--warning", "#ffd23f");
  ctx.beginPath();
  ctx.moveTo(BIRD_R - 2, -2);
  ctx.lineTo(BIRD_R + 7, 1);
  ctx.lineTo(BIRD_R - 2, 4);
  ctx.closePath();
  ctx.fill();
  // eye
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(5, -5, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(6, -5, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function draw() {
  ctx.fillStyle = cssVar("--panel");
  ctx.fillRect(0, 0, W, H);

  // clouds
  ctx.fillStyle = cssVar("--border", "rgba(255,255,255,0.08)");
  ctx.globalAlpha = 0.5;
  for (const c of clouds) {
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // pipes
  const pipeCol = cssVar("--accent2");
  for (const p of pipes) {
    const gapTop = p.gap - p.gapH / 2;
    const gapBot = p.gap + p.gapH / 2;
    ctx.fillStyle = pipeCol;
    ctx.fillRect(p.x, 0, PIPE_W, gapTop);
    ctx.fillRect(p.x, gapBot, PIPE_W, GROUND_Y - gapBot);
    // lip accents
    ctx.fillStyle = cssVar("--accent");
    ctx.fillRect(p.x - 3, gapTop - 10, PIPE_W + 6, 10);
    ctx.fillRect(p.x - 3, gapBot, PIPE_W + 6, 10);
  }

  // ground
  ctx.fillStyle = cssVar("--accent2");
  ctx.fillRect(0, GROUND_Y, W, GROUND_H);
  ctx.fillStyle = cssVar("--bg2", "#0b0e17");
  ctx.globalAlpha = 0.3;
  ctx.fillRect(0, GROUND_Y, W, 6);
  ctx.globalAlpha = 1;

  drawBird();

  // score (big, centered near top while playing)
  if (state !== "dead") {
    ctx.fillStyle = cssVar("--text");
    ctx.font = "700 40px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(score), W / 2, 74);
  }

  if (state === "ready") {
    ctx.fillStyle = cssVar("--muted");
    ctx.font = "16px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Tap / Space to flap", W / 2, H * 0.6);
  }

  if (paused && state === "playing") {
    ctx.fillStyle = cssVar("--muted");
    ctx.font = "20px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Paused", W / 2, H / 2);
  }
}

function loop(t) {
  let dt = (t - last) / 16.6667;
  last = t;
  if (!Number.isFinite(dt) || dt < 0) dt = 1;
  if (dt > 2.5) dt = 2.5;
  if (!paused && state !== "dead") update(dt);
  draw();
  requestAnimationFrame(loop);
}

// ---- input ----
canvas.addEventListener(
  "pointerdown",
  (e) => {
    e.preventDefault();
    flap();
  },
  { passive: false }
);

window.addEventListener("keydown", (e) => {
  if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
    e.preventDefault();
    flap();
  }
});

function togglePause() {
  if (state === "dead") return;
  paused = !paused;
  pauseBtn.textContent = paused ? "Resume" : "Pause";
}

pauseBtn.addEventListener("click", togglePause);
document.getElementById("again").addEventListener("click", newGame);
document.getElementById("reset").addEventListener("click", () => {
  if (confirm("Clear Squink Flyer high score?")) {
    remove(KEY);
    updateScore();
  }
});

newGame();
requestAnimationFrame(loop);
