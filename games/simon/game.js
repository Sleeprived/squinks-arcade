import { getNumber, setNumber, remove } from "../../js/storage.js";

const BEST_KEY = "squinks.simon.best";

const pads = [...document.querySelectorAll(".pad")];
const levelEl = document.getElementById("level");
const bestEl = document.getElementById("best");
const msgEl = document.getElementById("msg");
const overlay = document.getElementById("over");
const overMsg = document.getElementById("over-msg");

let sequence, level, inputIndex, accepting, gen;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function updateStats() {
  levelEl.textContent = level;
  bestEl.textContent = getNumber(BEST_KEY, 0);
}

function flash(i, dur) {
  return new Promise((res) => {
    pads[i].classList.add("lit");
    setTimeout(() => {
      pads[i].classList.remove("lit");
      res();
    }, dur);
  });
}

function blip(i) {
  pads[i].classList.add("lit");
  setTimeout(() => pads[i].classList.remove("lit"), 160);
}

async function playSequence() {
  const mine = gen;
  accepting = false;
  msgEl.textContent = "Watch…";
  await sleep(450);
  const on = Math.max(220, 560 - level * 28);
  for (const i of sequence) {
    if (mine !== gen) return; // a new game / reset interrupted us
    await flash(i, on * 0.65);
    await sleep(on * 0.25);
  }
  if (mine !== gen) return;
  accepting = true;
  inputIndex = 0;
  msgEl.textContent = "Your turn.";
}

function nextRound() {
  level++;
  sequence.push(Math.floor(Math.random() * 4));
  updateStats();
  playSequence();
}

function newGame() {
  gen++;
  sequence = [];
  level = 0;
  inputIndex = 0;
  accepting = false;
  overlay.classList.add("hidden");
  updateStats();
  nextRound();
}

function gameOver() {
  gen++; // cancel any pending playback
  accepting = false;
  overMsg.textContent = `You reached level ${level}. Best ${getNumber(BEST_KEY, 0)}.`;
  overlay.classList.remove("hidden");
}

function tap(i) {
  if (!accepting) return;
  blip(i);
  if (sequence[inputIndex] === i) {
    inputIndex++;
    if (inputIndex === sequence.length) {
      accepting = false;
      if (level > getNumber(BEST_KEY, 0)) setNumber(BEST_KEY, level);
      updateStats();
      msgEl.textContent = "Nice!";
      setTimeout(nextRound, 650);
    }
  } else {
    gameOver();
  }
}

pads.forEach((p) => p.addEventListener("pointerdown", () => tap(+p.dataset.i)));

window.addEventListener("keydown", (e) => {
  const i = ["1", "2", "3", "4"].indexOf(e.key);
  if (i >= 0) tap(i);
});

document.getElementById("start").addEventListener("click", newGame);
document.getElementById("again").addEventListener("click", newGame);
document.getElementById("reset").addEventListener("click", () => {
  if (confirm("Clear Simon best level?")) {
    remove(BEST_KEY);
    updateStats();
  }
});

gen = 0;
sequence = [];
level = 0;
accepting = false;
updateStats();
