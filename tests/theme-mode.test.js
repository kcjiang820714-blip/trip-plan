import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const htmlSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");

function functionSource(name) {
  const start = appSource.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `找不到 ${name}，主題行為尚未實作`);
  const bodyStart = appSource.indexOf("{", start);
  let depth = 0;

  for (let index = bodyStart; index < appSource.length; index += 1) {
    if (appSource[index] === "{") depth += 1;
    if (appSource[index] === "}") depth -= 1;
    if (depth === 0) return appSource.slice(start, index + 1);
  }

  throw new Error(`${name} 函式不完整`);
}

class FakeElement {
  constructor() {
    this.attributes = new Map();
    this.dataset = {};
    this.style = {};
    this.textContent = "";
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }
}

function createStorage(initialValue = null) {
  let value = initialValue;
  return {
    getItem: () => value,
    setItem: (_key, nextValue) => {
      value = String(nextValue);
    }
  };
}

function loadThemeHelpers({ prefersDark = false, storage = createStorage() } = {}) {
  const mediaQuery = {
    matches: prefersDark,
    listeners: [],
    addEventListener(type, listener) {
      if (type === "change") this.listeners.push(listener);
    }
  };
  const document = { documentElement: new FakeElement() };
  const themeToggleButton = new FakeElement();
  const themeToggleIcon = new FakeElement();
  const themeToggleText = new FakeElement();
  const themeColorMeta = new FakeElement();
  const source = [
    "const THEME_PREFERENCE_KEY = 'trip-notebook-theme-preference-v1';",
    "const LIGHT_THEME_COLOR = '#f4f1ea';",
    "const DARK_THEME_COLOR = '#111a18';",
    ...["readThemePreference", "systemTheme", "resolveTheme", "updateThemeToggle", "applyTheme", "setThemePreference", "toggleTheme", "initializeTheme"].map(functionSource),
    "return { readThemePreference, resolveTheme, applyTheme, setThemePreference, toggleTheme, initializeTheme };"
  ].join("\n");
  const helpers = new Function(
    "window",
    "document",
    "localStorage",
    "themeToggleButton",
    "themeToggleIcon",
    "themeToggleText",
    "themeColorMeta",
    source
  )(
    { matchMedia: () => mediaQuery },
    document,
    storage,
    themeToggleButton,
    themeToggleIcon,
    themeToggleText,
    themeColorMeta
  );

  return { ...helpers, document, storage, mediaQuery, themeToggleButton, themeToggleIcon, themeToggleText, themeColorMeta };
}

function prepaintThemeScript() {
  const script = [...htmlSource.matchAll(/<script>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1])
    .find((source) => source.includes("trip-notebook-theme-preference-v1"));
  assert.ok(script, "首次繪製前必須有主題啟動程式");
  return script;
}

test("無手動偏好時依系統設定解析主題，並忽略無效偏好", () => {
  const darkSystem = loadThemeHelpers({ prefersDark: true, storage: createStorage("sepia") });
  assert.equal(darkSystem.readThemePreference(), null);
  assert.equal(darkSystem.resolveTheme(null), "dark");
  assert.equal(darkSystem.resolveTheme("light"), "light");
});

test("切換主題會保存偏好並更新可讀取的按鈕狀態", () => {
  const theme = loadThemeHelpers();
  theme.applyTheme("dark");
  assert.equal(theme.document.documentElement.dataset.theme, "dark");
  assert.equal(theme.themeColorMeta.getAttribute("content"), "#111a18");
  assert.equal(theme.themeToggleButton.getAttribute("aria-pressed"), "true");
  assert.match(theme.themeToggleButton.getAttribute("aria-label"), /淺色/);

  theme.toggleTheme();
  assert.equal(theme.document.documentElement.dataset.theme, "light");
  assert.equal(theme.storage.getItem("trip-notebook-theme-preference-v1"), "light");
  assert.equal(theme.themeToggleButton.getAttribute("aria-pressed"), "false");
});

test("首次繪製前的啟動程式會立即套用儲存偏好或系統主題", () => {
  const root = new FakeElement();
  const storage = createStorage("light");
  new Function("document", "localStorage", "window", prepaintThemeScript())(
    { documentElement: root },
    storage,
    { matchMedia: () => ({ matches: true }) }
  );
  assert.equal(root.dataset.theme, "light");
  assert.equal(root.style.colorScheme, "light");
});

test("全域主題按鈕具備可讀取名稱與狀態", () => {
  const button = htmlSource.match(/<button\s+class="theme-toggle"\s+id="themeToggleButton"[\s\S]*?<\/button>/)?.[0] || "";
  assert.match(button, /type="button"/);
  assert.match(button, /aria-pressed="false"/);
  assert.match(button, /aria-label="切換為深色模式"/);
  assert.match(button, /id="themeToggleIcon"/);
  assert.match(button, /id="themeToggleText"/);
});

test("儲存偏好失敗時仍切換畫面，且系統變更只影響沒有手動偏好的主題", () => {
  const unavailableStorage = {
    getItem: () => null,
    setItem: () => {
      throw new Error("storage unavailable");
    }
  };
  const transientTheme = loadThemeHelpers({ storage: unavailableStorage });
  assert.doesNotThrow(() => transientTheme.toggleTheme());
  assert.equal(transientTheme.document.documentElement.dataset.theme, "dark");
  assert.equal(transientTheme.themeToggleButton.getAttribute("aria-pressed"), "true");
  assert.match(transientTheme.themeToggleButton.getAttribute("aria-label"), /淺色/);

  const systemTheme = loadThemeHelpers();
  systemTheme.initializeTheme();
  assert.equal(systemTheme.mediaQuery.listeners.length, 1);
  systemTheme.mediaQuery.listeners[0]({ matches: true });
  assert.equal(systemTheme.document.documentElement.dataset.theme, "dark");

  const manualLightTheme = loadThemeHelpers({ storage: createStorage("light") });
  manualLightTheme.initializeTheme();
  manualLightTheme.mediaQuery.listeners[0]({ matches: true });
  assert.equal(manualLightTheme.document.documentElement.dataset.theme, "light");
});

test("主程式會綁定切換 click，prepaint 在 CSS 前且涵蓋系統深色", () => {
  assert.match(appSource, /themeToggleButton\?\.addEventListener\("click", toggleTheme\);/);
  assert.match(htmlSource, /<meta name="theme-color" id="themeColorMeta" content="#[0-9a-f]+" \/>/i);
  assert.ok(
    htmlSource.indexOf(prepaintThemeScript()) < htmlSource.indexOf('<link rel="stylesheet" href="./styles.css'),
    "prepaint script 必須在 stylesheet link 之前執行"
  );

  const root = new FakeElement();
  new Function("document", "localStorage", "window", prepaintThemeScript())(
    { documentElement: root },
    createStorage(),
    { matchMedia: () => ({ matches: true }) }
  );
  assert.equal(root.dataset.theme, "dark");
  assert.equal(root.style.colorScheme, "dark");
});
