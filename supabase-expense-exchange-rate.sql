-- 保留每筆支出建立當下的鎖定匯率；欄位可為 NULL，以相容舊支出。
alter table public.trip_expenses
  add column if not exists exchange_rate numeric;
