
-- 1) Rôles applicatifs
create type public.app_role as enum ('admin', 'client', 'candidate', 'hr_manager');

-- 2) Table profiles liée à auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  first_name text,
  last_name text,
  phone text,
  company_name text,
  role public.app_role not null default 'candidate',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- RLS profiles
create policy if not exists "Users can view their own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy if not exists "Users can update their own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy if not exists "Admins can manage all profiles"
  on public.profiles for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Trigger handle_new_user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, first_name, last_name, role)
  values (new.id, new.email, new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data ->> 'last_name', coalesce((new.raw_user_meta_data ->> 'role')::public.app_role, 'candidate'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3) Table project_members pour les accès d’équipe
create type public.project_member_role as enum ('owner', 'member', 'client', 'resource', 'admin');

create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.project_member_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (project_id, profile_id)
);

alter table public.project_members enable row level security;

-- RLS project_members
create policy if not exists "Members can view project memberships"
  on public.project_members for select
  using (exists (
    select 1 from public.project_members pm
    where pm.project_id = project_members.project_id
      and pm.profile_id = auth.uid()
  ));

create policy if not exists "Owners/Admins can manage project memberships"
  on public.project_members for all
  using (exists (
    select 1 from public.project_members pm
    where pm.project_id = project_members.project_id
      and pm.profile_id = auth.uid()
      and pm.role in ('owner','admin')
  ))
  with check (exists (
    select 1 from public.project_members pm
    where pm.project_id = project_members.project_id
      and pm.profile_id = auth.uid()
      and pm.role in ('owner','admin')
  ));

-- 4) Kanban: enums + tables
create type public.kanban_priority as enum ('low', 'medium', 'high');
create type public.kanban_status as enum ('todo', 'in_progress', 'review', 'done');

