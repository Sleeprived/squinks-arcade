import { getNumber, setNumber } from "../../js/storage.js";

const CHIPS_KEY = "squinks.roulette.chips";
const PEAK_KEY = "squinks.roulette.peak";
const MIN = 5;

const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
function colorOf(n) {
  return n === 0 ? "green" : REDS.has(n) ? "red" : "black";
}

// Outside / dozen bets. payout is the "to one" multiple; a win returns
// stake * (payout + 1) (the original stake plus the winnings).
const SPOTS = {
  red: { label: "Red", payout: 1, win: (n) => colorOf(n) === "red" },
  black: { label: "Black", payout: 1, win: (n) => colorOf(n) === "black" },
  even: { label: "Even", payout: 1, win: (n) => n !== 0 && n % 2 === 0 },
  odd: { label: "Odd", payout: 1, win: (n) => n % 2 === 1 },
  low: { label: "1–18", payout: 1, win: (n) => n >= 1 && n <= 18 },
  high: { label: "19–36", payout: 1, win: (n) => n >= 19 && n <= 36 },
  d1: { label: "1st 12", payout: 2, win: (n) => n >= 1 && n <= 12 },
  d2: { label: "2nd 12", payout: 2, win: (n) => n >= 13 && n <= 24 },
  d3: { label: "3rd 12", payout: 2, win: (n) => n >= 25 && n <= 36 },
};

const el = (id) => document.getElementById(id);
const chipsEl = el("chips");
const peakEl = el("peak");
const stakedEl = el("staked");
const resultEl = el("result");
const msgEl = el("msg");
const betlistEl = el("betlist");
const numEl = el("num");
const spinBtn = el("spin");
const rebuyBtn = el("rebuy");

let chips, peak, denom, bets, spinning, spinId, pickNum;

function loadBank() {
  chips = getNumber(CHIPS_KEY, 1000);
  if (!Number.isFinite(chips) || chips < 0) chips = 1000;
  peak = getNumber(PEAK_KEY, chips);
  if (!Number.isFinite(peak) || peak < chips) peak = chips;
}
function saveBank() {
  if (chips > peak) peak = chips;
  setNumber(CHIPS_KEY, chips);
  setNumber(PEAK_KEY, peak);
}

const totalStaked = () => Object.values(bets).reduce((a, b) => a + b, 0);
const available = () => chips - totalStaked();

function betLabel(id) {
  if (id.startsWith("num:")) return "#" + id.slice(4);
  return SPOTS[id].label;
}

function render() {
  chipsEl.textContent = chips;
  peakEl.textContent = peak;
  stakedEl.textContent = totalStaked();
  numEl.textContent = pickNum;

  const entries = Object.entries(bets);
  betlistEl.textContent = entries.length
    ? entries.map(([id, amt]) => `${betLabel(id)} ${amt}`).join(" · ")
    : "No bets yet.";

  for (const b of document.querySelectorAll(".spot")) {
    b.classList.toggle("staked", (bets[b.dataset.spot] || 0) > 0);
  }
  for (const b of document.querySelectorAll(".denom")) {
    b.classList.toggle("active", +b.dataset.denom === denom);
  }
  spinBtn.disabled = spinning || totalStaked() === 0;
}

function showNumber(n) {
  resultEl.textContent = n;
  resultEl.className = "result-badge " + colorOf(n);
}

function placeBet(id) {
  if (spinning) return;
  if (available() < denom) {
    msgEl.textContent = "Not enough chips for that bet.";
    return;
  }
  bets[id] = (bets[id] || 0) + denom;
  msgEl.textContent = `Placed ${denom} on ${betLabel(id)}.`;
  render();
}

function clearBets() {
  if (spinning) return;
  bets = {};
  msgEl.textContent = "Bets cleared.";
  render();
}

function checkBust() {
  if (chips < MIN) {
    rebuyBtn.classList.remove("hidden");
    spinBtn.disabled = true;
    msgEl.textContent = "Out of chips — rebuy to keep playing.";
    return true;
  }
  rebuyBtn.classList.add("hidden");
  return false;
}

function settle(winN) {
  showNumber(winN);
  const staked = totalStaked();
  let returned = 0;
  const winners = [];
  for (const [id, amt] of Object.entries(bets)) {
    let won, payout;
    if (id.startsWith("num:")) {
      won = +id.slice(4) === winN;
      payout = 35;
    } else {
      won = SPOTS[id].win(winN);
      payout = SPOTS[id].payout;
    }
    if (won) {
      returned += amt * (payout + 1);
      winners.push(betLabel(id));
    }
  }
  chips = chips - staked + returned;
  const net = returned - staked;
  saveBank();
  bets = {};
  spinning = false;
  const color = colorOf(winN);
  if (net > 0) msgEl.textContent = `${winN} ${color} — won ${net} (${winners.join(", ")}).`;
  else if (net === 0) msgEl.textContent = `${winN} ${color} — broke even.`;
  else msgEl.textContent = winners.length
    ? `${winN} ${color} — net ${net} (${winners.join(", ")} hit).`
    : `${winN} ${color} — lost ${staked}.`;
  render();
  checkBust();
}

function spin() {
  if (spinning || totalStaked() === 0) return;
  spinning = true;
  spinBtn.disabled = true;
  msgEl.textContent = "Spinning…";
  const winN = Math.floor(Math.random() * 37);
  let ticks = 0;
  spinId = setInterval(() => {
    showNumber(Math.floor(Math.random() * 37));
    ticks++;
    if (ticks >= 18) {
      clearInterval(spinId);
      settle(winN);
    }
  }, 70);
}

// ---- controls ----
document.querySelectorAll(".spot").forEach((b) => {
  b.addEventListener("click", () => placeBet(b.dataset.spot));
});
document.querySelectorAll(".denom").forEach((b) => {
  b.addEventListener("click", () => {
    denom = +b.dataset.denom;
    render();
  });
});
el("num-dn").addEventListener("click", () => {
  pickNum = (pickNum + 36) % 37;
  render();
});
el("num-up").addEventListener("click", () => {
  pickNum = (pickNum + 1) % 37;
  render();
});
el("num-bet").addEventListener("click", () => placeBet("num:" + pickNum));
spinBtn.addEventListener("click", spin);
el("clear").addEventListener("click", clearBets);

rebuyBtn.addEventListener("click", () => {
  chips = 1000; // peak retained
  saveBank();
  bets = {};
  rebuyBtn.classList.add("hidden");
  msgEl.textContent = "Rebought 1000 chips.";
  render();
});

el("reset").addEventListener("click", () => {
  if (confirm("Reset Roulette bankroll to 1000 and clear peak?")) {
    chips = 1000;
    peak = 1000;
    bets = {};
    saveBank();
    rebuyBtn.classList.add("hidden");
    msgEl.textContent = "Bankroll reset.";
    render();
  }
});

// ---- init ----
loadBank();
denom = 5;
bets = {};
spinning = false;
pickNum = 17;
saveBank();
resultEl.textContent = "–";
resultEl.className = "result-badge";
render();
checkBust();
