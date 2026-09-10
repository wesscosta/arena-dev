import assert from "node:assert/strict";
import test from "node:test";
import {
  wordCloudFontSize,
  wordCloudStatusLabel,
} from "../lib/word-cloud-visual";

test("scales repeated terms above less frequent terms", () => {
  const once = wordCloudFontSize(1, 5);
  const twice = wordCloudFontSize(2, 5);
  const five = wordCloudFontSize(5, 5);

  assert.ok(once < twice);
  assert.ok(twice < five);
  assert.equal(five, 112);
});

test("keeps equal-frequency clouds readable without making every word huge", () => {
  assert.equal(wordCloudFontSize(1, 1), 51);
});

test("maps word cloud states to projector labels", () => {
  assert.equal(wordCloudStatusLabel("COLLECTING"), "Coletando");
  assert.equal(wordCloudStatusLabel("REVEALED"), "Revelada");
  assert.equal(wordCloudStatusLabel("CLOSED"), "Encerrada");
});
