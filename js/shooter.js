/* Shared fixed-screen formation-shooter engine, reused by Star Divers and Twin
   Talon. One class, two signature mechanics selected by options:

     Star Divers (capture:false) — enemies hold a grid, peel off and dive at the
       player. No capture, no boss. The baseline.
     Twin Talon (capture:true)  — a captor enemy can tractor-beam the ship.
       Capture costs a life immediately (Galaga-style); if it was the last life
       the game ends with no rescue. Otherwise the ship respawns; destroying the
       captor that still carries the captive frees it into a DUAL fighter (two
       ships, doubled fire). A death while dual costs one life and reverts to a
       single ship.

   Controls: drag anywhere in the lower screen to slide horizontally (touch) or
   Arrow/A,D keys (desktop); the ship auto-fires continuously on both. Space is
   confirm / pause only — never a fire key.

   Endless: clearing a formation advances the wave; dive frequency, sway speed
   and formation density escalate forever. Lives/bonus-life model is shared
   (see arcade-engine.js). Art is geometric, drawn from theme CSS vars. */

import {
  cssVar,
  fitPortrait,
  makeLives,
  awardBonus,
  renderLives,
  overlaps,
} from "./arcade-engine.js";
import { getNumber, setNumber, remove } from "./storage.js";

export class ShooterEngine {
  constructor(opts) {
    this.canvas = opts.canvas;
    this.ctx = this.canvas.getContext("2d");
    this.key = opts.key;
    this.capture = !!opts.capture;
    this.el = opts.el; // { score, best, lives, wave, over, overMsg, again }

    this.W = 0;
    this.H = 0;
    this.paused = false;
    this.last = 0;

    this._bind();
    this.fit();
    this.reset();
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  fit() {
    const { w, h } = fitPortrait(this.canvas);
    this.W = w;
    this.H = h;
    this.unit = w / 14; // base sprite unit
  }

  reset() {
    this.score = 0;
    this.lives = makeLives(3);
    this.wave = 0;
    this.over = false;
    this.paused = false;
    this.bullets = [];
    this.enemyBullets = [];
    this.particles = [];
    this.dual = false;
    this.invuln = 0;
    this.fireTimer = 0;
    this.captive = null; // { enemy } when an enemy is carrying the captured ship
    this.respawnTimer = 0; // >0 while waiting to respawn after capture

    const pw = this.unit * 1.4;
    this.player = {
      x: this.W / 2 - pw / 2,
      w: pw,
      h: this.unit * 1.2,
      alive: true,
      target: this.W / 2,
      kbDir: 0,
    };
    this._spawnWave();
    this.el.over.classList.add("hidden");
    this._syncHud();
    this.last = performance.now();
  }

  _spawnWave() {
    this.wave++;
    const cols = Math.min(8, 5 + Math.floor(this.wave / 2));
    const rows = Math.min(5, 3 + Math.floor((this.wave - 1) / 2));
    const gap = this.unit * 1.4;
    const ew = this.unit;
    const formW = (cols - 1) * gap;
    const originX = (this.W - formW) / 2;
    const originY = this.unit * 1.4;

    this.cols = cols;
    this.enemies = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // The top row carries captors (Twin Talon only); others are divers.
        const captor = this.capture && r === 0;
        this.enemies.push({
          col: c,
          row: r,
          homeX: originX + c * gap,
          homeY: originY + r * gap,
          x: originX + c * gap,
          y: originY + r * gap,
          w: ew,
          h: ew,
          state: "formation",
          captor,
          t: 0,
          diveX: 0,
          carrying: false,
        });
      }
    }
    this.sway = 0;
    this.swayDir = 1;
    this.swaySpeed = 0.6 + this.wave * 0.12; // px-fraction per frame, escalates
    this.diveChance = Math.min(0.03, 0.006 + this.wave * 0.002);
    this.diveSpeed = this.unit * (0.05 + this.wave * 0.008);
  }

  // ---- input -------------------------------------------------------------
  _bind() {
    const toCanvasX = (clientX) => {
      const r = this.canvas.getBoundingClientRect();
      return ((clientX - r.left) / r.width) * this.W;
    };
    let dragging = false;
    const startDrag = (clientX, clientY) => {
      const r = this.canvas.getBoundingClientRect();
      // Only grab drags that begin in the lower half of the play area.
      if (clientY - r.top < r.height * 0.35) return;
      dragging = true;
      this.player.target = toCanvasX(clientX);
    };
    this.canvas.addEventListener(
      "pointerdown",
      (e) => {
        if (this.paused) {
          this.togglePause();
          return;
        }
        startDrag(e.clientX, e.clientY);
      },
      { passive: true }
    );
    this.canvas.addEventListener(
      "pointermove",
      (e) => {
        if (dragging) this.player.target = toCanvasX(e.clientX);
      },
      { passive: true }
    );
    const endDrag = () => {
      dragging = false;
    };
    window.addEventListener("pointerup", endDrag, { passive: true });
    window.addEventListener("pointercancel", endDrag, { passive: true });

    window.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        this.player.kbDir = -1;
        e.preventDefault();
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        this.player.kbDir = 1;
        e.preventDefault();
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (this.over) this.reset();
        else this.togglePause();
      } else if (e.key === "p" || e.key === "P") {
        this.togglePause();
      }
    });
    window.addEventListener("keyup", (e) => {
      if (["ArrowLeft", "ArrowRight", "a", "A", "d", "D"].includes(e.key)) {
        this.player.kbDir = 0;
      }
    });
    window.addEventListener("resize", () => this.fit());
  }

  togglePause() {
    if (this.over) return;
    this.paused = !this.paused;
    this._syncHud();
    this.last = performance.now();
  }

  // ---- HUD ---------------------------------------------------------------
  _syncHud() {
    this.el.score.textContent = this.score;
    this.el.best.textContent = getNumber(this.key, 0);
    renderLives(this.el.lives, this.lives.count);
    if (this.el.wave) this.el.wave.textContent = this.wave;
  }

  _saveBest() {
    if (this.score > getNumber(this.key, 0)) setNumber(this.key, this.score);
  }

  // ---- simulation --------------------------------------------------------
  _update(dt) {
    const p = this.player;

    // player movement: drag target + keyboard velocity
    if (p.kbDir !== 0) p.target += p.kbDir * this.unit * 0.5 * dt;
    p.target = Math.max(p.w / 2, Math.min(this.W - p.w / 2, p.target));
    if (p.alive) {
      const cx = p.x + p.w / 2;
      p.x += (p.target - cx) * Math.min(1, dt * 0.5);
      p.x = Math.max(0, Math.min(this.W - p.w, p.x));
    }
    const py = this.H - p.h - 8;

    if (this.invuln > 0) this.invuln -= dt;
    if (this.respawnTimer > 0) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0 && this.lives.count > 0) {
        p.alive = true;
        this.invuln = 70;
      }
    }

    // auto-fire (~8 shots/sec: one shot every 8 frames)
    this.fireTimer -= dt;
    if (p.alive && this.fireTimer <= 0) {
      this.fireTimer = 8;
      const by = py;
      const bw = this.unit * 0.16;
      if (this.dual) {
        this.bullets.push({ x: p.x + p.w * 0.2, y: by, w: bw, h: this.unit * 0.5 });
        this.bullets.push({ x: p.x + p.w * 0.8 - bw, y: by, w: bw, h: this.unit * 0.5 });
      } else {
        this.bullets.push({ x: p.x + p.w / 2 - bw / 2, y: by, w: bw, h: this.unit * 0.5 });
      }
    }
    for (const b of this.bullets) b.y -= this.unit * 0.7 * dt;
    this.bullets = this.bullets.filter((b) => b.y + b.h > 0);
    for (const b of this.enemyBullets) b.y += this.unit * 0.45 * dt;
    this.enemyBullets = this.enemyBullets.filter((b) => b.y < this.H);

    // formation sway
    this.sway += this.swayDir * this.swaySpeed * dt;
    const swayMax = this.unit * 0.9;
    if (this.sway > swayMax) {
      this.sway = swayMax;
      this.swayDir = -1;
    } else if (this.sway < -swayMax) {
      this.sway = -swayMax;
      this.swayDir = 1;
    }

    for (const e of this.enemies) {
      e.t += dt;
      if (e.state === "formation") {
        e.x = e.homeX + this.sway;
        e.y = e.homeY;
        if (Math.random() < this.diveChance * dt && this.respawnTimer <= 0) {
          e.state = "diving";
          e.t = 0;
          e.diveX = p.x + p.w / 2;
          e.beamed = false;
        }
      } else if (e.state === "diving") {
        e.y += this.diveSpeed * dt;
        e.x += Math.sin(e.t * 0.12) * this.unit * 0.12 * dt + (e.diveX - e.x) * 0.01 * dt;
        // captor tractor-beam window (Twin Talon)
        if (
          this.capture &&
          e.captor &&
          !e.beamed &&
          p.alive &&
          !this.captive &&
          this.respawnTimer <= 0 &&
          e.y > this.H * 0.35 &&
          e.y < this.H * 0.65 &&
          Math.abs(e.x + e.w / 2 - (p.x + p.w / 2)) < this.unit
        ) {
          this._capture(e);
        }
        if (Math.random() < 0.02 * dt) {
          this.enemyBullets.push({
            x: e.x + e.w / 2,
            y: e.y + e.h,
            w: this.unit * 0.14,
            h: this.unit * 0.4,
          });
        }
        if (e.y > this.H) {
          // re-enter from the top and ease back to formation
          e.y = -e.h;
          e.state = "returning";
        }
      } else if (e.state === "returning") {
        e.x += (e.homeX + this.sway - e.x) * 0.05 * dt;
        e.y += (e.homeY - e.y) * 0.05 * dt;
        if (Math.abs(e.y - e.homeY) < 2) e.state = "formation";
      } else if (e.state === "carrying") {
        // captor flew the captive back up and parks it just below the formation
        e.x = e.homeX + this.sway;
        e.y += (e.homeY - e.y) * 0.04 * dt;
      }
    }

    this._collisions(py);

    // Wave cleared once every enemy is gone. A captor still carrying the
    // captive ship counts as alive, so you must shoot it (freeing the dual
    // fighter) before the next wave can start.
    if (this.enemies.length === 0) this._spawnWave();

    for (const pt of this.particles) {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.life -= dt;
    }
    this.particles = this.particles.filter((pt) => pt.life > 0);
  }

  _collisions(py) {
    const p = this.player;
    const pbox = { x: p.x, y: py, w: p.w, h: p.h };

    // player bullets vs enemies
    for (const b of this.bullets) {
      for (const e of this.enemies) {
        if (overlaps(b, e)) {
          b.dead = true;
          this._kill(e);
          break;
        }
      }
    }
    this.bullets = this.bullets.filter((b) => !b.dead);

    if (!p.alive || this.invuln > 0) return;

    // diving enemies vs player
    for (const e of this.enemies) {
      if ((e.state === "diving" || e.state === "returning") && overlaps(pbox, e)) {
        this._hitPlayer();
        return;
      }
    }
    // enemy bullets vs player
    for (const b of this.enemyBullets) {
      if (overlaps(pbox, b)) {
        b.dead = true;
        this._hitPlayer();
        return;
      }
    }
    this.enemyBullets = this.enemyBullets.filter((b) => !b.dead);
  }

  _kill(e) {
    const idx = this.enemies.indexOf(e);
    if (idx < 0) return;
    this.enemies.splice(idx, 1);
    const base = e.captor ? 150 : e.state === "diving" ? 100 : 50;
    this.score += base;
    this._burst(e.x + e.w / 2, e.y + e.h / 2);
    // freeing the captive: killing the captor that carries it -> dual fighter
    if (this.capture && e.carrying && this.captive && this.captive.enemy === e) {
      this.captive = null;
      this.dual = true;
    }
    awardBonus(this.lives, this.score);
    this._saveBest();
    this._syncHud();
  }

  _capture(e) {
    // Galaga-style: capture costs a life immediately.
    this.player.alive = false;
    this.lives.count--;
    this._burst(this.player.x + this.player.w / 2, this.H - 20);
    if (this.lives.count <= 0) {
      // last life captured -> game over, no rescue
      this._syncHud();
      this._gameOver("Captured on your last ship!");
      return;
    }
    // otherwise the captor carries the captive up; player respawns shortly
    e.state = "carrying";
    e.carrying = true;
    this.captive = { enemy: e };
    this.respawnTimer = 90;
    this.dual = false; // a fresh single ship returns
    this._syncHud();
  }

  _hitPlayer() {
    this.player.alive = false;
    this._burst(this.player.x + this.player.w / 2, this.H - 20);
    if (this.dual) {
      // a death while dual costs one life and reverts to a single ship
      this.dual = false;
      this.lives.count--;
    } else {
      this.lives.count--;
    }
    if (this.lives.count <= 0) {
      this._syncHud();
      this._gameOver("Out of ships!");
      return;
    }
    this.respawnTimer = 60;
    this._syncHud();
  }

  _gameOver(msg) {
    this.over = true;
    this._saveBest();
    this.el.overMsg.textContent = `${msg}  Score ${this.score} · Best ${getNumber(this.key, 0)}`;
    this.el.over.classList.remove("hidden");
  }

  _burst(x, y) {
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * this.unit * 0.2,
        vy: Math.sin(a) * this.unit * 0.2,
        life: 30,
      });
    }
  }

  // ---- render ------------------------------------------------------------
  _draw() {
    const ctx = this.ctx;
    ctx.fillStyle = cssVar("--panel");
    ctx.fillRect(0, 0, this.W, this.H);

    const accent = cssVar("--accent");
    const accent2 = cssVar("--accent2");
    const text = cssVar("--text");

    // bullets
    ctx.fillStyle = accent2;
    for (const b of this.bullets) ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = cssVar("--danger");
    for (const b of this.enemyBullets) ctx.fillRect(b.x, b.y, b.w, b.h);

    // enemies (geometric: body diamond + eyes); captors get a ring
    for (const e of this.enemies) {
      this._drawEnemy(e, e.captor ? accent : accent2, text);
      if (e.state === "carrying") this._drawCaptive(e, accent);
    }

    // tractor beam visual while a captor is in its beam window
    if (this.capture) {
      for (const e of this.enemies) {
        if (e.captor && e.state === "diving" && e.y > this.H * 0.3 && e.y < this.H * 0.66) {
          ctx.globalAlpha = 0.18;
          ctx.fillStyle = accent;
          ctx.beginPath();
          ctx.moveTo(e.x + e.w * 0.5, e.y + e.h);
          ctx.lineTo(e.x - e.w * 0.4, this.H);
          ctx.lineTo(e.x + e.w * 1.4, this.H);
          ctx.closePath();
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    }

    // particles
    ctx.fillStyle = accent;
    for (const pt of this.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / 30);
      ctx.fillRect(pt.x, pt.y, 3, 3);
    }
    ctx.globalAlpha = 1;

    // player
    if (this.player.alive && !(this.invuln > 0 && Math.floor(this.invuln / 6) % 2)) {
      const py = this.H - this.player.h - 8;
      if (this.dual) {
        this._drawShip(this.player.x, py, this.player.w * 0.46, this.player.h, accent);
        this._drawShip(
          this.player.x + this.player.w * 0.54,
          py,
          this.player.w * 0.46,
          this.player.h,
          accent
        );
      } else {
        this._drawShip(this.player.x, py, this.player.w, this.player.h, accent);
      }
    }

    if (this.paused) this._banner("Paused", "Tap or press Space to resume");
  }

  _drawEnemy(e, color, eyes) {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(e.x + e.w / 2, e.y);
    ctx.lineTo(e.x + e.w, e.y + e.h / 2);
    ctx.lineTo(e.x + e.w / 2, e.y + e.h);
    ctx.lineTo(e.x, e.y + e.h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = eyes;
    const r = e.w * 0.1;
    ctx.fillRect(e.x + e.w * 0.32 - r, e.y + e.h * 0.42, r * 2, r * 2);
    ctx.fillRect(e.x + e.w * 0.68 - r, e.y + e.h * 0.42, r * 2, r * 2);
  }

  _drawCaptive(e, color) {
    this._drawShip(e.x + e.w * 0.1, e.y + e.h * 1.05, e.w * 0.8, e.h * 0.8, color);
  }

  _drawShip(x, y, w, h, color) {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w * 0.5, y + h * 0.78);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fill();
  }

  _banner(title, sub) {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, this.H / 2 - 40, this.W, 80);
    ctx.fillStyle = cssVar("--text");
    ctx.textAlign = "center";
    ctx.font = `bold ${this.unit * 0.7}px system-ui, sans-serif`;
    ctx.fillText(title, this.W / 2, this.H / 2 - 4);
    ctx.font = `${this.unit * 0.34}px system-ui, sans-serif`;
    ctx.fillText(sub, this.W / 2, this.H / 2 + 22);
    ctx.textAlign = "start";
  }

  _loop(t) {
    let dt = (t - this.last) / 16.67;
    this.last = t;
    if (dt > 3) dt = 3;
    if (!this.over && !this.paused) this._update(dt);
    this._draw();
    requestAnimationFrame(this._loop);
  }

  // ---- external controls -------------------------------------------------
  clearBest() {
    remove(this.key);
    this._syncHud();
  }
}
