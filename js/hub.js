import { GAMES } from "./games.js";
import { getNumber, clearAllArcadeData } from "./storage.js";
import { THEMES, getTheme, setTheme, initTheme } from "./theme.js";

initTheme();

const g = (key) => getNumber(key, null);

const grid = document.getElementById("grid");
for (const game of GAMES) {
  const a = document.createElement("a");
  a.className = "tile";
  a.href = `games/${game.id}/`;

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
}

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
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
