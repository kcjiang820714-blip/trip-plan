grant usage on schema public to authenticated;
grant select, insert, update, delete on public.trip_members to authenticated;
grant execute on function public.is_trip_member(uuid) to authenticated;
grant execute on function public.trip_role(uuid) to authenticated;

alter table public.trip_members
  add column if not exists display_name text not null default '';

drop function if exists public.list_trip_members(uuid);
drop function if exists public.invite_trip_member_by_email(uuid, text, text);
drop function if exists public.invite_trip_member_by_email(uuid, text, text, text);
drop function if exists public.update_trip_member_display_name(uuid, text);
drop function if exists public.update_trip_member_display_name_by_id(uuid, text);

create or replace function public.list_trip_members(target_trip_id uuid)
returns table (
  id uuid,
  user_id uuid,
  email text,
  display_name text,
  role text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
#variable_conflict use_column
begin
  if not public.is_trip_member(target_trip_id) then
    raise exception 'not allowed';
  end if;

  return query
    select
      m.id,
      m.user_id,
      u.email::text,
      m.display_name,
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
  invitee_role text default 'viewer',
  invitee_display_name text default ''
)
returns table (
  id uuid,
  user_id uuid,
  email text,
  display_name text,
  role text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
#variable_conflict use_column
declare
  target_user_id uuid;
  target_email text;
  cleaned_display_name text;
  membership_id uuid;
  membership_display_name text;
  membership_role text;
  membership_created_at timestamptz;
begin
  cleaned_display_name := trim(invitee_display_name);

  if public.trip_role(target_trip_id) <> 'owner' then
    raise exception 'only owner can invite trip members';
  end if;

  if invitee_role not in ('viewer', 'participant') then
    raise exception 'invalid role';
  end if;

  if cleaned_display_name = '' then
    raise exception 'display name is required';
  end if;

  if length(cleaned_display_name) > 40 then
    raise exception 'display name is too long';
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

  select m.id
    into membership_id
  from public.trip_members m
  where m.trip_id = target_trip_id
    and m.user_id = target_user_id
  limit 1;

  if membership_id is null then
    insert into public.trip_members (trip_id, user_id, role, display_name)
    values (target_trip_id, target_user_id, invitee_role, cleaned_display_name)
    returning trip_members.id, trip_members.display_name, trip_members.role, trip_members.created_at
      into membership_id, membership_display_name, membership_role, membership_created_at;
  else
    update public.trip_members m
    set
      role = invitee_role,
      display_name = cleaned_display_name
    where m.id = membership_id
    returning m.id, m.display_name, m.role, m.created_at
      into membership_id, membership_display_name, membership_role, membership_created_at;
  end if;

  return query
    select
      membership_id,
      target_user_id,
      target_email,
      membership_display_name,
      membership_role,
      membership_created_at;
end;
$$;

create or replace function public.update_trip_member_display_name(
  target_trip_id uuid,
  member_display_name text
)
returns table (
  id uuid,
  user_id uuid,
  email text,
  display_name text,
  role text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
#variable_conflict use_column
declare
  cleaned_name text;
begin
  cleaned_name := trim(member_display_name);

  if cleaned_name = '' then
    raise exception 'display name is required';
  end if;

  if length(cleaned_name) > 40 then
    raise exception 'display name is too long';
  end if;

  if not exists (
    select 1
    from public.trip_members m
    where m.trip_id = target_trip_id
      and m.user_id = auth.uid()
  ) then
    raise exception 'not allowed';
  end if;

  return query
    update public.trip_members m
    set display_name = cleaned_name
    from auth.users u
    where m.trip_id = target_trip_id
      and m.user_id = auth.uid()
      and u.id = m.user_id
    returning
      m.id,
      m.user_id,
      u.email::text,
      m.display_name,
      m.role,
      m.created_at;
end;
$$;

create or replace function public.update_trip_member_display_name_by_id(
  target_member_id uuid,
  member_display_name text
)
returns table (
  id uuid,
  user_id uuid,
  email text,
  display_name text,
  role text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
#variable_conflict use_column
declare
  cleaned_name text;
  target_trip_id uuid;
begin
  cleaned_name := trim(member_display_name);

  if cleaned_name = '' then
    raise exception 'display name is required';
  end if;

  if length(cleaned_name) > 40 then
    raise exception 'display name is too long';
  end if;

  select m.trip_id
    into target_trip_id
  from public.trip_members m
  where m.id = target_member_id
  limit 1;

  if target_trip_id is null then
    raise exception 'member not found';
  end if;

  if public.trip_role(target_trip_id) <> 'owner' then
    raise exception 'only owner can edit member names';
  end if;

  return query
    update public.trip_members m
    set display_name = cleaned_name
    from auth.users u
    where m.id = target_member_id
      and u.id = m.user_id
    returning
      m.id,
      m.user_id,
      u.email::text,
      m.display_name,
      m.role,
      m.created_at;
end;
$$;

grant execute on function public.list_trip_members(uuid) to authenticated;
grant execute on function public.invite_trip_member_by_email(uuid, text, text, text) to authenticated;
grant execute on function public.update_trip_member_display_name(uuid, text) to authenticated;
grant execute on function public.update_trip_member_display_name_by_id(uuid, text) to authenticated;
