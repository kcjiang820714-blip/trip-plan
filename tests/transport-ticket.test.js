import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const htmlSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("交通預訂提供電子票券連結或檔案兩種方式", () => {
  assert.match(htmlSource, /<option value="交通">交通<\/option>/, "預訂類型應包含交通");
  assert.match(htmlSource, /name="transportTicketMode"[^>]*value="link"/, "交通票券應可選擇連結");
  assert.match(htmlSource, /name="transportTicketMode"[^>]*value="file"/, "交通票券應可選擇上傳檔案");
});

test("電子票券連結只接受安全的 http 或 https 網址", () => {
  assert.match(appSource, /function normalizeTicketUrl\(value\)/, "應有電子票券網址驗證函式");
  assert.match(appSource, /\["http:", "https:"\]\.includes\(url\.protocol\)/, "只允許 http/https 電子票券網址");
});

test("行程快速取用可以安全地開啟交通電子票券", () => {
  assert.match(appSource, /data-open-ticket-url="\$\{escapeHtml\(booking\.ticketUrl\)\}"/, "快速取用按鈕應保存已跳脫的票券網址");
  assert.match(appSource, /function openTicketUrl\(ticketUrl\)/, "應由獨立函式處理票券連結開啟");
  assert.match(appSource, /window\.open\(safeUrl, "_blank", "noopener,noreferrer"\)/, "票券連結應以無 opener 的新分頁開啟");
});
