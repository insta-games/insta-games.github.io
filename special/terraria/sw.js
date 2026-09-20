self.addEventListener("fetch", (event) => {
  event.respondWith(
    (async () => {
      try {
        const scopeUrl = new URL(self.registration.scope);
        const reqUrl = new URL(event.request.url);
        if (reqUrl.pathname === scopeUrl.pathname || reqUrl.pathname === scopeUrl.pathname + "index.html") {
          maybeFlushCache();
        }
        let res = await caches.match(event.request);
        if (!res) {
          res = await fetch(event.request);
        }
        if (res) {
          let headers = new Headers(res.headers);
          if (headers.get("Cross-Origin-Embedder-Policy") !== "require-corp")
            headers.set("Cross-Origin-Embedder-Policy", "require-corp");
          if (headers.get("Cross-Origin-Opener-Policy") !== "same-origin")
            headers.set("Cross-Origin-Opener-Policy", "same-origin");

          return new Response(res.body, {
            status: res.status,
            statusText: res.statusText,
            headers: headers,
          });
        }
        return res;
      } catch (e) {
        console.log("sw fetch error:", e);
        return new Response("Worker error: " + e, {
          status: 500,
          statusText: "Network error",
        });
      }
    })(),
  );
});

async function installCache() {
  const cache = await caches.open("v1");
  const bootUrl = new URL("./_framework/blazor.boot.json", self.location.href).href;
  const boot = await fetch(bootUrl);
  const bootjson = await boot.json();
  let resources = [
    new URL("./", self.location.href).href,
    new URL("./MILESTONE", self.location.href).href,
    bootUrl,
    new URL("./app.ico", self.location.href).href,
    new URL("./backdrop.png", self.location.href).href,
    new URL("./AndyBold.ttf", self.location.href).href,
    new URL("./assets/index.js", self.location.href).href,
    new URL("./assets/index.css", self.location.href).href,
    ...Object.keys(bootjson.resources.fingerprinting).map(
      (r) => new URL("./_framework/" + r, self.location.href).href,
    ),
  ];
  await cache.addAll(resources);
}

self.addEventListener("install", (event) => {
  event.waitUntil(installCache());
  console.log("terraria cache installed");
});

async function maybeFlushCache() {
  try {
    const milestoneUrl = new URL("./MILESTONE", self.location.href).href;
    const cachedmilestone = await caches.match(milestoneUrl);
    const response = await fetch(milestoneUrl);
    const milestone = await response.text();
    if (cachedmilestone) {
      const cachedmilestoneText = await cachedmilestone.text();
      if (cachedmilestoneText === milestone) {
        console.log("terraria cache up to date");
        return;
      }
    }

    caches.keys().then((cacheNames) => {
      console.log("flushing terraria cache");
      return Promise.all(cacheNames.map((name) => caches.delete(name)));
    });
  } catch (e) {
    console.warn("maybeFlushCache error:", e);
  }
}

self.addEventListener("activate", (event) => {
  event.waitUntil(maybeFlushCache());
});
