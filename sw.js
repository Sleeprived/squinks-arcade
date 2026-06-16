/* Squinks Arcade root service worker.
 *
 * INSTALL precaches the app shell + every game's lightweight shell (HTML/CSS/JS
 * and icons) so every game loads offline immediately after one arcade load.
 *
 * FETCH uses NETWORK-FIRST for the app's own files: when online, a refresh
 * always fetches the latest from the network (so a fresh deploy shows up on the
 * next refresh) and the cache is refreshed in the background; when offline (or
 * the network fails), it falls back to the cached copy, so once loaded the
 * arcade keeps working with no internet. Navigations fall back to the cached
 * hub when offline and uncached.
 *
 * Chess's heavy engine (~38 MB NNUE + wasm under games/chess/vendor/) is the one
 * exception: it stays CACHE-FIRST so it is never re-downloaded once cached, and
 * it is not precached (it is fetched the first time chess is opened).
 *
 * The precache is tolerant: each entry is added independently, so one missing
 * file never sinks the install or kills offline. The cache name carries a
 * version; bumping it + skipWaiting + clients.claim retires stale caches, and
 * the hub reloads once when a new worker takes control so worker updates apply
 * without a manual cache clear.
 *
 * All paths are RELATIVE so the SW scope is the deployed subpath (works at a
 * GitHub Pages project URL, not just localhost root).
 */

const CACHE = "squinks-v4";

const PRECACHE = [
  ".",
  "index.html",
  "manifest.webmanifest",
  "css/themes.css",
  "css/base.css",
  "js/storage.js",
  "js/theme.js",
  "js/games.js",
  "js/cards.js",
  "js/hub.js",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon-180.png",
  "games/snake/index.html",
  "games/snake/game.js",
  "games/snake/game.css",
  "games/2048/index.html",
  "games/2048/game.js",
  "games/2048/game.css",
  "games/tetris/index.html",
  "games/tetris/game.js",
  "games/tetris/game.css",
  "games/minesweeper/index.html",
  "games/minesweeper/game.js",
  "games/minesweeper/game.css",
  "games/connect4/index.html",
  "games/connect4/game.js",
  "games/connect4/game.css",
  "games/doodle/index.html",
  "games/doodle/game.js",
  "games/doodle/game.css",
  "games/blackjack/index.html",
  "games/blackjack/game.js",
  "games/blackjack/game.css",
  "games/videopoker/index.html",
  "games/videopoker/game.js",
  "games/videopoker/game.css",
  "games/chess/index.html",
  "games/chess/app.js",
  "games/chess/style.css",
  "js/arcade-engine.js",
  "js/shooter.js",
  "games/muncher/index.html",
  "games/muncher/game.js",
  "games/muncher/game.css",
  "games/stardivers/index.html",
  "games/stardivers/game.js",
  "games/stardivers/game.css",
  "games/twintalon/index.html",
  "games/twintalon/game.js",
  "games/twintalon/game.css",
  "games/breakout/index.html",
  "games/breakout/game.js",
  "games/breakout/game.css",
  "games/asteroids/index.html",
  "games/asteroids/game.js",
  "games/asteroids/game.css",
  "games/puzzle15/index.html",
  "games/puzzle15/game.js",
  "games/puzzle15/game.css",
  "games/reversi/index.html",
  "games/reversi/game.js",
  "games/reversi/game.css",
  "games/simon/index.html",
  "games/simon/game.js",
  "games/simon/game.css",
  "games/whack/index.html",
  "games/whack/game.js",
  "games/whack/game.css",
  "games/roulette/index.html",
  "games/roulette/game.js",
  "games/roulette/game.css",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // Tolerant precache: add each entry on its own so one 404 can't fail all.
      await Promise.allSettled(PRECACHE.map((url) => cache.add(url)));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

async function putInCache(request, response) {
  if (response && response.status === 200) {
    const cache = await caches.open(CACHE);
    cache.put(request, response.clone()).catch(() => {});
  }
}

// Cache-first: only for chess's heavy, immutable vendor files.
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const resp = await fetch(request);
    await putInCache(request, resp);
    return resp;
  } catch {
    return Response.error();
  }
}

// Network-first: latest when online, cached copy when offline.
async function networkFirst(request) {
  try {
    const resp = await fetch(request);
    await putInCache(request, resp);
    return resp;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === "navigate") {
      const fallback = await caches.match("index.html");
      if (fallback) return fallback;
    }
    return Response.error();
  }
}

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // let cross-origin pass through

  if (url.pathname.includes("/games/chess/vendor/")) {
    e.respondWith(cacheFirst(e.request));
  } else {
    e.respondWith(networkFirst(e.request));
  }
});
