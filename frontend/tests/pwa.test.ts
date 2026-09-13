import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const manifest = readFileSync(resolve(process.cwd(), "app/manifest.ts"), "utf8");
const layout = readFileSync(resolve(process.cwd(), "app/layout.tsx"), "utf8");
const runtime = readFileSync(resolve(process.cwd(), "components/PwaRuntime.tsx"), "utf8");
const worker = readFileSync(resolve(process.cwd(), "public/sw.js"), "utf8");

test("manifest makes the join experience installable", () => {
  assert.match(manifest, /start_url: "\/join"/);
  assert.match(manifest, /display: "standalone"/);
  assert.match(manifest, /192x192/);
  assert.match(manifest, /512x512/);
  assert.match(layout, /manifest: "\/manifest\.webmanifest"/);
});

test("service worker caches shell and static assets but never API domain state", () => {
  assert.match(worker, /arena-dev-shell-v0\.5-1/);
  assert.match(worker, /url\.pathname\.startsWith\("\/api\/"\)/);
  assert.match(worker, /if \(isDomainRequest\(url\)\) return/);
});

test("offline navigation falls back only to interface shell", () => {
  assert.match(worker, /caches\.match\("\/join"\)/);
  assert.match(worker, /caches\.match\("\/offline\.html"\)/);
  assert.match(worker, /request\.mode === "navigate"/);
});

test("client registers worker and treats installation as progressive enhancement", () => {
  assert.match(runtime, /navigator\.serviceWorker\.register\("\/sw\.js"/);
  assert.match(runtime, /beforeinstallprompt/);
  assert.match(runtime, /Instalar Arena Dev/);
});
