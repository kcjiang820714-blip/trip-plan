grant usage on schema public to authenticated;
grant select, insert, update, delete on public.trip_members to authenticated;
grant execute on function public.is_trip_member(uuid) to authenticated;
grant execute on function public.trip_role(uuid) to authenticated;

create or replace function public.list_trip_members(target_trip_id uuid)
returns table (
  id uuid,
  user_id uuid,
  email text,
  role text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_trip_member(target_trip_id) then
    raise exception 'not allowed';
  end if;

  return query
    select
      m.id,
      m.user_id,
      u.email::text,
      m.role,
      m.created_at
    from public.trip_members m
    join auth.users u on u.id = m.user_id
    where m.trip_id = target_trip_id
    order by m.created_at;
end;
$$;

create or replace function public.invite_trip_member_by_email(
  target_trip_id uuid,
  invitee_email text,
  invitee_role text default 'viewer'
)
returns table (
  id uuid,
  user_id uuid,
  email text,
  role text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_user_id uuid;
  target_email text;
  membership_id uuid;
  membership_role text;
  membership_created_at timestamptz;
begin
  if public.trip_role(target_trip_id) <> 'owner' then
    raise exception 'only owner can invite trip members';
  end if;

  if invitee_role not in ('viewer', 'participant') then
    raise exception 'invalid role';
  end if;

  select u.id, u.email::text
    into target_user_id, target_email
  from auth.users u
  where lower(u.email) = lower(trim(invitee_email))
  limit 1;

  if target_user_id is null then
    raise exception '找不到這個 Email。請朋友先註冊並登入一次。';
  end if;

  if target_user_id = auth.uid() then
    raise exception '不能邀請自己。';
  end if;

  insert into public.trip_members (trip_id, user_id, role)
  values (target_trip_id, target_user_id, invitee_role)
  on conflict (trip_id, user_id)
  do update set role = excluded.role
  returning trip_members.id, trip_members.role, trip_members.created_at
    into membership_id, membership_role, membership_created_at;

  return query
    select
      membership_id,
      target_user_id,
      target_email,
      membership_role,
      membership_created_at;
end;
$$;

grant execute on function public.list_trip_members(uuid) to authenticated;
grant execute on function public.invite_trip_member_by_email(uuid, text, text) to authenticated;
