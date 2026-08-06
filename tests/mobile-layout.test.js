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

test("手機版主要 panel 不重複加入水平間距", () => {
  const mobileOverrides = css.match(/@media \(max-width: 679px\) \{([\s\S]*)\}\s*$/)?.[1] ?? "";

  for (const panelId of ["itineraryPanel", "bookingsPanel", "todosPanel", "expensesPanel"]) {
    const panelRules = [...mobileOverrides.matchAll(new RegExp(`#${panelId}\\s*\\{([^}]*)\\}`, "g"))]
      .map((match) => match[1])
      .join("\n");
    assert.doesNotMatch(
      panelRules,
      /padding-inline\s*:/,
      `#${panelId} 不應在手機覆寫中額外加入水平間距`,
    );
  }
});

test("主要按鈕保持至少 44px 的觸控高度", () => {
  assert.match(css, /\.primary-button\s*\{[^}]*min-height:\s*44px/);
});
