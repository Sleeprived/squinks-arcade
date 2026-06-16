import { getNumber, setNumber, remove } from "../../js/storage.js";

const BEST_KEY = "squinks.whack.best";
const ROUND = 30; // seconds
const HIT = 10;

const holes = [...document.querySelectorAll(".hole")];
const scoreEl = document.getElementById("score");
const timeEl = document.getElementById("time");
const bestEl = document.getElementById("best");
const msgEl = document.getElementById("msg");
const overlay = document.getElementById("over");
const overMsg = document.getElementById("over-msg");

let running, score, timeLeft;
let timerId = null, popId = null;
const moleTimers = new Array(holes.length).fill(null);

function updateStats() {
  scoreEl.textContent = score;
  timeEl.textContent = timeLeft;
  bestEl.textContent = getNumber(BEST_KEY, 0);
}

function setMole(i, up) {
  holes[i].classList.toggle("up", up);
  if (!up && moleTimers[i]) {
    clearTimeout(moleTimers[i]);
    moleTimers[i] = null;
  }
}

function clearAllTimers() {
  if (timerId) clearInterval(timerId);
  if (popId) clearTimeout(popId);
  timerId = popId = null;
  for (let i = 0; i < holes.length; i++) setMole(i, false);
}

function popOne() {
  const free = [];
  for (let i = 0; i < holes.length; i++) if (!holes[i].classList.contains("up")) free.push(i);
  if (free.length === 0) return;
  const i = free[Math.floor(Math.random() * free.length)];
  holes[i].classList.add("up");
  const elapsed = ROUND - timeLeft;
  const upTime = Math.max(550, 1200 - elapsed * 22);
  moleTimers[i] = setTimeout(() => setMole(i, false), upTime);
}

function scheduleNextPop() {
  const elapsed = ROUND - timeLeft;
  const interval = Math.max(420, 1050 - elapsed * 20);
  popId = setTimeout(() => {
    if (!running) return;
    popOne();
    scheduleNextPop();
  }, interval);
}

function start() {
  clearAllTimers();
  running = true;
  score = 0;
  timeLeft = ROUND;
  overlay.classList.add("hidden");
  msgEl.textContent = "Go!";
  updateStats();
  timerId = setInterval(() => {
    timeLeft--;
    if (timeLeft <= 0) {
      timeLeft = 0;
      updateStats();
      end();
      return;
    }
    updateStats();
  }, 1000);
  scheduleNextPop();
}

function end() {
  running = false;
  clearAllTimers();
  if (score > getNumber(BEST_KEY, 0)) setNumber(BEST_KEY, score);
  updateStats();
  overMsg.textContent = `Score ${score} · Best ${getNumber(BEST_KEY, 0)}`;
  overlay.classList.remove("hidden");
}

function whack(i) {
  if (!running) return;
  if (!holes[i].classList.contains("up")) return;
  setMole(i, false);
  score += HIT;
  updateStats();
}

holes.forEach((h) =>
  h.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    whack(+h.dataset.i);
  })
);

document.getElementById("start").addEventListener("click", start);
document.getElementById("again").addEventListener("click", start);
document.getElementById("reset").addEventListener("click", () => {
  if (confirm("Clear Whack-a-Mole best score?")) {
    remove(BEST_KEY);
    updateStats();
  }
});

// init (idle, waiting for Start)
running = false;
score = 0;
timeLeft = ROUND;
updateStats();
