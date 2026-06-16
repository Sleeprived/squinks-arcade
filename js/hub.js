import { GAMES, CATEGORIES } from "./games.js";
import { getNumber, clearAllArcadeData } from "./storage.js";
import { THEMES, getTheme, setTheme, initTheme } from "./theme.js";

initTheme();

const g = (key) => getNumber(key, null);

const grid = document.getElementById("grid");
const tiles = [];
for (const game of GAMES) {
  const a = document.createElement("a");
  a.className = "tile";
  a.href = `games/${game.id}/`;
  a.dataset.category = game.category;

  const badge = document.createElement("div");
  badge.className = "badge";
  badge.textContent = game.abbr;

  const name = document.createElement("div");
  name.className = "name";
  name.textContent = game.name;

  const stat = document.createElement("div");
  stat.className = "stat";
  const val = game.read(g);
  stat.textContent = game.label ? `${game.label}: ${val}` : String(val);

  a.append(badge, name, stat);
  grid.appendChild(a);
  tiles.push(a);
}

// ---- category filter ----
const filterBar = document.getElementById("filter");
let active = "All";

function applyFilter() {
  for (const tile of tiles) {
    tile.classList.toggle("hidden", active !== "All" && tile.dataset.category !== active);
  }
  for (const chip of filterBar.children) {
    chip.classList.toggle("active", chip.dataset.cat === active);
  }
}

for (const cat of ["All", ...CATEGORIES]) {
  const chip = document.createElement("button");
  chip.className = "chip";
  chip.type = "button";
  chip.dataset.cat = cat;
  chip.textContent = cat;
  chip.addEventListener("click", () => {
    active = cat;
    applyFilter();
  });
  filterBar.appendChild(chip);
}
applyFilter();

const sel = document.getElementById("theme");
for (const t of THEMES) {
  const o = document.createElement("option");
  o.value = t.id;
  o.textContent = t.label;
  sel.appendChild(o);
}
sel.value = getTheme();
sel.addEventListener("change", () => setTheme(sel.value));

document.getElementById("reset-all").addEventListener("click", () => {
  if (confirm("Reset ALL arcade data? This clears every high score, bankroll and the saved theme.")) {
    clearAllArcadeData();
    location.reload();
  }
});

if ("serviceWorker" in navigator) {
  // When a NEW worker takes control (an update shipped), reload once so a normal
  // refresh after a deploy shows the latest. Guarded two ways: skip the very
  // first install (its initial claim also fires controllerchange — no reload
  // wanted there), and a one-shot flag so it can never loop.
  const hadController = !!navigator.serviceWorker.controller;
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing || !hadController) return;
    refreshing = true;
    location.reload();
  });
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
