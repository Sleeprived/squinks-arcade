/* Shared deck utilities for Blackjack and Video Poker. Shuffles use
   crypto.getRandomValues for fairness (no security depends on it). */

export const SUITS = ["♠", "♥", "♦", "♣"]; // spade heart diamond club
export const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

export function randInt(n) {
  const u = new Uint32Array(1);
  crypto.getRandomValues(u);
  return u[0] % n;
}

export function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function freshDeck(decks = 1) {
  const out = [];
  for (let d = 0; d < decks; d++)
    for (const s of SUITS) for (const r of RANKS) out.push({ r, s });
  return out;
}

export function isRed(c) {
  return c.s === "♥" || c.s === "♦";
}

export function cardHTML(c, hidden) {
  if (hidden) return '<div class="pcard back"></div>';
  return `<div class="pcard${isRed(c) ? " red" : ""}"><span>${c.r}</span><span>${c.s}</span></div>`;
}
