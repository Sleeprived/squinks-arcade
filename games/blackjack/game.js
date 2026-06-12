import { getNumber, setNumber } from "../../js/storage.js";
import { freshDeck, shuffle, cardHTML } from "../../js/cards.js";

const CHIPS_KEY = "squinks.blackjack.chips";
const PEAK_KEY = "squinks.blackjack.peak";
const MIN_BET = 5;
const DECKS = 6;

const el = (id) => document.getElementById(id);
const chipsEl = el("chips");
const peakEl = el("peak");
const betEl = el("bet");
const msgEl = el("msg");
const dealerCardsEl = el("dealer-cards");
const dealerValEl = el("dealer-val");
const playerAreaEl = el("player-area");

const groups = {
  bet: el("bet-controls"),
  ins: el("ins-controls"),
  action: el("action-controls"),
  round: el("round-controls"),
};

let chips, peak, bet;
let shoe, shoeStart;
let dealer, hands, active, phase, insuranceBet, dealerReveal;

// ---- chips / persistence ----
function loadBank() {
  chips = getNumber(CHIPS_KEY, 1000);
  if (!Number.isFinite(chips) || chips < 0) chips = 1000;
  peak = getNumber(PEAK_KEY, chips);
  if (!Number.isFinite(peak) || peak < chips) peak = chips;
  bet = Math.min(25, Math.max(MIN_BET, chips));
}
function saveBank() {
  if (chips > peak) peak = chips;
  setNumber(CHIPS_KEY, chips);
  setNumber(PEAK_KEY, peak);
  chipsEl.textContent = chips;
  peakEl.textContent = peak;
}

// ---- shoe ----
function buildShoe() {
  shoe = shuffle(freshDeck(DECKS));
  shoeStart = shoe.length;
}
function maybeReshuffle() {
  if (!shoe || shoe.length < shoeStart * 0.25) buildShoe();
}
function draw() {
  if (!shoe.length) buildShoe();
  return shoe.pop();
}

