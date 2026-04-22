// public/sw.js
// VaccinationBD Centers — Service Worker v2
//
// Cache strategies:
//   /_next/static/*          → Cache-first  (immutable hashed assets)
//   /icons/*, /offline.html  → Cache-first  (static public assets)
//   Google Maps tiles/API    → Cache-first  (stale-while-revalidate, 7d TTL)
//   /api/*                   → Network-first, NO cache fallback (data freshness)
//   Navigation (HTML)        → Network-first, fallback to cached shell → /offline.html
//
// Background Sync:
//   Tag "vaccination-sync"   → reads IDB pending_vaccinations, retries POST
//   Tag "checkin-sync"       → reads IDB pending_checkins, retries POST
//   Tag "token-sync"         → reads IDB pending_tokens, retries POST

const CACHE_STATIC  = "vcbd-static-v2";
const CACHE_PAGES   = "vcbd-pages-v2";
const CACHE_MAPS    = "vcbd-maps-v2";
const ALL_CACHES    = [CACHE_STATIC, CACHE_PAGES, CACHE_MAPS];

// App shell pages to pre-cache on install
const SHELL_URLS = [
  "/worker/dashboard",
  "/worker/record-vaccination",
  "/worker/queue",
  "/worker/appointments",
  "/offline.html",
];

// IDB constants (must match lib/constants — duplicated here, no import in SW)
const IDB_NAME    = "vcbd_centers_idb";
const IDB_VERSION = 2;
const STORE_MAP   = {
  "vaccination-sync": { store: "pending_vaccinations", api: "/api/worker/vaccination/record" },
  "checkin-sync":     { store: "pending_checkins",     api: "/api/worker/appointments" },
  "token-sync":       { store: "pending_tokens",       api: "/api/worker/queue/token" },
};

// ── IDB helpers (raw IDB — no idb library in SW context) ─────────────────────

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
    // If DB doesn't exist yet, upgrade creates stores — mirrors db.ts schema
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      for (const name of ["pending_vaccinations", "pending_checkins", "pending_tokens"]) {
        if (!db.objectStoreNames.contains(name)) {
          const s = db.createObjectStore(name, { keyPath: "id" });
          s.createIndex("status",    "status",    { unique: false });
          s.createIndex("timestamp", "timestamp", { unique: false });
        }
      }
    };
  });
}

function idbGetAllPending(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(storeName, "readonly");
    const idx = tx.objectStore(storeName).index("status");
    const req = idx.getAll("pending");
    req.onsuccess = () => resolve(req.result.sort((a, b) => a.timestamp - b.timestamp));
    req.onerror   = () => reject(req.error);
  });
}

function idbDelete(db, storeName, id) {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(storeName, "readwrite");
    const req = tx.objectStore(storeName).delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

function idbPut(db, storeName, record) {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(storeName, "readwrite");
    const req = tx.objectStore(storeName).put(record);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

// ── Install ───────────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_PAGES);
      // Pre-cache shell pages — failures are non-fatal (pages may require auth)
      await Promise.allSettled(SHELL_URLS.map((url) => cache.add(url).catch(() => {})));
      await self.skipWaiting();
    })()
  );
});

// ── Activate ──────────────────────────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Delete old caches
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => !ALL_CACHES.includes(k)).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Non-GET: register background sync tag for failed POSTs to our API
  if (request.method === "POST" && url.origin === self.location.origin) {
    // Let the request through — background sync handles retry via IDB
    return;
  }

  if (request.method !== "GET") return;

  // ── Google Maps tiles & API ──────────────────────────────────────────────
  if (
    url.hostname.includes("maps.googleapis.com") ||
    url.hostname.includes("maps.gstatic.com")
  ) {
    event.respondWith(cacheFirstWithTTL(request, CACHE_MAPS, 7 * 24 * 60 * 60 * 1000));
    return;
  }

  // Only handle same-origin from here
  if (url.origin !== self.location.origin) return;

  // ── Next.js immutable static assets ─────────────────────────────────────
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, CACHE_STATIC));
    return;
  }

  // ── Public static assets ─────────────────────────────────────────────────
  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/screenshots/") ||
    url.pathname === "/offline.html" ||
    url.pathname === "/manifest.json" ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|ico|woff2?|css)$/)
  ) {
    event.respondWith(cacheFirst(request, CACHE_STATIC));
    return;
  }

  // ── API routes: network-only (never cache) ───────────────────────────────
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkOnly(request));
    return;
  }

  // ── Navigation / HTML: network-first, fallback to cached shell ───────────
  if (request.mode === "navigate") {
    event.respondWith(networkFirstWithShellFallback(request));
    return;
  }

  // Default: network-first
  event.respondWith(networkFirst(request, CACHE_PAGES));
});

// ── Caching strategies ────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Asset unavailable offline", { status: 503 });
  }
}

