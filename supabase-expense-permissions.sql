grant usage on schema public to authenticated;
grant select, insert, update, delete on public.trip_expenses to authenticated;
grant execute on function public.is_trip_member(uuid) to authenticated;
grant execute on function public.trip_role(uuid) to authenticated;

alter table public.trip_expenses enable row level security;

drop policy if exists "expenses read members" on public.trip_expenses;
drop policy if exists "expenses insert participant" on public.trip_expenses;
drop policy if exists "expenses update own or owner" on public.trip_expenses;
drop policy if exists "expenses delete own or owner" on public.trip_expenses;

create policy "expenses read members"
on public.trip_expenses
for select
to authenticated
using (
  public.is_trip_member(trip_id)
);

create policy "expenses insert participant"
on public.trip_expenses
for insert
to authenticated
with check (
  public.trip_role(trip_id) in ('owner', 'participant')
  and created_by = auth.uid()
);

create policy "expenses update own or owner"
on public.trip_expenses
for update
to authenticated
using (
  public.trip_role(trip_id) = 'owner'
  or created_by = auth.uid()
)
with check (
  public.trip_role(trip_id) = 'owner'
  or created_by = auth.uid()
);

create policy "expenses delete own or owner"
on public.trip_expenses
for delete
to authenticated
using (
  public.trip_role(trip_id) = 'owner'
  or created_by = auth.uid()
);
