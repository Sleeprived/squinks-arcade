/* Shared helpers for the Retro Wave games (Muncher, Star Divers, Twin Talon):
   theme-var reads, responsive canvas sizing, and the common lives / bonus-life
   model. Lifted out of the per-game files because three games share it; the
   original arcade games keep their own inline copies untouched.

   Lives model (locked): start with 3 lives, gain 1 bonus life every 10,000
   points, capped at 5 — bonus lives past the cap are forfeited. Game over at 0. */

export function cssVar(name, fallback = "#fff") {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

// Size a square canvas to the viewport, reserving vertical space for chrome.
export function fitSquare(canvas, { reserve = 260, min = 200, max = 460 } = {}) {
  const w = window.innerWidth - 24;
  const h = window.innerHeight - reserve;
  const size = Math.floor(Math.max(min, Math.min(w, h, max)));
  canvas.width = canvas.height = size;
  return size;
}

// Size a portrait (taller-than-wide) canvas for the shooters.
export function fitPortrait(canvas, { reserve = 210, minW = 240, maxW = 420, ratio = 1.45 } = {}) {
  const w = Math.floor(Math.max(minW, Math.min(window.innerWidth - 24, maxW)));
  const h = Math.floor(Math.min(window.innerHeight - reserve, w * ratio));
  canvas.width = w;
  canvas.height = Math.max(Math.floor(minW * ratio), h);
  return { w: canvas.width, h: canvas.height };
}

export const MAX_LIVES = 5;
export const BONUS_EVERY = 10000;

export function makeLives(start = 3) {
  return { count: start, nextBonus: BONUS_EVERY };
}

// Award a bonus life for each 10k threshold crossed; ignore awards past the cap
// but still advance the threshold so each band fires at most once.
export function awardBonus(lives, score) {
  while (score >= lives.nextBonus) {
    if (lives.count < MAX_LIVES) lives.count++;
    lives.nextBonus += BONUS_EVERY;
  }
}

// Render lives as heart icons (capped at MAX_LIVES, which is also the life cap).
export function renderLives(el, count) {
  const n = Math.max(0, Math.min(MAX_LIVES, count));
  el.textContent = "♥".repeat(n) || "—";
}

// Axis-aligned box overlap test. Boxes are { x, y, w, h } with x/y at top-left.
export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
