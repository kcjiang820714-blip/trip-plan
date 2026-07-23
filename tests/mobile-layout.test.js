import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

test("手機版設計 token 與底部安全區存在", () => {
  assert.match(css, /--color-bg:\s*#F7F4EF/);
  assert.match(css, /--space-4:\s*16px/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /@media \(min-width: 680px\)/);
});
