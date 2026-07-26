-- 將本 App 先前因預設值錯誤而建立的私人待辦，改為所有旅伴可見。
-- 安全範圍：只更新 visibility 明確為 'private' 的 trip_todos；不變更任何 RLS 規則、角色或其他欄位。
-- 執行前請先確認此專案沒有刻意建立「私人待辦」的需求；目前 App 的待辦介面沒有此選項。

begin;

update public.trip_todos
set
  visibility = 'shared',
  updated_at = now()
where visibility = 'private';

commit;
