/* Defensive localStorage helpers. Every arcade key is namespaced "squinks.".
   Reads tolerate a missing/corrupt store and fall back to a caller default, so
   a bad entry can never throw inside a game. */

const PREFIX = "squinks.";

export function getRaw(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function getNumber(key, def = null) {
  const raw = getRaw(key);
  if (raw === null) return def;
  const n = Number(raw);
  return Number.isFinite(n) ? n : def;
}

export function setNumber(key, val) {
  try {
    localStorage.setItem(key, String(val));
  } catch {
    /* storage full / blocked — ignore, gameplay continues */
  }
}

export function getJSON(key, def = null) {
  const raw = getRaw(key);
  if (raw === null) return def;
  try {
    return JSON.parse(raw);
  } catch {
    return def;
  }
}

export function setJSON(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    /* ignore */
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/* Wipe every squinks.* key (hub "reset all arcade data"). */
export function clearAllArcadeData() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
