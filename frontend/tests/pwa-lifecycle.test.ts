import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(resolve(process.cwd(), "public/sw.js"), "utf8");

function workerHarness() {
  type TaskEvent = { waitUntil?: (promise: Promise<unknown>) => void; request?: unknown;
    respondWith?: (promise: Promise<Response>) => void; data?: unknown; source?: { postMessage: (message: unknown) => void } };
  const handlers = new Map<string, (event: TaskEvent) => void>();
  const storage = new Map<string, Map<string, Response>>();
  const events: string[] = [];
  let offline = false;
  let networkCalls = 0;
  function open(name: string) {
    if (!storage.has(name)) storage.set(name, new Map());
    const items = storage.get(name)!;
    return { put: async (key: string | { url: string }, response: Response) => {
      items.set(typeof key === "string" ? key : key.url, response.clone());
    }, match: async (key: string | { url: string }) =>
      items.get(typeof key === "string" ? key : key.url)?.clone() };
  }
  const fakeFetch = async (request: string | { url: string }) => {
    networkCalls += 1;
    if (offline) throw new TypeError("Network unavailable");
    const path = typeof request === "string" ? request : request.url;
    return new Response(`NETWORK:${path}`, { status: 200, headers: { "Content-Type": "text/html" } });
  };
  const self = {
    location: { origin: "https://arena.test" },
    clients: { claim: async () => events.push("claim") },
    skipWaiting: async () => events.push("skipWaiting"),
    addEventListener: (type: string, handler: (event: TaskEvent) => void) => handlers.set(type, handler),
  };
  vm.runInNewContext(source, { self, caches: {
    open: async (name: string) => open(name),
    keys: async () => [...storage.keys()],
    delete: async (name: string) => storage.delete(name),
  }, fetch: fakeFetch, URL, Response, Promise, Set, Error, console });
  async function lifecycle(type: "install" | "activate") {
    let waiting: Promise<unknown> | undefined;
    handlers.get(type)!({ waitUntil: (promise) => { waiting = promise; } });
    await waiting;
  }
  async function intercept(url: string, method = "GET", mode = "navigate") {
    let responded: Promise<Response> | undefined;
    handlers.get("fetch")!({ request: { url, method, mode }, respondWith: (promise) => { responded = promise; } });
    return responded;
  }
  return { handlers, storage, open, lifecycle, intercept, events,
    setOffline: (value: boolean) => { offline = value; },
    networkCalls: () => networkCalls };
}

test("legacy cached join is deleted on current activation; only neutral offline page is served", async () => {
  const w = workerHarness();
  await (await w.open("arena-dev-shell-v0.8-join-fix-1")).put("/join",
    new Response("LEGACY_JOIN_HTML_AND_OLD_CHUNKS"));
  await (await w.open("arena-dev-static-v0.8-join-fix-1")).put("/_next/static/old.js",
    new Response("OLD_JAVASCRIPT"));
  await (await w.open("other-project-cache")).put("/other", new Response("KEEP"));
  await w.lifecycle("install");
  await w.lifecycle("activate");
  assert.equal(w.events.includes("skipWaiting"), true);
  assert.equal(w.events.includes("claim"), true);
  assert.equal(w.storage.has("arena-dev-shell-v0.8-join-fix-1"), false);
  assert.equal(w.storage.has("arena-dev-static-v0.8-join-fix-1"), false);
  assert.equal(w.storage.has("other-project-cache"), true);
  const newCache = [...w.storage.keys()].find((name) => name.startsWith("arena-dev-shell-v0.11-"));
  assert.ok(newCache);
  // 11.7: the new shell icons are precached with the current version.
  assert.equal(w.storage.get(newCache)?.has("/icons/arena-maskable-512.png"), true);
  assert.equal(w.storage.get(newCache)?.has("/join"), false);
  assert.equal(w.storage.get(newCache)?.has("/offline.html"), true);
  w.setOffline(true);
  const page = await w.intercept("https://arena.test/join?code=ABCD");
  assert.ok(page);
  const fallback = await page;
  assert.match(await fallback.text(), /NETWORK:\/offline\.html/);
  assert.equal((await w.intercept("https://arena.test/api/sessions/private")), undefined);
  assert.equal((await w.intercept("https://arena.test/ws/sessions/123")), undefined);
  assert.equal((await w.intercept("https://arena.test/api/score-events", "POST")), undefined);
  assert.equal(w.storage.get(newCache)?.has("/join"), false);
});

test("versioned immutable static files remain cache-first but domain requests never intercept", async () => {
  const w = workerHarness();
  await w.lifecycle("install");
  await w.lifecycle("activate");
  const asset = "https://arena.test/_next/static/chunks/hashed.js";
  const first = await w.intercept(asset, "GET", "no-cors");
  assert.equal(await (await first!)?.text(), `NETWORK:${asset}`);
  const before = w.networkCalls();
  w.setOffline(true);
  const cached = await w.intercept(asset, "GET", "no-cors");
  assert.equal(await (await cached!)?.text(), `NETWORK:${asset}`);
  assert.equal(w.networkCalls(), before);
  assert.equal(await w.intercept("https://different.test/_next/static/chunks/hashed.js"), undefined);
});
