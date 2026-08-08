import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const cssSource = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const htmlSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const serviceWorkerSource = readFileSync(new URL("../sw.js", import.meta.url), "utf8");

function functionSource(name) {
  const start = appSource.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `找不到 ${name}()`);
  const bodyStart = appSource.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < appSource.length; index += 1) {
    if (appSource[index] === "{") depth += 1;
    if (appSource[index] === "}" && --depth === 0) return appSource.slice(start, index + 1);
  }
  throw new Error(`${name}() 未完整結束`);
}

function loadGalleryRenderer() {
  const source = ["escapeHtml", "getAttachmentSource", "renderAttachmentGallery"].map(functionSource).join("\n");
  return new Function(`${source}\nreturn renderAttachmentGallery;`)();
}

const oneImage = [{ id: "hero", name: "Migros.jpg", type: "image/jpeg", dataUrl: "data:image/jpeg;base64,hero" }];

test("一般行程詳情只有一張圖片時，使用全寬 16:9 橫幅", () => {
  const renderAttachmentGallery = loadGalleryRenderer();
  const gallery = renderAttachmentGallery(oneImage, "item", "migros");
  const bannerRule = cssSource.match(/\.itinerary-detail-single-image\s*\{([\s\S]*?)\n\}/)?.[1] || "";

  assert.match(gallery, /class="photo-thumb itinerary-detail-single-image"/);
  assert.doesNotMatch(gallery, /class="photo-grid"/, "單張圖片不可再使用多圖縮圖格");
  assert.match(bannerRule, /width:\s*100%;/);
  assert.match(bannerRule, /aspect-ratio:\s*16\s*\/\s*9;/);
  assert.match(bannerRule, /object-fit:\s*cover;/);
});

test("多張或非一般行程附件維持既有縮圖圖庫", () => {
  const renderAttachmentGallery = loadGalleryRenderer();
  const twoImages = [...oneImage, { id: "extra", name: "extra.jpg", type: "image/jpeg", dataUrl: "data:image/jpeg;base64,extra" }];

  assert.match(renderAttachmentGallery(twoImages, "item", "migros"), /class="photo-grid"/);
  assert.doesNotMatch(renderAttachmentGallery(twoImages, "item", "migros"), /itinerary-detail-single-image/);
  assert.match(renderAttachmentGallery(oneImage, "booking", "booking-1"), /class="photo-grid"/);
  assert.equal(renderAttachmentGallery([], "item", "migros"), "");
});

test("單張行程橫幅版面會用 PWA v174 一起更新", () => {
  assert.match(htmlSource, /styles\.css\?v=174/);
  assert.match(htmlSource, /app\.js\?v=174/);
  assert.match(appSource, /serviceWorker\.register\("\.\/sw\.js\?v=174"\)/);
  assert.match(serviceWorkerSource, /const CACHE_NAME = "trip-notebook-v174"/);
  assert.match(serviceWorkerSource, /"\.\/styles\.css\?v=174"/);
  assert.match(serviceWorkerSource, /"\.\/app\.js\?v=174"/);
});