async function cacheFirstWithTTL(request, cacheName, ttlMs) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    const cachedDate = new Date(cached.headers.get("sw-cached-at") || 0);
    if (Date.now() - cachedDate.getTime() < ttlMs) return cached;
  }
  try {
    const response = await fetch(request);
    if (response.ok) {
      // Clone and add cache timestamp header
      const headers = new Headers(response.headers);
      headers.set("sw-cached-at", new Date().toISOString());
      const stamped = new Response(await response.clone().arrayBuffer(), {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
      cache.put(request, stamped);
    }
    return response;
  } catch {
    return cached || new Response("Maps unavailable offline", { status: 503 });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok && cacheName) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response("Offline", { status: 503 });
  }
}

async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch {
    return new Response(
      JSON.stringify({ error: "Offline — request queued for sync" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function networkFirstWithShellFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_PAGES);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Try exact URL match first
    const cached = await caches.match(request);
    if (cached) return cached;
    // Try matching the shell for this route
    const url = new URL(request.url);
    const shellRoutes = [
      "/worker/dashboard",
      "/worker/record-vaccination",
      "/worker/queue",
      "/worker/appointments",
    ];
    for (const shell of shellRoutes) {
      if (url.pathname.startsWith(shell)) {
        const shellCache = await caches.match(shell);
        if (shellCache) return shellCache;
      }
    }
    // Final fallback
    const offline = await caches.match("/offline.html");
    return offline || new Response("Offline", { status: 503, headers: { "Content-Type": "text/html" } });
  }
}

// ── Background Sync ───────────────────────────────────────────────────────────

self.addEventListener("sync", (event) => {
  const mapping = STORE_MAP[event.tag];
  if (!mapping) return;

  event.waitUntil(
    syncStore(mapping.store, mapping.api, event.tag)
  );
});

async function syncStore(storeName, apiPath, tag) {
  let db;
  try {
    db = await openIDB();
  } catch {
    return; // IDB not available — skip
  }

  const pending = await idbGetAllPending(db, storeName);
  if (pending.length === 0) return;

  let synced = 0;
  let failed = 0;
  let conflicts = 0;

  for (const record of pending) {
    try {
      const res = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record.payload),
      });

      if (res.ok) {
        await idbDelete(db, storeName, record.id);
        synced++;
        continue;
      }

      const body = await res.json().catch(() => ({}));

      if (res.status === 409) {
        await idbPut(db, storeName, {
          ...record,
          status: "conflict",
          retryCount: (record.retryCount || 0) + 1,
          lastError: body.error || "Conflict",
          conflictServerVersion: body.serverVersion || body,
        });
        conflicts++;
        continue;
      }

      if (res.status >= 400 && res.status < 500) {
        // Unrecoverable — mark failed
        await idbPut(db, storeName, {
          ...record,
          status: "failed",
          retryCount: (record.retryCount || 0) + 1,
          lastError: body.error || `HTTP ${res.status}`,
        });
        failed++;
        continue;
      }

      // 5xx — leave as pending, Background Sync will retry
      await idbPut(db, storeName, {
        ...record,
        status: "pending",
        retryCount: (record.retryCount || 0) + 1,
        lastError: `HTTP ${res.status}`,
      });

    } catch {
      // Network error — leave as pending for next sync event
    }
  }

  // Notify all open clients of sync result
  const clients = await self.clients.matchAll({ type: "window" });
  clients.forEach((client) =>
    client.postMessage({
      type: "SYNC_COMPLETE",
      tag,
      synced,
      failed,
      conflicts,
    })
  );
}

// ── Push Notifications ────────────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "VaccinationBD", body: event.data.text() };
  }

  const { title = "VaccinationBD Centers", body = "", icon, badge, tag, url, data } = payload;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon:  icon  || "/icons/icon-192.png",
      badge: badge || "/icons/icon-96.png",
      tag:   tag   || "vcbd-notification",
      data:  { url: url || "/worker/dashboard", ...data },
      vibrate: [200, 100, 200],
      requireInteraction: payload.requireInteraction || false,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/worker/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Focus existing window if open
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      // Open new window
      return self.clients.openWindow(targetUrl);
    })
  );
});

// ── Messages from app ─────────────────────────────────────────────────────────

self.addEventListener("message", (event) => {
  const { type } = event.data || {};

  if (type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  if (type === "SYNC_PENDING") {
    // App came online — trigger background sync for all tags
    for (const tag of Object.keys(STORE_MAP)) {
      self.registration.sync?.register(tag).catch(() => {
        // Background Sync not supported — relay SYNC_NOW to clients
        self.clients.matchAll({ type: "window" }).then((clients) =>
          clients.forEach((c) => c.postMessage({ type: "SYNC_NOW" }))
        );
      });
    }
    return;
  }

  if (type === "CACHE_URLS") {
    // Proactively cache a list of URLs sent from the app
    const urls = event.data.urls || [];
    event.waitUntil(
      caches.open(CACHE_PAGES).then((cache) =>
        Promise.allSettled(urls.map((u) => cache.add(u).catch(() => {})))
      )
    );
  }
});

// ── Periodic Background Sync ──────────────────────────────────────────────────

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "vcbd-sync") {
    event.waitUntil(
      Promise.all(
        Object.entries(STORE_MAP).map(([, { store, api }]) => syncStore(store, api, "vcbd-sync"))
      )
    );
  }
});
