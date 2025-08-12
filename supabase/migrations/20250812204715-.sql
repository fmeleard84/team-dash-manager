-- Create Kanban tables and storage policies for project-scoped Drive (retry without IF NOT EXISTS on policies/triggers)

-- 1) Kanban tables
create table if not exists public.kanban_boards (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  created_by text,
  members text[] not null default '{}',
  team_members jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.kanban_boards enable row level security;

create policy "Owners can manage kanban boards"
  on public.kanban_boards
  for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = kanban_boards.project_id
        and (
          p.keycloak_user_id = (current_setting('request.headers', true)::jsonb->>'x-keycloak-sub')
          or p.keycloak_user_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub')
        )
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = kanban_boards.project_id
        and (
          p.keycloak_user_id = (current_setting('request.headers', true)::jsonb->>'x-keycloak-sub')
          or p.keycloak_user_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub')
        )
    )
  );

create policy "Assigned candidates can view kanban boards"
  on public.kanban_boards
  for select
  using (
    exists (
      select 1
      from public.candidate_project_assignments cpa
      join public.candidate_profiles cp on cp.id = cpa.candidate_id
      where cpa.project_id = kanban_boards.project_id
        and (
          cp.email = (current_setting('request.headers', true)::jsonb->>'x-keycloak-email')
          or cp.email = (current_setting('request.jwt.claims', true)::jsonb->>'email')
        )
    )
  );

create table if not exists public.kanban_columns (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.kanban_boards(id) on delete cascade,
  title text not null,
  position int not null default 0,
  color text,
  limit int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.kanban_columns enable row level security;

create policy "Owners can manage kanban columns"
  on public.kanban_columns
  for all
  using (
    exists (
      select 1 from public.kanban_boards b
      join public.projects p on p.id = b.project_id
      where b.id = kanban_columns.board_id
        and (
          p.keycloak_user_id = (current_setting('request.headers', true)::jsonb->>'x-keycloak-sub')
          or p.keycloak_user_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub')
        )
    )
  )
  with check (
    exists (
      select 1 from public.kanban_boards b
      join public.projects p on p.id = b.project_id
      where b.id = kanban_columns.board_id
        and (
          p.keycloak_user_id = (current_setting('request.headers', true)::jsonb->>'x-keycloak-sub')
          or p.keycloak_user_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub')
        )
    )
  );

create policy "Assigned candidates can view kanban columns"
  on public.kanban_columns
  for select
  using (
    exists (
      select 1
      from public.kanban_boards b
      join public.candidate_project_assignments cpa on cpa.project_id = b.project_id
      join public.candidate_profiles cp on cp.id = cpa.candidate_id
      where b.id = kanban_columns.board_id
        and (
          cp.email = (current_setting('request.headers', true)::jsonb->>'x-keycloak-email')
          or cp.email = (current_setting('request.jwt.claims', true)::jsonb->>'email')
        )
    )
  );

create table if not exists public.kanban_cards (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.kanban_boards(id) on delete cascade,
  column_id uuid not null references public.kanban_columns(id) on delete cascade,
  title text not null,
  description text,
  assigned_to text,
  assigned_to_name text,
  assigned_to_email text,
  assigned_to_avatar text,
  due_date text,
  priority text not null default 'medium',
  status text not null default 'todo',
  labels text[] not null default '{}',
  progress int not null default 0,
  position int not null default 0,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.kanban_cards enable row level security;

create policy "Owners can manage kanban cards"
  on public.kanban_cards
  for all
  using (
    exists (
      select 1 from public.kanban_boards b
      join public.projects p on p.id = b.project_id
      where b.id = kanban_cards.board_id
        and (
          p.keycloak_user_id = (current_setting('request.headers', true)::jsonb->>'x-keycloak-sub')
          or p.keycloak_user_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub')
        )
    )
  )
  with check (
    exists (
      select 1 from public.kanban_boards b
      join public.projects p on p.id = b.project_id
      where b.id = kanban_cards.board_id
        and (
          p.keycloak_user_id = (current_setting('request.headers', true)::jsonb->>'x-keycloak-sub')
          or p.keycloak_user_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub')
        )
    )
  );

create policy "Assigned candidates can view kanban cards"
  on public.kanban_cards
  for select
  using (
    exists (
      select 1
      from public.kanban_boards b
      join public.candidate_project_assignments cpa on cpa.project_id = b.project_id
      join public.candidate_profiles cp on cp.id = cpa.candidate_id
      where b.id = kanban_cards.board_id
        and (
          cp.email = (current_setting('request.headers', true)::jsonb->>'x-keycloak-email')
          or cp.email = (current_setting('request.jwt.claims', true)::jsonb->>'email')
        )
    )
  );

-- updated_at triggers
create trigger trg_kanban_boards_updated_at
before update on public.kanban_boards
for each row execute function public.update_updated_at_column();

create trigger trg_kanban_columns_updated_at
before update on public.kanban_columns
for each row execute function public.update_updated_at_column();

create trigger trg_kanban_cards_updated_at
before update on public.kanban_cards
for each row execute function public.update_updated_at_column();


-- 2) Storage policies for project-scoped drive
create policy "Owners manage project files"
  on storage.objects
  for all
  using (
    bucket_id = 'project-files'
    and exists (
      select 1 from public.projects p
      where p.id::text = (storage.foldername(name))[1]
        and (
          p.keycloak_user_id = (current_setting('request.headers', true)::jsonb->>'x-keycloak-sub')
          or p.keycloak_user_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub')
        )
    )
  )
  with check (
    bucket_id = 'project-files'
    and exists (
      select 1 from public.projects p
      where p.id::text = (storage.foldername(name))[1]
        and (
          p.keycloak_user_id = (current_setting('request.headers', true)::jsonb->>'x-keycloak-sub')
          or p.keycloak_user_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub')
        )
    )
  );