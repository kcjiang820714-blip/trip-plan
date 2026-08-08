import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const htmlSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const cssSource = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const serviceWorkerSource = readFileSync(new URL("../sw.js", import.meta.url), "utf8");

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

test("深色模式 CSS 與 HTML 更新會提升 PWA 快取世代", () => {
  const styleVersion = htmlSource.match(/<link rel="stylesheet" href="\.\/styles\.css\?v=(\d+)"/)?.[1];
  const appVersion = htmlSource.match(/<script src="\.\/app\.js\?v=(\d+)"/)?.[1];

  assert.equal(styleVersion, appVersion, "HTML 的 CSS 與 app 資產必須使用同一快取世代");
  assert.ok(Number(appVersion) > 159, "新增深色模式 CSS/HTML 後必須提高 PWA 快取版本");
  assert.match(appSource, new RegExp(`register\\("\\./sw\\.js\\?v=${appVersion}"\\)`));
  assert.match(serviceWorkerSource, new RegExp(`const CACHE_NAME = "trip-notebook-v${appVersion}"`));
  assert.match(serviceWorkerSource, new RegExp(`"\\./styles\\.css\\?v=${styleVersion}"`));
  assert.match(serviceWorkerSource, new RegExp(`"\\./app\\.js\\?v=${appVersion}"`));
});

test("深色模式用完整 token、固定切換鈕與工具列安全空間呈現", () => {
  const darkTheme = cssSource.match(/html\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(darkTheme, /--bg:\s*#111a18;/i);
  assert.match(darkTheme, /--color-surface:\s*#172420;/i);
  assert.match(darkTheme, /--color-border:\s*#344640;/i);

  const toggle = cssSource.match(/\.theme-toggle\s*\{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(toggle, /position:\s*fixed;/);
  assert.match(toggle, /width:\s*44px;/);
  assert.match(toggle, /height:\s*44px;/);
  assert.match(toggle, /z-index:\s*80;/);

  assert.match(cssSource, /\.trip-appbar-actions\s*\{\s*margin-right:\s*56px;/);
});

test("深色同步遮罩與彈性景點卡不回退淺色，且列印持續白底", () => {
  const darkGate = cssSource.match(/html\[data-theme="dark"\]\s+\.sync-gate\s*\{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(darkGate, /background:\s*rgba\(17,\s*26,\s*24,\s*0\.96\);/);
  assert.match(cssSource, /\.sync-gate\s*\{[\s\S]*?z-index:\s*1000;/);

  const darkFlexibleStops = cssSource.match(/html\[data-theme="dark"\]\s+\.flexible-stop-editor,\s*\nhtml\[data-theme="dark"\]\s+\.flexible-stop\s*\{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(darkFlexibleStops, /border-color:\s*var\(--color-border\);/);
  assert.match(darkFlexibleStops, /background:\s*var\(--color-surface\);/);

  const printCss = cssSource.match(/@media print\s*\{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(printCss, /background:\s*white\s*!important;/);
});

function relativeLuminance(hex) {
  const channels = hex.match(/[a-f\d]{2}/gi).map((channel) => Number.parseInt(channel, 16) / 255);
  const linear = channels.map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function contrastRatio(foreground, background) {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

test("深色主題的白字按鈕與標籤背景 token 至少有 4.5:1 對比", () => {
  const darkTheme = cssSource.match(/html\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/)?.[1] || "";
  for (const token of ["brand", "brand-dark", "color-primary", "color-primary-strong"]) {
    const value = darkTheme.match(new RegExp(`--${token}:\\s*(#[a-f\\d]{6});`, "i"))?.[1];
    assert.ok(value, `缺少 --${token} 深色 token`);
    assert.ok(
      contrastRatio("#ffffff", value) >= 4.5,
      `白字搭配 --${token}（${value}）必須至少有 4.5:1 對比`,
    );
  }
});

test("手機 app bar 在內部保留固定主題鈕安全區，桌機才使用右外距", () => {
  const mobileAppBar = cssSource.match(/#tripView\[data-active-section\]\s+\.trip-appbar\s*\{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(mobileAppBar, /grid-template-columns:\s*44px\s+minmax\(0,\s*1fr\)\s+44px;/);
  assert.match(mobileAppBar, /padding-right:\s*64px;/);

  const mobileActions = cssSource.match(/#tripView\[data-active-section\]\s+\.trip-appbar-actions\s*\{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(mobileActions, /width:\s*44px;/);
  assert.match(mobileActions, /margin-right:\s*0;/);
  assert.match(cssSource, /\*\s*\{\s*box-sizing:\s*border-box;/);

  assert.match(cssSource, /@media \(min-width: 680px\)\s*\{\s*\.trip-appbar-actions\s*\{\s*margin-right:\s*56px;/);
  assert.doesNotMatch(cssSource, /\/\* Keep the app bar controls[\s\S]*?\.trip-appbar-actions\s*\{\s*margin-right:\s*56px;/);
});

test("手機預訂頁 app bar 的最後覆寫仍保留 64px 右側主題鈕安全區", () => {
  const selector = '#tripView[data-active-section="bookings"] .trip-appbar';
  const start = cssSource.lastIndexOf(`${selector} {`);
  assert.notEqual(start, -1, "缺少預訂頁 app bar 規則");
  const bodyStart = cssSource.indexOf("{", start);
  let depth = 0;
  let end = bodyStart;
  for (; end < cssSource.length; end += 1) {
    if (cssSource[end] === "{") depth += 1;
    if (cssSource[end] === "}") depth -= 1;
    if (depth === 0) break;
  }
  const bookingAppBar = cssSource.slice(start, end + 1);

  assert.match(bookingAppBar, /padding:\s*4px\s+64px\s+4px\s+4px;/);
  assert.doesNotMatch(bookingAppBar, /padding:\s*4px;/);
});
