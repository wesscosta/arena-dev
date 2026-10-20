import assert from "node:assert/strict";
import test from "node:test";
import { blockOutsideEditable, isEditableTarget } from "../lib/copy-protection";

function target(insideEditable: boolean) {
  return { closest: (selector: string) => (insideEditable && selector.includes("textarea") ? {} : null) };
}

function attempt(eventTarget: unknown) {
  let prevented = false;
  blockOutsideEditable({ target: eventTarget, preventDefault: () => { prevented = true; } });
  return prevented;
}

test("copying, cutting or right-clicking reader text is blocked", () => {
  assert.equal(attempt(target(false)), true);
});

test("a field the student types into keeps copy and paste", () => {
  assert.equal(attempt(target(true)), false);
  assert.equal(isEditableTarget(target(true)), true);
});

test("a non-element target such as a text node is still blocked", () => {
  assert.equal(attempt({}), true);
  assert.equal(attempt(null), true);
});