// ---- hand evaluation ----
function evalHand(cards) {
  let total = 0, aces = 0;
  for (const c of cards) {
    if (c.r === "A") { aces++; total += 11; }
    else if (c.r === "10" || c.r === "J" || c.r === "Q" || c.r === "K") total += 10;
    else total += Number(c.r);
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return { total, soft: aces > 0 };
}
const isBlackjack = (cards) => cards.length === 2 && evalHand(cards).total === 21;

// ---- UI ----
function setPhase(p) {
  phase = p;
  for (const k of Object.keys(groups)) groups[k].classList.add("hidden");
  if (p === "bet") groups.bet.classList.remove("hidden");
  else if (p === "insurance") groups.ins.classList.remove("hidden");
  else if (p === "player") groups.action.classList.remove("hidden");
  else if (p === "done") groups.round.classList.remove("hidden");
  if (p === "player") updateActionButtons();
}

function renderDealer() {
  let html = "";
  dealer.forEach((c, i) => {
    html += cardHTML(c, i === 1 && !dealerReveal);
  });
  dealerCardsEl.innerHTML = html;
  dealerValEl.textContent = dealerReveal ? `(${evalHand(dealer).total})` : "";
}

function renderPlayer() {
  playerAreaEl.innerHTML = "";
  hands.forEach((h, i) => {
    const div = document.createElement("div");
    div.className = "hand" + (phase === "player" && i === active ? " active" : "");
    const v = evalHand(h.cards);
    let tag = `Hand ${hands.length > 1 ? i + 1 : ""} · bet ${h.bet} · ${v.total}`;
    if (h.cards.length && evalHand(h.cards).total > 21) tag += " · bust";
    else if (h.result) tag += ` · ${h.result}`;
    div.innerHTML = `<div class="meta">${tag}</div><div class="cardrow">${h.cards.map((c) => cardHTML(c, false)).join("")}</div>`;
    playerAreaEl.appendChild(div);
  });
}

function render() {
  renderDealer();
  renderPlayer();
  chipsEl.textContent = chips;
  peakEl.textContent = peak;
  betEl.textContent = bet;
}

function updateActionButtons() {
  const h = hands[active];
  const canSplit =
    hands.length === 1 &&
    h.cards.length === 2 &&
    rankVal(h.cards[0]) === rankVal(h.cards[1]) &&
    chips >= h.bet;
  const canDouble = h.cards.length === 2 && !h.splitAces && chips >= h.bet;
  el("double").disabled = !canDouble;
  el("split").disabled = !canSplit;
  el("hit").disabled = false;
  el("stand").disabled = false;
}
function rankVal(c) {
  if (c.r === "10" || c.r === "J" || c.r === "Q" || c.r === "K") return 10;
  return c.r;
}

// ---- round flow ----
function checkBust() {
  if (chips < MIN_BET) {
    el("bust").classList.remove("hidden");
    return true;
  }
  return false;
}

function toBetPhase() {
  dealer = [];
  hands = [];
  dealerReveal = false;
  insuranceBet = 0;
  render();
  if (checkBust()) return;
  bet = Math.min(bet, chips);
  if (bet < MIN_BET) bet = MIN_BET;
  msgEl.textContent = "Place your bet.";
  setPhase("bet");
  render();
}

function deal() {
  if (phase !== "bet") return;
  bet = Math.max(MIN_BET, Math.min(bet, chips));
  chips -= bet;
  maybeReshuffle();
  hands = [{ cards: [draw(), draw()], bet, done: false, doubled: false, splitAces: false, result: "" }];
  dealer = [draw(), draw()];
  active = 0;
  dealerReveal = false;
  insuranceBet = 0;
  saveBank();
  render();
  msgEl.textContent = "";

  if (dealer[0].r === "A") {
    setPhase("insurance");
    msgEl.textContent = "Insurance?";
    return;
  }
  afterInsurance();
}

function afterInsurance() {
  // Dealer peeks for blackjack on an Ace or ten-value upcard.
  const up = dealer[0];
  const peeks = up.r === "A" || rankVal(up) === 10;
  if (peeks && isBlackjack(dealer)) {
    revealAndResolveDealerBJ();
    return;
  }
  if (isBlackjack(hands[0].cards)) {
    // player natural, dealer not
    dealerReveal = true;
    chips += hands[0].bet + Math.floor((hands[0].bet * 3) / 2); // 3:2 + stake back (integer chips)
    hands[0].result = "blackjack!";
    saveBank();
    render();
    endRound("Blackjack! Paid 3:2.");
    return;
  }
  setPhase("player");
  startActiveHand();
}

function revealAndResolveDealerBJ() {
  dealerReveal = true;
  let note = "Dealer has blackjack.";
  if (insuranceBet > 0) {
    chips += insuranceBet * 3; // 2:1 plus stake
    note += " Insurance paid 2:1.";
  }
  // main hands: push if also blackjack, else already lost stake
  for (const h of hands) {
    if (isBlackjack(h.cards)) { chips += h.bet; h.result = "push"; }
    else h.result = "lose";
  }
  saveBank();
  render();
  endRound(note);
}

function startActiveHand() {
  const h = hands[active];
  if (h.splitAces) { h.done = true; advance(); return; }
  render();
  updateActionButtons();
}

function hit() {
  if (phase !== "player") return;
  const h = hands[active];
  h.cards.push(draw());
  if (evalHand(h.cards).total > 21) { h.done = true; render(); advance(); }
  else { render(); updateActionButtons(); }
}

function stand() {
  if (phase !== "player") return;
  hands[active].done = true;
  advance();
}

function double() {
  if (phase !== "player") return;
  const h = hands[active];
  if (h.cards.length !== 2 || h.splitAces || chips < h.bet) return;
  chips -= h.bet;
  h.bet *= 2;
  h.doubled = true;
  h.cards.push(draw());
  h.done = true;
  saveBank();
  render();
  advance();
}

function split() {
  if (phase !== "player") return;
  const h = hands[active];
  if (hands.length !== 1 || h.cards.length !== 2 || rankVal(h.cards[0]) !== rankVal(h.cards[1]) || chips < h.bet) return;
  chips -= h.bet;
  const aces = h.cards[0].r === "A";
  const c0 = h.cards[0], c1 = h.cards[1];
  hands = [
    { cards: [c0, draw()], bet: h.bet, done: false, doubled: false, splitAces: aces, result: "" },
    { cards: [c1, draw()], bet: h.bet, done: false, doubled: false, splitAces: aces, result: "" },
  ];
  active = 0;
  saveBank();
  if (aces) {
    hands[0].done = true;
    hands[1].done = true;
    render();
    advance();
    return;
  }
  render();
  updateActionButtons();
}

function advance() {
  let next = -1;
  for (let i = active + 1; i < hands.length; i++) {
    if (!hands[i].done) { next = i; break; }
  }
  if (next === -1) {
    // also handle the case where a later split-aces hand still needs flagging
    dealerPlay();
    return;
  }
  active = next;
  startActiveHand();
}

function dealerPlay() {
  setPhase("done");
  dealerReveal = true;
  const allBust = hands.every((h) => evalHand(h.cards).total > 21);
  if (!allBust) {
    while (evalHand(dealer).total < 17) dealer.push(draw());
  }
  resolve();
}

function resolve() {
  const dv = evalHand(dealer).total;
  const dBust = dv > 21;
  let wins = 0, losses = 0, pushes = 0;
  for (const h of hands) {
    const pv = evalHand(h.cards).total;
    if (pv > 21) { h.result = "lose"; losses++; continue; }
    if (dBust || pv > dv) { chips += h.bet * 2; h.result = "win"; wins++; }
    else if (pv === dv) { chips += h.bet; h.result = "push"; pushes++; }
    else { h.result = "lose"; losses++; }
  }
  saveBank();
  render();
  const parts = [];
  if (wins) parts.push(`${wins} win${wins > 1 ? "s" : ""}`);
  if (pushes) parts.push(`${pushes} push`);
  if (losses) parts.push(`${losses} loss${losses > 1 ? "es" : ""}`);
  endRound(`Dealer ${dBust ? "busts" : dv}. ${parts.join(", ")}.`);
}

function endRound(note) {
  setPhase("done");
  msgEl.textContent = note;
  saveBank();
}

// ---- controls ----
el("deal").addEventListener("click", deal);
el("hit").addEventListener("click", hit);
el("stand").addEventListener("click", stand);
el("double").addEventListener("click", double);
el("split").addEventListener("click", split);
el("next").addEventListener("click", toBetPhase);

el("ins-yes").addEventListener("click", () => {
  const cost = Math.floor(hands[0].bet / 2);
  if (chips >= cost) { chips -= cost; insuranceBet = cost; saveBank(); }
  afterInsurance();
});
el("ins-no").addEventListener("click", () => { insuranceBet = 0; afterInsurance(); });

el("bet-dn").addEventListener("click", () => { bet = Math.max(MIN_BET, bet - 5); betEl.textContent = bet; });
el("bet-up").addEventListener("click", () => { bet = Math.min(chips, bet + 5); betEl.textContent = bet; });
el("bet-max").addEventListener("click", () => { bet = Math.max(MIN_BET, chips); betEl.textContent = bet; });

el("rebuy").addEventListener("click", () => {
  chips = 1000; // peak retained
  saveBank();
  el("bust").classList.add("hidden");
  toBetPhase();
});

el("reset").addEventListener("click", () => {
  if (confirm("Reset Blackjack bankroll to 1000 and clear peak?")) {
    chips = 1000; peak = 1000;
    saveBank();
    el("bust").classList.add("hidden");
    toBetPhase();
  }
});

// ---- init ----
loadBank();
buildShoe();
saveBank();
toBetPhase();
