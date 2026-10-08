import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const manifest = readFileSync(resolve(process.cwd(), "app/manifest.ts"), "utf8");
const layout = readFileSync(resolve(process.cwd(), "app/layout.tsx"), "utf8");
const runtime = readFileSync(resolve(process.cwd(), "components/PwaRuntime.tsx"), "utf8");
const worker = readFileSync(resolve(process.cwd(), "public/sw.js"), "utf8");
const dockerfile = readFileSync(resolve(process.cwd(), "Dockerfile"), "utf8");

test("manifest makes the join experience installable", () => {
  assert.match(manifest, /start_url: "\/join"/);
  assert.match(manifest, /display: "standalone"/);
  assert.match(manifest, /192x192/);
  assert.match(manifest, /512x512/);
  assert.match(layout, /manifest: "\/manifest\.webmanifest"/);
});

test("service worker caches shell and static assets but never API domain state", () => {
  assert.match(worker, /CACHE_PREFIX = "arena-dev-"/);
  assert.match(worker, /url\.pathname\.startsWith\("\/api\/"\)/);
  assert.match(worker, /if \(isDomainRequest\(url\)\) return/);
});

test("offline navigation falls back only to interface shell", () => {
  assert.match(worker, /cache\.match\(OFFLINE_PAGE\)/);
  assert.match(worker, /request\.mode === "navigate"/);
});

test("client registers worker and treats installation as progressive enhancement", () => {
  assert.match(runtime, /navigator\.serviceWorker[\s\S]*\.register\("\/sw\.js"/);
  assert.match(runtime, /updateViaCache: "none"/);
  assert.match(runtime, /result\.update\(\)/);
  assert.match(runtime, /beforeinstallprompt/);
  assert.match(runtime, /Instalar Arena Dev/);
});

test("v0.10 worker discards stale join HTML and only evicts its own caches", () => {
  assert.doesNotMatch(worker, /cache\.put\("\/join"/);
  assert.doesNotMatch(worker, /caches\.match\("\/join"\)/);
  assert.match(worker, /name\.startsWith\(CACHE_PREFIX\)/);
  assert.match(worker, /url\.pathname\.startsWith\("\/ws\/"\)/);
  assert.match(worker, /request\.mode === "navigate"/);
  assert.match(worker, /return await fetch\(request\)/);
  assert.match(runtime, /setUpdateAvailable\(true\)/);
  assert.match(runtime, /Conclua sua resposta antes de atualizar/);
  assert.doesNotMatch(runtime, /onControllerChange[\s\S]{0,180}location\.reload/);
});

test("production standalone image includes the service worker and offline assets", () => {
  assert.match(dockerfile, /COPY --from=build --chown=arena:arena \/app\/public \.\/public/);
  assert.match(dockerfile, /CMD \["node", "server\.js"\]/);
});
