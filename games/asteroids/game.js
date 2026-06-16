import { getNumber, setNumber, remove } from "../../js/storage.js";
import { cssVar, makeLives, awardBonus, renderLives } from "../../js/arcade-engine.js";

const KEY = "squinks.asteroids.best";

const SIZE = 400;
const SHIP_R = 11;
const ROT = 0.075;
const ACCEL = 0.16;
const FRICTION = 0.99;
const MAX_V = 6;
const BULLET_SPEED = 6.5;
const BULLET_LIFE = 55;
const FIRE_CD = 11;
const INVULN = 120;

const KINDS = {
  large: { r: 34, pts: 20, next: "med", speed: 0.7 },
  med: { r: 20, pts: 50, next: "small", speed: 1.1 },
  small: { r: 11, pts: 100, next: null, speed: 1.6 },
};

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
canvas.width = SIZE;
canvas.height = SIZE;

const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const waveEl = document.getElementById("wave");
const bestEl = document.getElementById("best");
const overlay = document.getElementById("over");
const overMsg = document.getElementById("over-msg");
const pauseBtn = document.getElementById("pause");

let ship, bullets, rocks, score, wave, lives, alive, paused, invuln, fireCd, last;
const input = { left: false, right: false, thrust: false, firing: false };

function wrap(o) {
  if (o.x < 0) o.x += SIZE;
  else if (o.x >= SIZE) o.x -= SIZE;
  if (o.y < 0) o.y += SIZE;
  else if (o.y >= SIZE) o.y -= SIZE;
}

function makeShape() {
  const n = 9;
  const offs = [];
  for (let i = 0; i < n; i++) offs.push(0.72 + Math.random() * 0.45);
  return offs;
}

function makeRock(x, y, kind) {
  const k = KINDS[kind];
  const ang = Math.random() * Math.PI * 2;
  const sp = k.speed * (1 + 0.05 * (wave - 1)) * (0.7 + Math.random() * 0.6);
  return {
    x,
    y,
    vx: Math.cos(ang) * sp,
    vy: Math.sin(ang) * sp,
    r: k.r,
    kind,
    shape: makeShape(),
    spin: (Math.random() - 0.5) * 0.05,
    rot: 0,
  };
}

function spawnWave() {
  const n = Math.min(9, 3 + wave);
  rocks = [];
  for (let i = 0; i < n; i++) {
    let x, y, tries = 0;
    do {
      x = Math.random() * SIZE;
      y = Math.random() * SIZE;
      tries++;
    } while (Math.hypot(x - SIZE / 2, y - SIZE / 2) < 120 && tries < 30);
    rocks.push(makeRock(x, y, "large"));
  }
}

function resetShip() {
  ship = { x: SIZE / 2, y: SIZE / 2, vx: 0, vy: 0, angle: 0 };
}

function updateScore() {
  scoreEl.textContent = score;
  bestEl.textContent = getNumber(KEY, 0);
  waveEl.textContent = wave;
  renderLives(livesEl, lives.count);
}

function saveIfBest() {
  if (score > getNumber(KEY, 0)) setNumber(KEY, score);
}

function addScore(pts) {
  score += pts;
  awardBonus(lives, score);
  saveIfBest();
  updateScore();
}

function newGame() {
  score = 0;
  wave = 1;
  lives = makeLives(3);
  bullets = [];
  resetShip();
  spawnWave();
  invuln = INVULN;
  fireCd = 0;
  input.left = input.right = input.thrust = input.firing = false;
  alive = true;
  paused = false;
  pauseBtn.textContent = "Pause";
  overlay.classList.add("hidden");
  updateScore();
  last = performance.now();
}

function heading() {
  return { x: Math.sin(ship.angle), y: -Math.cos(ship.angle) };
}

function shoot() {
  const h = heading();
  bullets.push({
    x: ship.x + h.x * SHIP_R * 1.3,
    y: ship.y + h.y * SHIP_R * 1.3,
    vx: h.x * BULLET_SPEED,
    vy: h.y * BULLET_SPEED,
    life: BULLET_LIFE,
  });
  fireCd = FIRE_CD;
}

function splitRock(rock) {
  const next = KINDS[rock.kind].next;
  if (next) {
    rocks.push(makeRock(rock.x, rock.y, next));
    rocks.push(makeRock(rock.x, rock.y, next));
  }
}

function loseLife() {
  lives.count--;
  updateScore();
  if (lives.count <= 0) {
    gameOver();
  } else {
    resetShip();
    bullets = [];
    invuln = INVULN;
  }
}

function gameOver() {
  alive = false;
  saveIfBest();
  overMsg.textContent = `Score ${score} · Wave ${wave} · Best ${getNumber(KEY, 0)}`;
  overlay.classList.remove("hidden");
}

