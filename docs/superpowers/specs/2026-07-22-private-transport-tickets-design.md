# 交通個人私密票券設計規格

## 目標

讓旅程建立者可在同一筆交通預訂中，為每位旅伴建立個別電子票券。建立者可管理全部票券；受邀旅伴登入後，只能取得與出示分配給自己的票券。

## 安全原則

- 不能只靠前端隱藏：其他旅伴不得下載他人的票券網址、檔案名稱或檔案內容。
- 交通路線、班次、日期時間維持旅程共用資料；個人票券移出 `trips.data`。
- 票券附件使用 Supabase 私有 Storage bucket，禁止 `getPublicUrl()`。
- 開啟附件時由登入者取得短時效 signed URL；沒有授權的帳號無法取得 URL。
- 旅程建立者與該張票券指定的旅伴，是唯一可讀取該票券的帳號。

## 資料模型

新增 `public.transport_tickets`：

| 欄位 | 用途 |
| --- | --- |
| `id` | 票券 ID |
| `trip_id` | 所屬雲端旅程 |
| `booking_id` | 對應前端交通預訂的 `booking.id` |
| `holder_user_id` | 票券旅伴的 Supabase 帳號 ID |
| `ticket_url` | 私密電子票券網址，可為空 |
| `attachment_path` | 私有 Storage 檔案路徑，可為空 |
| `attachment_name`、`attachment_type`、`attachment_size` | 顯示與預覽所需的檔案中繼資料 |
| `created_by`、`created_at`、`updated_at` | 稽核與排序 |

每筆資料只能選擇一位 `holder_user_id`。同一交通預訂可有多筆 `transport_tickets`，因此可分配給多位旅伴，但每張票券僅一位持有人。

## 存取權限

Supabase RLS policy：

- `select`：`trips.owner_id = auth.uid()` 或 `holder_user_id = auth.uid()`。
- `insert`、`update`、`delete`：僅旅程建立者。
- `holder_user_id` 必須是旅程建立者或 `trip_members` 的有效成員；以 `security definer` 驗證函式強制檢查。
- 非旅程成員不得讀取資料或 Storage 物件。

私有 bucket 內採用固定路徑：`private-tickets/<trip-cloud-id>/<ticket-id>/<safe-file-name>`。Storage policy 必須透過 `transport_tickets.attachment_path` 與 RLS 規則確認登入者為建立者或持有人；禁止 public bucket 與公開 URL。

## 介面行為

僅「交通」預訂顯示「個人票券」區塊。

- 建立者看到「新增個人票券」。
- 每一列先選持有人：旅程建立者加上所有已受邀旅伴，以顯示名稱與 Email 區分。
- 每列可擇一填寫電子票券網址，或上傳一個圖片／PDF；可保留尚未加入票券的交通預訂。
- 建立者可編輯、替換、刪除每張票券。
- 旅伴只會看到屬於自己的票券與「出示票券」；不顯示其他人的姓名、數量、網址或附件。
- 交通預訂的共用路線資訊仍對所有受邀旅伴可見。

## 前端資料流

1. 載入旅程共用資料後，另外查詢 `transport_tickets`；RLS 會只回傳當前帳號可讀的資料。
2. 建立者新增票券時，先建立資料列取得 `ticket.id`，再上傳附件到私有 bucket，最後更新 `attachment_path` 與檔案中繼資料。
3. 開啟附件時，前端以 `createSignedUrl` 取得短時效網址；不保存或同步公開 URL。
4. URL 票券只於持有人／建立者收到的私密資料列中存在，點擊前仍限制為 `http` 或 `https`。
5. 所有由目前 `booking.ticketUrl` 和 `booking.attachments` 表示的交通票券，雲端同步時不再寫入 `trips.data`。

## 舊資料與遷移

既有交通票券可能已位於公開 `trip-attachments` bucket 或旅程 JSON，無法在不刪除舊檔案的情況下變成私密。

- 新功能上線後，既有交通預訂顯示「舊版共用票券」提示，僅建立者可操作遷移。
- 建立者選擇持有人、重新上傳圖片／PDF或重新填入網址後，才建立私密個人票券。
- 遷移成功後才移除舊 JSON 欄位與公開 Storage 檔案。
- 在遷移完成前，舊公開連結仍可能被已取得網址的人開啟；這是無法回溯撤銷的既有風險，必須明確提示建立者。

## 驗證標準

- 建立者可將兩張不同票券分配給兩位受邀旅伴。
- 旅伴 A 的資料請求只回傳 A 的票券，無法取得旅伴 B 的資料列或 signed URL。
- 旅伴 A 直接以旅伴 B 的 ticket ID、Storage path 或舊網址嘗試讀取時，RLS／Storage policy 拒絕。
- 旅程建立者仍可讀取與管理全部票券。
- 未登入、非旅程成員與被移除的旅伴皆無法讀取私密票券。
- 既有交通票券未遷移前不會被誤標示為私密。
