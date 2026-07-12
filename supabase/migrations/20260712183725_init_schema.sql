-- Flowdesk schema — Phase 0 (MVP Feature Doc / FRD)
-- Roles are project-scoped, never global: project_members(user_id, project_id, role)
-- is the single source of truth for permissions, enforced in the Node layer.
-- RLS below only covers reads; all writes go through Route Handlers using the
-- service_role key, so the app's permission rules (self-approval block, etc.)
-- can't be bypassed by talking to PostgREST directly with the anon/publishable key.

create extension if not exists "pgcrypto";

-- ---- enums ---------------------------------------------------------------

create type project_role as enum ('developer', 'manager');
create type task_status as enum ('todo', 'in_progress', 'done');
create type task_priority as enum ('low', 'medium', 'high');
create type timesheet_status as enum ('pending', 'approved', 'rejected');
create type avatar_color as enum ('indigo', 'sky', 'amber', 'rose', 'emerald');

-- ---- profiles (1:1 with auth.users) ---------------------------------------

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null,
  initials text not null,
  avatar_color avatar_color not null default 'indigo',
  created_at timestamptz not null default now()
);

-- ---- projects ---------------------------------------------------------

create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ticket_prefix text not null unique,
  next_ticket_number integer not null default 1,
  locked_through date,
  created_at timestamptz not null default now()
);

-- ---- project_members ----------------------------------------------------

create table project_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  project_id uuid not null references projects (id) on delete cascade,
  role project_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, project_id)
);

create index project_members_user_id_idx on project_members (user_id);
create index project_members_project_id_idx on project_members (project_id);

-- ---- tasks ----------------------------------------------------------------
-- id is the human ticket key (e.g. "ENG-1"), minted atomically by create_task().

create table tasks (
  id text primary key,
  title text not null,
  description text not null default '',
  status task_status not null default 'todo',
  priority task_priority not null default 'medium',
  project_id uuid not null references projects (id) on delete cascade,
  assignee_id uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_project_id_idx on tasks (project_id);
create index tasks_assignee_id_idx on tasks (assignee_id);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tasks_set_updated_at
  before update on tasks
  for each row execute function set_updated_at();

-- ---- timesheet_entries -----------------------------------------------

create table timesheet_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  project_id uuid not null references projects (id) on delete cascade,
  task_id text references tasks (id) on delete set null,
  date date not null,
  hours numeric(5, 2) not null check (hours > 0),
  note text,
  status timesheet_status not null default 'pending',
  rejection_reason text,
  created_at timestamptz not null default now(),
  constraint rejection_reason_required_when_rejected check (
    status <> 'rejected' or (rejection_reason is not null and length(trim(rejection_reason)) > 0)
  )
);

create index timesheet_entries_project_id_idx on timesheet_entries (project_id);
create index timesheet_entries_user_id_idx on timesheet_entries (user_id);
create index timesheet_entries_date_idx on timesheet_entries (date);

-- ---- auth.users -> profiles bootstrap --------------------------------

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, initials, avatar_color)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce(
      new.raw_user_meta_data ->> 'initials',
      upper(left(coalesce(new.raw_user_meta_data ->> 'name', new.email), 2))
    ),
    coalesce((new.raw_user_meta_data ->> 'avatar_color')::avatar_color, 'indigo')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---- atomic ticket-id minting -----------------------------------------
-- Locks the project row so concurrent creates on the same project never
-- collide on the same ticket number.

create or replace function create_task(
  p_project_id uuid,
  p_title text,
  p_description text,
  p_priority task_priority,
  p_assignee_id uuid
)
returns tasks
language plpgsql
as $$
declare
  v_prefix text;
  v_number integer;
  v_id text;
  v_task tasks;
begin
  select ticket_prefix, next_ticket_number into v_prefix, v_number
  from projects where id = p_project_id
  for update;

  if v_prefix is null then
    raise exception 'Project not found';
  end if;

  v_id := v_prefix || '-' || v_number;

  update projects set next_ticket_number = next_ticket_number + 1 where id = p_project_id;

  insert into tasks (id, title, description, status, priority, project_id, assignee_id)
  values (v_id, p_title, coalesce(p_description, ''), 'todo', p_priority, p_project_id, p_assignee_id)
  returning * into v_task;

  return v_task;
end;
$$;

-- ---- atomic project creation (project + creator-as-manager) -----------

create or replace function create_project(
  p_name text,
  p_ticket_prefix text,
  p_creator_id uuid
)
returns projects
language plpgsql
as $$
declare
  v_project projects;
begin
  insert into projects (name, ticket_prefix, next_ticket_number, locked_through)
  values (p_name, upper(p_ticket_prefix), 1, null)
  returning * into v_project;

  insert into project_members (user_id, project_id, role)
  values (p_creator_id, v_project.id, 'manager');

  return v_project;
exception
  when unique_violation then
    raise exception 'That ticket prefix is already used by another project.';
end;
$$;

-- ---- RLS: reads scoped to project membership; writes go through the ---
-- Node service-role layer only (no insert/update/delete policies here).

create or replace function is_project_member(p_project_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from project_members
    where project_id = p_project_id and user_id = auth.uid()
  );
$$;

alter table profiles enable row level security;
alter table projects enable row level security;
alter table project_members enable row level security;
alter table tasks enable row level security;
alter table timesheet_entries enable row level security;

create policy "profiles are viewable by authenticated users"
  on profiles for select
  to authenticated
  using (true);

create policy "members can view their projects"
  on projects for select
  to authenticated
  using (is_project_member(id));

create policy "members can view membership on their projects"
  on project_members for select
  to authenticated
  using (is_project_member(project_id));

create policy "members can view tasks on their projects"
  on tasks for select
  to authenticated
  using (is_project_member(project_id));

create policy "members can view timesheet entries on their projects"
  on timesheet_entries for select
  to authenticated
  using (is_project_member(project_id));