function update(dt) {
  if (input.left) ship.angle -= ROT * dt;
  if (input.right) ship.angle += ROT * dt;
  if (input.thrust) {
    const h = heading();
    ship.vx += h.x * ACCEL * dt;
    ship.vy += h.y * ACCEL * dt;
    const sp = Math.hypot(ship.vx, ship.vy);
    if (sp > MAX_V) {
      ship.vx = (ship.vx / sp) * MAX_V;
      ship.vy = (ship.vy / sp) * MAX_V;
    }
  }
  ship.vx *= Math.pow(FRICTION, dt);
  ship.vy *= Math.pow(FRICTION, dt);
  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;
  wrap(ship);

  fireCd -= dt;
  if (input.firing && fireCd <= 0) shoot();
  if (invuln > 0) invuln -= dt;

  for (const b of bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    wrap(b);
  }
  bullets = bullets.filter((b) => b.life > 0);

  for (const r of rocks) {
    r.x += r.vx * dt;
    r.y += r.vy * dt;
    r.rot += r.spin * dt;
    wrap(r);
  }

  // bullet vs rock
  for (let i = rocks.length - 1; i >= 0; i--) {
    const r = rocks[i];
    for (let j = bullets.length - 1; j >= 0; j--) {
      const b = bullets[j];
      if (Math.hypot(b.x - r.x, b.y - r.y) < r.r) {
        bullets.splice(j, 1);
        rocks.splice(i, 1);
        addScore(KINDS[r.kind].pts);
        splitRock(r);
        break;
      }
    }
  }

  // ship vs rock
  if (invuln <= 0 && alive) {
    for (const r of rocks) {
      if (Math.hypot(ship.x - r.x, ship.y - r.y) < r.r + SHIP_R) {
        loseLife();
        break;
      }
    }
  }

  if (alive && rocks.length === 0) {
    wave++;
    spawnWave();
    invuln = Math.max(invuln, 60);
    updateScore();
  }
}

function draw() {
  ctx.fillStyle = cssVar("--panel");
  ctx.fillRect(0, 0, SIZE, SIZE);

  // rocks
  ctx.strokeStyle = cssVar("--muted");
  ctx.lineWidth = 1.6;
  for (const r of rocks) {
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(r.rot);
    ctx.beginPath();
    for (let i = 0; i < r.shape.length; i++) {
      const a = (i / r.shape.length) * Math.PI * 2;
      const rad = r.r * r.shape[i];
      const px = Math.cos(a) * rad;
      const py = Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  // bullets
  ctx.fillStyle = cssVar("--accent");
  for (const b of bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // ship (blink while invulnerable)
  if (alive && (invuln <= 0 || Math.floor(invuln / 6) % 2 === 0)) {
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);
    ctx.strokeStyle = cssVar("--accent2");
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -SHIP_R * 1.4);
    ctx.lineTo(SHIP_R, SHIP_R);
    ctx.lineTo(0, SHIP_R * 0.5);
    ctx.lineTo(-SHIP_R, SHIP_R);
    ctx.closePath();
    ctx.stroke();
    if (input.thrust) {
      ctx.strokeStyle = cssVar("--accent");
      ctx.beginPath();
      ctx.moveTo(-SHIP_R * 0.5, SHIP_R * 0.7);
      ctx.lineTo(0, SHIP_R * 1.6);
      ctx.lineTo(SHIP_R * 0.5, SHIP_R * 0.7);
      ctx.stroke();
    }
    ctx.restore();
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
function bindHold(el, key) {
  el.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    input[key] = true;
  });
  const up = () => (input[key] = false);
  el.addEventListener("pointerup", up);
  el.addEventListener("pointerleave", up);
  el.addEventListener("pointercancel", up);
}
bindHold(document.getElementById("rotL"), "left");
bindHold(document.getElementById("rotR"), "right");
bindHold(document.getElementById("thrust"), "thrust");
bindHold(document.getElementById("fire"), "firing");

const KEYMAP = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "thrust", a: "left", d: "right", w: "thrust" };
window.addEventListener("keydown", (e) => {
  if (e.key === " ") { input.firing = true; e.preventDefault(); return; }
  const k = KEYMAP[e.key];
  if (k) { input[k] = true; e.preventDefault(); }
});
window.addEventListener("keyup", (e) => {
  if (e.key === " ") { input.firing = false; return; }
  const k = KEYMAP[e.key];
  if (k) input[k] = false;
});

function togglePause() {
  if (!alive) return;
  paused = !paused;
  pauseBtn.textContent = paused ? "Resume" : "Pause";
}

pauseBtn.addEventListener("click", togglePause);
document.getElementById("again").addEventListener("click", newGame);
document.getElementById("reset").addEventListener("click", () => {
  if (confirm("Clear Asteroids high score?")) {
    remove(KEY);
    updateScore();
  }
});

newGame();
requestAnimationFrame(loop);
