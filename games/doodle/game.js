import { getNumber, setNumber, remove } from "../../js/storage.js";

const KEY = "squinks.doodle.best";

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const overlay = document.getElementById("over");
const overMsg = document.getElementById("over-msg");

const GRAV = 0.42;
const JUMP = -13.5;
const MOVE = 5;
const PW = 62; // platform width
const PH = 13; // platform height
const SIZE = 26; // player size

let W = 380, H = 560;
let player, platforms, climb, dir, alive, last;

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#fff";
}

function fit() {
  W = Math.max(260, Math.min(window.innerWidth - 24, 380));
  H = Math.max(360, Math.min(window.innerHeight - 200, 620));
  canvas.width = W;
  canvas.height = H;
}

function topPlatformY() {
  return platforms.reduce((m, p) => Math.min(m, p.y), H);
}

function addPlatformsUp() {
  while (topPlatformY() > 0) {
    const y = topPlatformY() - (60 + Math.random() * 55);
    platforms.push({ x: Math.random() * (W - PW), y });
  }
}

function newGame() {
  fit();
  player = { x: W / 2 - SIZE / 2, y: H - 120, vx: 0, vy: JUMP };
  platforms = [{ x: W / 2 - PW / 2, y: H - 80 }];
  let y = H - 80;
  while (y > 0) {
    y -= 60 + Math.random() * 55;
    platforms.push({ x: Math.random() * (W - PW), y });
  }
  climb = 0;
  dir = 0;
  alive = true;
  last = performance.now();
  overlay.classList.add("hidden");
  updateHud();
}

function updateHud() {
  scoreEl.textContent = Math.floor(climb / 10);
  bestEl.textContent = getNumber(KEY, 0);
}

function saveBest() {
  const h = Math.floor(climb / 10);
  if (h > getNumber(KEY, 0)) setNumber(KEY, h);
}

function step() {
  if (!alive) return;
  // horizontal
  if (dir !== 0) player.vx = dir * MOVE;
  else player.vx *= 0.8;
  player.x += player.vx;
  if (player.x < -SIZE) player.x = W;
  if (player.x > W) player.x = -SIZE;

  // vertical
  const prevBottom = player.y + SIZE;
  player.vy += GRAV;
  player.y += player.vy;

  if (player.vy > 0) {
    for (const p of platforms) {
      const newBottom = player.y + SIZE;
      if (
        player.x + SIZE > p.x &&
        player.x < p.x + PW &&
        prevBottom <= p.y &&
        newBottom >= p.y
      ) {
        player.vy = JUMP;
        break;
      }
    }
  }

  // scroll world down when rising past 40% line
  const line = H * 0.4;
  if (player.y < line) {
    const d = line - player.y;
    player.y = line;
    climb += d;
    for (const p of platforms) p.y += d;
    platforms = platforms.filter((p) => p.y < H + 20);
    addPlatformsUp();
    saveBest();
    updateHud();
  }

  // fall off bottom
  if (player.y > H) gameOver();
}

function gameOver() {
  alive = false;
  saveBest();
  overMsg.textContent = `Height ${Math.floor(climb / 10)} · Best ${getNumber(KEY, 0)}`;
  overlay.classList.remove("hidden");
}

function draw() {
  ctx.fillStyle = cssVar("--panel");
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = cssVar("--accent2");
  for (const p of platforms) {
    ctx.fillRect(p.x, p.y, PW, PH);
  }
  ctx.fillStyle = cssVar("--accent");
  ctx.fillRect(player.x, player.y, SIZE, SIZE);
}

function loop(t) {
  let dt = t - last;
  last = t;
  dt = Math.min(dt, 48); // clamp after tab switch
  if (alive) {
    // fixed ~60fps stepping
    let acc = dt;
    while (acc > 0) {
      step();
      acc -= 16.7;
      if (!alive) break;
    }
  }
  draw();
  requestAnimationFrame(loop);
}

function sideOf(clientX) {
  const r = canvas.getBoundingClientRect();
  return clientX - r.left < r.width / 2 ? -1 : 1;
}

canvas.addEventListener("pointerdown", (e) => {
  if (!alive) return;
  dir = sideOf(e.clientX);
});
canvas.addEventListener("pointerup", () => { dir = 0; });
canvas.addEventListener("pointerleave", () => { dir = 0; });
canvas.addEventListener("pointercancel", () => { dir = 0; });

document.getElementById("again").addEventListener("click", newGame);
document.getElementById("reset").addEventListener("click", () => {
  if (confirm("Clear Doodle Jump best height?")) { remove(KEY); updateHud(); }
});
// Only refit between runs; refitting mid-run would shift absolute positions and
// could abruptly end an active game (e.g. mobile address-bar collapse).
window.addEventListener("resize", () => { if (!alive) fit(); });

newGame();
requestAnimationFrame(loop);