create table if not exists public.kanban_boards (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  title text not null,
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kanban_columns (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.kanban_boards(id) on delete cascade,
  title text not null,
  position int not null default 0,
  color text,
  limit int
);

create table if not exists public.kanban_cards (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.kanban_boards(id) on delete cascade,
  column_id uuid not null references public.kanban_columns(id) on delete cascade,
  title text not null,
  description text,
  assigned_to uuid references public.profiles(id) on delete set null,
  due_date timestamptz,
  priority public.kanban_priority not null default 'medium',
  status public.kanban_status not null default 'todo',
  labels text[] not null default '{}',
  progress int not null default 0,
  position int not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kanban_comments (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.kanban_cards(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.kanban_attachments (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.kanban_cards(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  file_size bigint not null default 0,
  content_type text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  uploaded_at timestamptz not null default now()
);

-- RLS Kanban
alter table public.kanban_boards enable row level security;
alter table public.kanban_columns enable row level security;
alter table public.kanban_cards enable row level security;
alter table public.kanban_comments enable row level security;
alter table public.kanban_attachments enable row level security;

-- SELECT: tout membre du projet
create policy if not exists "Members can view kanban boards"
  on public.kanban_boards for select
  using (exists (select 1 from public.project_members pm where pm.project_id = kanban_boards.project_id and pm.profile_id = auth.uid()));

create policy if not exists "Members can view kanban columns"
  on public.kanban_columns for select
  using (exists (select 1 from public.kanban_boards kb join public.project_members pm on pm.project_id = kb.project_id where kb.id = kanban_columns.board_id and pm.profile_id = auth.uid()));

create policy if not exists "Members can view kanban cards"
  on public.kanban_cards for select
  using (exists (select 1 from public.kanban_boards kb join public.project_members pm on pm.project_id = kb.project_id where kb.id = kanban_cards.board_id and pm.profile_id = auth.uid()));

create policy if not exists "Members can view kanban comments"
  on public.kanban_comments for select
  using (exists (select 1 from public.kanban_cards kc join public.kanban_boards kb on kb.id = kc.board_id join public.project_members pm on pm.project_id = kb.project_id where kc.id = kanban_comments.card_id and pm.profile_id = auth.uid()));

create policy if not exists "Members can view kanban attachments"
  on public.kanban_attachments for select
  using (exists (select 1 from public.kanban_cards kc join public.kanban_boards kb on kb.id = kc.board_id join public.project_members pm on pm.project_id = kb.project_id where kc.id = kanban_attachments.card_id and pm.profile_id = auth.uid()));

-- INSERT/UPDATE/DELETE: owner/admin pour structure (boards/columns), membres pour cartes/commentaires/pièces jointes
create policy if not exists "Owners can manage boards"
  on public.kanban_boards for all
  using (exists (select 1 from public.project_members pm where pm.project_id = kanban_boards.project_id and pm.profile_id = auth.uid() and pm.role in ('owner','admin')))
  with check (exists (select 1 from public.project_members pm where pm.project_id = kanban_boards.project_id and pm.profile_id = auth.uid() and pm.role in ('owner','admin')));

create policy if not exists "Owners can manage columns"
  on public.kanban_columns for all
  using (exists (select 1 from public.kanban_boards kb join public.project_members pm on pm.project_id = kb.project_id where kb.id = kanban_columns.board_id and pm.profile_id = auth.uid() and pm.role in ('owner','admin')))
  with check (exists (select 1 from public.kanban_boards kb join public.project_members pm on pm.project_id = kb.project_id where kb.id = kanban_columns.board_id and pm.profile_id = auth.uid() and pm.role in ('owner','admin')));

create policy if not exists "Members can manage cards"
  on public.kanban_cards for all
  using (exists (select 1 from public.kanban_boards kb join public.project_members pm on pm.project_id = kb.project_id where kb.id = kanban_cards.board_id and pm.profile_id = auth.uid()))
  with check (exists (select 1 from public.kanban_boards kb join public.project_members pm on pm.project_id = kb.project_id where kb.id = kanban_cards.board_id and pm.profile_id = auth.uid()));

create policy if not exists "Members can manage comments"
  on public.kanban_comments for all
  using (exists (select 1 from public.kanban_cards kc join public.kanban_boards kb on kb.id = kc.board_id join public.project_members pm on pm.project_id = kb.project_id where kc.id = kanban_comments.card_id and pm.profile_id = auth.uid()))
  with check (exists (select 1 from public.kanban_cards kc join public.kanban_boards kb on kb.id = kc.board_id join public.project_members pm on pm.project_id = kb.project_id where kc.id = kanban_comments.card_id and pm.profile_id = auth.uid()));

create policy if not exists "Members can manage attachments"
  on public.kanban_attachments for all
  using (exists (select 1 from public.kanban_cards kc join public.kanban_boards kb on kb.id = kc.board_id join public.project_members pm on pm.project_id = kb.project_id where kc.id = kanban_attachments.card_id and pm.profile_id = auth.uid()))
  with check (exists (select 1 from public.kanban_cards kc join public.kanban_boards kb on kb.id = kc.board_id join public.project_members pm on pm.project_id = kb.project_id where kc.id = kanban_attachments.card_id and pm.profile_id = auth.uid()));

-- 5) Drive de projet (MVP bucket public)
insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', true)
on conflict (id) do nothing;

create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  uploader_profile_id uuid references public.profiles(id) on delete set null,
  file_path text not null,
  file_name text not null,
  file_size bigint not null default 0,
  content_type text,
  created_at timestamptz not null default now()
);

alter table public.project_files enable row level security;

create policy if not exists "Members can view project files"
  on public.project_files for select
  using (exists (select 1 from public.project_members pm where pm.project_id = project_files.project_id and pm.profile_id = auth.uid()));

create policy if not exists "Members can insert project files"
  on public.project_files for insert
  with check (exists (select 1 from public.project_members pm where pm.project_id = project_files.project_id and pm.profile_id = auth.uid()));

create policy if not exists "Uploader or owner can delete/update files"
  on public.project_files for update using (
    project_files.uploader_profile_id = auth.uid()
    or exists (select 1 from public.project_members pm where pm.project_id = project_files.project_id and pm.profile_id = auth.uid() and pm.role in ('owner','admin'))
  )
  with check (
    project_files.uploader_profile_id = auth.uid()
    or exists (select 1 from public.project_members pm where pm.project_id = project_files.project_id and pm.profile_id = auth.uid() and pm.role in ('owner','admin'))
  );

create policy if not exists "Uploader or owner can delete files"
  on public.project_files for delete using (
    project_files.uploader_profile_id = auth.uid()
    or exists (select 1 from public.project_members pm where pm.project_id = project_files.project_id and pm.profile_id = auth.uid() and pm.role in ('owner','admin'))
  );

-- 6) Calendrier de projet
create table if not exists public.project_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  title text not null,
  description text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  video_url text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_event_attendees (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.project_events(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  email text,
  status text not null default 'invited',
  created_at timestamptz not null default now()
);

alter table public.project_events enable row level security;
alter table public.project_event_attendees enable row level security;

-- RLS calendar
create policy if not exists "Members can view events"
  on public.project_events for select
  using (exists (select 1 from public.project_members pm where pm.project_id = project_events.project_id and pm.profile_id = auth.uid()));

create policy if not exists "Members can manage events"
  on public.project_events for all
  using (exists (select 1 from public.project_members pm where pm.project_id = project_events.project_id and pm.profile_id = auth.uid()))
  with check (exists (select 1 from public.project_members pm where pm.project_id = project_events.project_id and pm.profile_id = auth.uid()));

create policy if not exists "Members can view attendees"
  on public.project_event_attendees for select
  using (exists (select 1 from public.project_events pe join public.project_members pm on pm.project_id = pe.project_id where pe.id = project_event_attendees.event_id and pm.profile_id = auth.uid()));

create policy if not exists "Members can manage attendees"
  on public.project_event_attendees for all
  using (exists (select 1 from public.project_events pe join public.project_members pm on pm.project_id = pe.project_id where pe.id = project_event_attendees.event_id and pm.profile_id = auth.uid()))
  with check (exists (select 1 from public.project_events pe join public.project_members pm on pm.project_id = pe.project_id where pe.id = project_event_attendees.event_id and pm.profile_id = auth.uid()));

-- 7) Realtime
alter table public.kanban_boards replica identity full;
alter table public.kanban_columns replica identity full;
alter table public.kanban_cards replica identity full;
alter table public.kanban_comments replica identity full;
alter table public.kanban_attachments replica identity full;
alter table public.project_files replica identity full;
alter table public.project_events replica identity full;
alter table public.project_event_attendees replica identity full;

alter publication supabase_realtime add table public.kanban_boards;
alter publication supabase_realtime add table public.kanban_columns;
alter publication supabase_realtime add table public.kanban_cards;
alter publication supabase_realtime add table public.kanban_comments;
alter publication supabase_realtime add table public.kanban_attachments;
alter publication supabase_realtime add table public.project_files;
alter publication supabase_realtime add table public.project_events;
alter publication supabase_realtime add table public.project_event_attendees;
