/* Theme switcher. Neon is default. The chosen theme is stored under
   squinks.theme and applied to <html data-theme>. A tiny inline script in each
   page <head> applies it before first paint (no flash); this module is the
   authoritative API used by the hub switcher. */

export const THEMES = [
  { id: "neon", label: "Neon Retro" },
  { id: "dark", label: "Clean Dark" },
  { id: "playful", label: "Bright & Playful" },
];

const KEY = "squinks.theme";
const IDS = THEMES.map((t) => t.id);

export function getTheme() {
  let t = null;
  try {
    t = localStorage.getItem(KEY);
  } catch {
    /* ignore */
  }
  return IDS.includes(t) ? t : "neon";
}

export function applyTheme(id) {
  const theme = IDS.includes(id) ? id : "neon";
  document.documentElement.dataset.theme = theme;
}

export function setTheme(id) {
  if (!IDS.includes(id)) return;
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* ignore */
  }
  applyTheme(id);
}

export function initTheme() {
  applyTheme(getTheme());
}
