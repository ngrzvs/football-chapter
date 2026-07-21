const CACHE = "football-chapter-v1";
const SHELL = ["/", "/index.html", "/manifest.webmanifest", "/icon.svg", "/maskable-icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

function openQueue() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("football-chapter-sync", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("runs", { keyPath: "id", autoIncrement: true });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function queueRun(request) {
  const db = await openQueue();
  const record = { url: request.url, body: await request.clone().text(), headers: [...request.headers], createdAt: Date.now() };
  await new Promise((resolve, reject) => {
    const tx = db.transaction("runs", "readwrite");
    tx.objectStore("runs").add(record);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function flushRuns() {
  const db = await openQueue();
  const records = await new Promise((resolve, reject) => {
    const tx = db.transaction("runs", "readonly");
    const request = tx.objectStore("runs").getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  for (const record of records) {
    const response = await fetch(record.url, { method: "POST", headers: record.headers, body: record.body });
    if (response.ok) {
      await new Promise((resolve, reject) => {
        const tx = db.transaction("runs", "readwrite");
        tx.objectStore("runs").delete(record.id);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    }
  }
}

self.addEventListener("sync", (event) => {
  if (event.tag === "football-chapter-runs") event.waitUntil(flushRuns());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method === "POST" && /\/api\/challenges\/[^/]+\/runs$/.test(url.pathname)) {
    event.respondWith(fetch(request.clone()).catch(async () => {
      await queueRun(request);
      if (self.registration.sync) await self.registration.sync.register("football-chapter-runs");
      return new Response(JSON.stringify({ queued: true }), { status: 202, headers: { "Content-Type": "application/json" } });
    }));
    return;
  }
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (response.ok) caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
    return response;
  }).catch(() => request.mode === "navigate" ? caches.match("/index.html") : cached)));
});
