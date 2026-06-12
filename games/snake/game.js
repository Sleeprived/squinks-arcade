import { getNumber, setNumber, remove } from "../../js/storage.js";

const KEY = "squinks.snake.best";
const N = 17; // cells per side

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const overlay = document.getElementById("over");
const overMsg = document.getElementById("over-msg");

const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

let cell = 20;
let snake, dir, nextDir, food, score, alive, acc, last, speed;

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#fff";
}

function fit() {
  const maxW = window.innerWidth - 32;
  const maxH = window.innerHeight - 280;
  const size = Math.max(180, Math.min(maxW, maxH, 440));
  cell = Math.max(8, Math.floor(size / N));
  canvas.width = canvas.height = cell * N;
  draw();
}

function rand(n) {
  return Math.floor(Math.random() * n);
}

function placeFood() {
  while (true) {
    const f = { x: rand(N), y: rand(N) };
    if (!snake.some((s) => s.x === f.x && s.y === f.y)) {
      food = f;
      return;
    }
  }
}

function updateScore() {
  scoreEl.textContent = score;
  bestEl.textContent = getNumber(KEY, 0);
}

function saveIfBest() {
  if (score > getNumber(KEY, 0)) setNumber(KEY, score);
}

function reset() {
  snake = [
    { x: 8, y: 8 },
    { x: 7, y: 8 },
    { x: 6, y: 8 },
  ];
  dir = DIRS.right;
  nextDir = dir;
  score = 0;
  alive = true;
  speed = 110;
  placeFood();
  acc = 0;
  last = performance.now();
  overlay.classList.add("hidden");
  updateScore();
}

function setDir(d) {
  if (!alive) return;
  if (d.x === -dir.x && d.y === -dir.y) return; // no instant reverse
  nextDir = d;
}

function step() {
  dir = nextDir;
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
  if (
    head.x < 0 ||
    head.y < 0 ||
    head.x >= N ||
    head.y >= N ||
    snake.some((s) => s.x === head.x && s.y === head.y)
  ) {
    gameOver();
    return;
  }
  snake.unshift(head);
  if (head.x === food.x && head.y === food.y) {
    score += 10;
    saveIfBest();
    speed = Math.max(60, 110 - Math.floor(score / 50) * 6);
    placeFood();
  } else {
    snake.pop();
  }
  updateScore();
}

function gameOver() {
  alive = false;
  saveIfBest();
  overMsg.textContent = `Score ${score} · Best ${getNumber(KEY, 0)}`;
  overlay.classList.remove("hidden");
}

function draw() {
  ctx.fillStyle = cssVar("--panel");
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!food) return;

  ctx.fillStyle = cssVar("--accent");
  ctx.fillRect(food.x * cell + 2, food.y * cell + 2, cell - 4, cell - 4);

  ctx.fillStyle = cssVar("--accent2");
  for (let i = 0; i < snake.length; i++) {
    const s = snake[i];
    ctx.fillRect(s.x * cell + 1, s.y * cell + 1, cell - 2, cell - 2);
  }
}

function loop(t) {
  if (alive) {
    acc += t - last;
    last = t;
    while (acc >= speed) {
      step();
      acc -= speed;
      if (!alive) break;
    }
    draw();
  } else {
    last = t;
  }
  requestAnimationFrame(loop);
}

// Input: swipe
let tsx = 0,
  tsy = 0;
canvas.addEventListener(
  "touchstart",
  (e) => {
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
    if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? DIRS.right : DIRS.left);
    else setDir(dy > 0 ? DIRS.down : DIRS.up);
  },
  { passive: true }
);

// Input: d-pad
document.querySelectorAll(".dpad .btn").forEach((b) => {
  b.addEventListener("click", () => setDir(DIRS[b.dataset.dir]));
});

// Input: keyboard
const KEYMAP = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
};
window.addEventListener("keydown", (e) => {
  const k = KEYMAP[e.key];
  if (k) {
    e.preventDefault();
    setDir(DIRS[k]);
  }
});

document.getElementById("again").addEventListener("click", reset);
document.getElementById("reset").addEventListener("click", () => {
  if (confirm("Clear Snake high score?")) {
    remove(KEY);
    updateScore();
  }
});

window.addEventListener("resize", fit);

reset();
fit();
requestAnimationFrame(loop);
