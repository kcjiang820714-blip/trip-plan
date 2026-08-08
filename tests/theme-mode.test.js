import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const htmlSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const cssSource = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const serviceWorkerSource = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
const DARK_MODE_PWA_ASSET_VERSION = "162";

function functionSource(name) {
  const start = appSource.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `找不到 ${name}，主題行為尚未實作`);
  const signatureEnd = appSource.indexOf(") {", start);
  assert.notEqual(signatureEnd, -1, `${name} 函式簽名不完整`);
  const bodyStart = signatureEnd + 2;
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
    this.hidden = false;
    this.disabled = false;
    this.inert = false;
    this.focusCount = 0;
    this.classList = {
      toggle: () => {}
    };
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  toggleAttribute(name, force) {
    if (force) this.setAttribute(name, "");
    else this.removeAttribute(name);
  }

  focus() {
    this.focusCount += 1;
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

function loadSyncGateHarness() {
  const syncGate = new FakeElement();
  const appShell = new FakeElement();
  const themeToggleButton = new FakeElement();
  const syncGateCard = new FakeElement();
  const syncGateTitle = new FakeElement();
  const syncGateMessage = new FakeElement();
  const syncGateRetryButton = new FakeElement();
  const source = `${functionSource("setSyncGate")}\nreturn { setSyncGate };`;
  const helpers = new Function(
    "isReadonly",
    "syncGate",
    "appShell",
    "themeToggleButton",
    "syncGateCard",
    "syncGateTitle",
    "syncGateMessage",
    "syncGateRetryButton",
    "queueMicrotask",
    source
  )(
    false,
    syncGate,
    appShell,
    themeToggleButton,
    syncGateCard,
    syncGateTitle,
    syncGateMessage,
    syncGateRetryButton,
    (callback) => callback()
  );

  return {
    ...helpers,
    syncGate,
    appShell,
    themeToggleButton,
    syncGateCard,
    syncGateRetryButton
  };
}

function elementRangeById(id) {
  const openingPattern = new RegExp(`<([a-z][\\w-]*)\\b[^>]*\\bid=["']${id}["'][^>]*>`, "i");
  const opening = openingPattern.exec(htmlSource);
  assert.ok(opening, `找不到 #${id}`);
  const tagName = opening[1];
  const tagPattern = new RegExp(`<\\/?${tagName}\\b[^>]*>`, "gi");
  tagPattern.lastIndex = opening.index;
  let depth = 0;
  let tag;

  while ((tag = tagPattern.exec(htmlSource))) {
    if (tag[0].startsWith("</")) depth -= 1;
    else if (!tag[0].endsWith("/>")) depth += 1;
    if (depth === 0) return { start: opening.index, end: tagPattern.lastIndex };
  }

  throw new Error(`#${id} HTML 元素沒有正確關閉`);
}

function cssRuleForSelector(selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const selectorMatches = [...cssSource.matchAll(new RegExp(`${escapedSelector}\\s*(?:,|\\{)`, "g"))];
  const selectorIndex = selectorMatches.at(-1)?.index ?? -1;
  assert.notEqual(selectorIndex, -1, `找不到 CSS selector：${selector}`);
  const bodyStart = cssSource.indexOf("{", selectorIndex);
  assert.notEqual(bodyStart, -1, `${selector} 缺少規則內容`);
  let depth = 0;

  for (let index = bodyStart; index < cssSource.length; index += 1) {
    if (cssSource[index] === "{") depth += 1;
    if (cssSource[index] === "}") depth -= 1;
    if (depth === 0) {
      return {
        index: selectorIndex,
        body: cssSource.slice(bodyStart + 1, index)
      };
    }
  }

  throw new Error(`${selector} CSS 規則沒有正確關閉`);
}

function selectorSpecificity(selector) {
  const ids = (selector.match(/#[\\w-]+/g) || []).length;
  const classesAndAttributes = (selector.match(/\\.[\\w-]+|\\[[^\\]]+\\]|:(?!:)[\\w-]+/g) || []).length;
  const elements = (selector
    .replace(/#[\\w-]+|\\.[\\w-]+|\\[[^\\]]+\\]|::?[\\w-]+/g, " ")
    .match(/(?:^|[>+~\\s])([a-z][\\w-]*)/gi) || []).length;
  return [ids, classesAndAttributes, elements];
}

function compareSpecificity(left, right) {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
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
  assert.equal(appVersion, DARK_MODE_PWA_ASSET_VERSION, "深色模式 CSS/HTML 更新必須使用本次指定的 PWA 快取世代");
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

test("sync gate 開啟時主題鈕不可聚焦且從輔助閱讀隱藏，關閉後完整恢復", () => {
  const harness = loadSyncGateHarness();

  harness.setSyncGate({ phase: "loading" });
  assert.equal(harness.syncGate.hidden, false);
  assert.equal(harness.appShell.inert, true);
  assert.equal(harness.themeToggleButton.disabled, true);
  assert.equal(harness.themeToggleButton.inert, true);
  assert.equal(harness.themeToggleButton.getAttribute("aria-hidden"), "true");
  assert.equal(harness.syncGateCard.focusCount, 1);

  harness.setSyncGate({ phase: "idle" });
  assert.equal(harness.syncGate.hidden, true);
  assert.equal(harness.appShell.inert, false);
  assert.equal(harness.themeToggleButton.disabled, false);
  assert.equal(harness.themeToggleButton.inert, false);
  assert.equal(harness.themeToggleButton.hasAttribute("aria-hidden"), false);
});

test("深色模式的主要卡片、app bar 與底部導覽會在後段 cascade 實際勝出", () => {
  const tripSurfaceSelectors = [
    ".trip-visual",
    ".itinerary-main-column",
    ".itinerary-side-card",
    ".expense-summary-card",
    ".expense-table-card",
    ".expense-mobile-summary-card",
    ".expense-settlement-card",
    ".expense-category-card",
    ".expense-settings-details",
    ".expense-members",
    ".exchange-panel",
    ".expense-stats-card",
    ".ledger-card",
    ".weather-card",
    ".utility-card",
    ".todo-group",
    ".todo-list-section",
    ".todo-side-card",
    ".todo-progress-card",
    ".travel-day-metrics span",
    ".travel-day-card",
    ".booking-card",
    ".booking-focus-card",
    ".booking-side-card",
    ".trip-sticky-nav",
    ".empty-state",
    ".desktop-sidebar"
  ];

  for (const suffix of tripSurfaceSelectors) {
    const selector = `html[data-theme="dark"] #tripView[data-active-section] ${suffix}`;
    const rule = cssRuleForSelector(selector);
    assert.match(rule.body, /background:\s*var\(--ref-surface\);/, `${suffix} 必須使用深色 surface`);
    assert.match(rule.body, /border-color:\s*var\(--ref-line\);/, `${suffix} 必須使用深色邊線`);
    assert.ok(rule.index > cssSource.lastIndexOf(`  ${suffix} {`), `${suffix} 覆寫必須放在桌機淺色規則後`);
  }

  const appBarSelector = 'html[data-theme="dark"] #tripView[data-active-section] .trip-appbar';
  const appBar = cssRuleForSelector(appBarSelector);
  assert.match(appBar.body, /background:\s*var\(--ref-surface\);/);
  assert.ok(
    compareSpecificity(selectorSpecificity(appBarSelector), selectorSpecificity('#tripView[data-active-section="bookings"] .trip-appbar')) > 0,
    "深色 app bar selector 權重必須高於後段預訂頁淺色規則"
  );
  assert.ok(appBar.index > cssSource.lastIndexOf('#tripView[data-active-section="bookings"] .trip-appbar {'));

  const bottomNavSelector = 'html[data-theme="dark"] #tripView[data-active-section] .trip-section-tabs';
  const bottomNav = cssRuleForSelector(bottomNavSelector);
  assert.match(bottomNav.body, /background:\s*var\(--ref-surface\);/);
  assert.ok(compareSpecificity(selectorSpecificity(bottomNavSelector), selectorSpecificity(".trip-section-tabs")) > 0);
});

test("深色 landing、home 與 editor 主要 surface 及輸入控制不會保留淺色底", () => {
  const surfaceSelectors = [
    ".landing-hero",
    ".landing-ticket",
    ".landing-stats div",
    ".cloud-panel",
    ".trip-card",
    ".trip-share-panel",
    ".trip-member-row",
    ".editor",
    ".editor form",
    ".existing-attachments",
    ".trip-day-title-editor",
    ".trip-weather-editor",
    ".trip-segment-editor",
    ".trip-segment-row",
    ".trip-weather-day",
    ".trip-weather-results button",
    ".checkbox-row",
    ".transport-segment-editor",
    ".transport-segment-card",
    ".personal-ticket-editor",
    ".personal-ticket-card",
    ".todo-row"
  ];
  for (const suffix of surfaceSelectors) {
    const rule = cssRuleForSelector(`html[data-theme="dark"] ${suffix}`);
    assert.match(rule.body, /background:\s*var\(--ref-surface\);/, `${suffix} 必須使用深色 surface`);
    assert.doesNotMatch(rule.body, /rgba\(255|background:\s*(?:white|#fff)/i);
  }

  for (const suffix of [
    ".cloud-form input",
    ".trip-invite-form input",
    ".trip-invite-form select",
    ".trip-member-name-field input",
    ".editor input",
    ".editor textarea",
    ".editor select"
  ]) {
    const rule = cssRuleForSelector(`html[data-theme="dark"] ${suffix}`);
    assert.match(rule.body, /background:\s*var\(--panel\);/, `${suffix} 必須使用深色輸入底`);
    assert.match(rule.body, /color:\s*var\(--ink\);/);
    assert.match(rule.body, /border-color:\s*var\(--line\);/);
  }
});

test("install panel 是 tripView 的兄弟節點，深色 selector 依真實 DOM 關係命中", () => {
  const appShell = elementRangeById("appShell");
  const tripView = elementRangeById("tripView");
  const installPanel = elementRangeById("installPanel");
  assert.ok(appShell.start < tripView.start && tripView.end < installPanel.start && installPanel.end < appShell.end);
  assert.match(htmlSource.slice(tripView.end, appShell.end), /^\s*<section\s+class="install-panel"\s+id="installPanel">/);

  const selector = 'html[data-theme="dark"] #appShell > #installPanel.install-panel';
  const rule = cssRuleForSelector(selector);
  assert.match(rule.body, /background:\s*var\(--ref-surface\);/);
  assert.match(rule.body, /border-color:\s*var\(--ref-line\);/);
  assert.ok(compareSpecificity(selectorSpecificity(selector), selectorSpecificity(".install-panel")) > 0);
  assert.ok(rule.index > cssSource.lastIndexOf("\n.install-panel {"), "install panel 深色規則必須在淺色規則後");
  assert.doesNotMatch(cssSource, /#tripView\[data-active-section\][^{,]*\.install-panel/);
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

test("深色主題實際 coral 與 blue accent 元件改用深色字，每組至少 4.5:1", () => {
  const darkTheme = cssSource.match(/html\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/)?.[1] || "";
  const tokenValue = (token) => darkTheme.match(new RegExp(`--${token}:\\s*(#[a-f\\d]{6});`, "i"))?.[1];
  const accentInk = tokenValue("ref-accent-ink");
  const coral = tokenValue("ref-coral");
  const blue = tokenValue("ref-blue");
  assert.ok(accentInk && coral && blue, "深色 accent 前景與背景 token 不完整");
  assert.ok(contrastRatio(accentInk, coral) >= 4.5, `coral 組對比不足：${accentInk} on ${coral}`);
  assert.ok(contrastRatio(accentInk, blue) >= 4.5, `blue 組對比不足：${accentInk} on ${blue}`);

  const coralSelectors = [
    ".primary-button",
    ".timeline-add-button",
    ".expense-add-button",
    "#addBookingButton",
    "#bookingsPanel .sub-tab.is-active",
    ".booking-ticket-primary",
    ".todo-add-button",
    ".todo-quick-add-button"
  ];
  const blueSelectors = [
    '#tripView[data-active-section="itinerary"] .day-tab.is-active',
    ".booking-date-tab.is-active"
  ];
  for (const suffix of [...coralSelectors, ...blueSelectors]) {
    const rule = cssRuleForSelector(`html[data-theme="dark"] ${suffix}`);
    assert.match(rule.body, /color:\s*var\(--ref-accent-ink\);/, `${suffix} 必須使用高對比 accent 文字`);
  }

  for (const gradientStop of ["#ff7359", "#fa6046", "#688ca1", "#6b91a7", "#e95b43"]) {
    assert.ok(contrastRatio(accentInk, gradientStop) >= 4.5, `${gradientStop} 與 accent 文字必須至少 4.5:1`);
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
