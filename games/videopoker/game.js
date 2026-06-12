import { getNumber, setNumber } from "../../js/storage.js";
import { freshDeck, shuffle, isRed } from "../../js/cards.js";

const CHIPS_KEY = "squinks.videopoker.chips";
const PEAK_KEY = "squinks.videopoker.peak";
const MAX_BET = 5;

// 9/6 Jacks-or-Better, per-coin payouts (Royal handled specially at 5 coins).
const TABLE = [
  { key: "royal", label: "Royal Flush", per: 250 },
  { key: "sf", label: "Straight Flush", per: 50 },
  { key: "four", label: "Four of a Kind", per: 25 },
  { key: "full", label: "Full House", per: 9 },
  { key: "flush", label: "Flush", per: 6 },
  { key: "straight", label: "Straight", per: 4 },
  { key: "three", label: "Three of a Kind", per: 3 },
  { key: "twopair", label: "Two Pair", per: 2 },
  { key: "jacks", label: "Jacks or Better", per: 1 },
];

const el = (id) => document.getElementById(id);
const chipsEl = el("chips");
const peakEl = el("peak");
const betEl = el("bet");
const msgEl = el("msg");
const handEl = el("hand");
const tableEl = el("paytable");
const actionBtn = el("action");

let chips, peak, bet, deck, hand, holds, phase; // phase: "bet" | "draw"

function loadBank() {
  chips = getNumber(CHIPS_KEY, 1000);
  if (!Number.isFinite(chips) || chips < 0) chips = 1000;
  peak = getNumber(PEAK_KEY, chips);
  if (!Number.isFinite(peak) || peak < chips) peak = chips;
  bet = 1;
}
function saveBank() {
  if (chips > peak) peak = chips;
  setNumber(CHIPS_KEY, chips);
  setNumber(PEAK_KEY, peak);
  chipsEl.textContent = chips;
  peakEl.textContent = peak;
}

function rankNum(r) {
  if (r === "A") return 14;
  if (r === "K") return 13;
  if (r === "Q") return 12;
  if (r === "J") return 11;
  return Number(r);
}

function evaluate(cards) {
  const vals = cards.map((c) => rankNum(c.r)).sort((a, b) => a - b);
  const flush = cards.every((c) => c.s === cards[0].s);
  const counts = {};
  vals.forEach((v) => (counts[v] = (counts[v] || 0) + 1));
  const countVals = Object.values(counts).sort((a, b) => b - a);
  const uniq = [...new Set(vals)];
  let straight = false, high = 0;
  if (uniq.length === 5) {
    if (vals[4] - vals[0] === 4) { straight = true; high = vals[4]; }
    else if (vals.join(",") === "2,3,4,5,14") { straight = true; high = 5; }
  }
  if (flush && straight && high === 14) return "royal";
  if (flush && straight) return "sf";
  if (countVals[0] === 4) return "four";
  if (countVals[0] === 3 && countVals[1] === 2) return "full";
  if (flush) return "flush";
  if (straight) return "straight";
  if (countVals[0] === 3) return "three";
  if (countVals[0] === 2 && countVals[1] === 2) return "twopair";
  if (countVals[0] === 2) {
    const pairRank = Number(Object.keys(counts).find((k) => counts[k] === 2));
    if (pairRank >= 11) return "jacks";
  }
  return "none";
}

function payFor(key, b) {
  if (key === "none") return 0;
  if (key === "royal") return b === 5 ? 4000 : 250 * b;
  const row = TABLE.find((t) => t.key === key);
  return row ? row.per * b : 0;
}

function renderTable(winKey) {
  let html = "";
  for (const row of TABLE) {
    const amt = row.key === "royal" && bet === 5 ? 4000 : row.per * bet;
    html += `<tr class="${row.key === winKey ? "win" : ""}"><td>${row.label}</td><td>${amt}</td></tr>`;
  }
  tableEl.innerHTML = html;
}

function renderHand(revealAll) {
  if (!hand) { handEl.innerHTML = ""; return; }
  handEl.innerHTML = hand
    .map((c, i) => {
      const red = isRed(c);
      const held = holds[i];
      const clickable = phase === "draw";
      return `<div class="pcard${red ? " red" : ""}${held ? " held" : ""}${clickable ? " holdable" : ""}" data-i="${i}">
        <span class="hold-tag">${held ? "HOLD" : ""}</span>
        <span>${c.r}</span>
        <span>${c.s}</span>
      </div>`;
    })
    .join("");
}

function checkBust() {
  if (chips < 1) {
    el("bust").classList.remove("hidden");
    return true;
  }
  return false;
}

function toBetPhase() {
  phase = "bet";
  actionBtn.textContent = "Deal";
  if (checkBust()) return;
  bet = Math.min(bet, chips, MAX_BET);
  if (bet < 1) bet = 1;
  betEl.textContent = bet;
  renderTable(null);
  saveBank();
}

function deal() {
  bet = Math.max(1, Math.min(bet, chips, MAX_BET));
  chips -= bet;
  deck = shuffle(freshDeck(1));
  hand = [deck.pop(), deck.pop(), deck.pop(), deck.pop(), deck.pop()];
  holds = [false, false, false, false, false];
  phase = "draw";
  actionBtn.textContent = "Draw";
  msgEl.textContent = "Tap cards to hold, then Draw.";
  betEl.textContent = bet;
  saveBank();
  renderTable(null);
  renderHand(true);
}

function drawCards() {
  for (let i = 0; i < 5; i++) if (!holds[i]) hand[i] = deck.pop();
  const cat = evaluate(hand);
  const win = payFor(cat, bet);
  chips += win;
  saveBank();
  renderHand(true);
  if (win > 0) {
    const label = TABLE.find((t) => t.key === cat).label;
    msgEl.textContent = `${label} — won ${win}!`;
    renderTable(cat);
  } else {
    msgEl.textContent = "No win. Deal again.";
    renderTable(null);
  }
  toBetPhase();
}

handEl.addEventListener("click", (e) => {
  if (phase !== "draw") return;
  const c = e.target.closest(".pcard");
  if (!c) return;
  const i = +c.dataset.i;
  holds[i] = !holds[i];
  renderHand(true);
});

actionBtn.addEventListener("click", () => {
  if (phase === "bet") deal();
  else drawCards();
});

el("bet-dn").addEventListener("click", () => { if (phase !== "draw") { bet = Math.max(1, bet - 1); betEl.textContent = bet; renderTable(null); } });
el("bet-up").addEventListener("click", () => { if (phase !== "draw") { bet = Math.min(MAX_BET, chips, bet + 1); betEl.textContent = bet; renderTable(null); } });
el("bet-max").addEventListener("click", () => { if (phase !== "draw") { bet = Math.max(1, Math.min(MAX_BET, chips)); betEl.textContent = bet; renderTable(null); } });

el("rebuy").addEventListener("click", () => {
  chips = 1000; // peak retained
  saveBank();
  el("bust").classList.add("hidden");
  toBetPhase();
});

el("reset").addEventListener("click", () => {
  if (confirm("Reset Video Poker bankroll to 1000 and clear peak?")) {
    chips = 1000; peak = 1000;
    saveBank();
    el("bust").classList.add("hidden");
    toBetPhase();
  }
});

// init
loadBank();
saveBank();
toBetPhase();
renderHand(false);
