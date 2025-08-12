
-- 1) Fonctions utilitaires pour les politiques RLS
-- Détermine si l'appelant est propriétaire du projet (Keycloak sub dans JWT ou header)
create or replace function public.is_project_owner(_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = _project_id
      and (
        p.keycloak_user_id = (current_setting('request.headers', true)::jsonb ->> 'x-keycloak-sub')
        or p.keycloak_user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
      )
  );
$$;

-- Détermine si l'appelant est un candidat assigné au projet (membre de l'équipe)
create or replace function public.is_assigned_candidate(_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.candidate_project_assignments cpa
    join public.candidate_profiles cp on cp.id = cpa.candidate_id
    where cpa.project_id = _project_id
      and (
        cp.email = (current_setting('request.headers', true)::jsonb ->> 'x-keycloak-email')
        or cp.email = (current_setting('request.jwt.claims', true)::jsonb ->> 'email')
      )
  );
$$;

-- Confort: membre = propriétaire OU candidat assigné
create or replace function public.is_project_member(_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_project_owner(_project_id) or public.is_assigned_candidate(_project_id);
$$;


-- 2) Politique de stockage par préfixe project_id/
-- Fonction pour extraire le project_id (uuid) du chemin objet "project_id/..."
create or replace function public.object_project_id(_name text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  part text;
  pid uuid;
begin
  part := split_part(_name, '/', 1);
  begin
    pid := part::uuid;
  exception when others then
    return null;
  end;
  return pid;
end;
$$;

-- Supprime les anciennes policies conflictuelles si elles existent
drop policy if exists "project-files members can read" on storage.objects;
drop policy if exists "project-files members can write" on storage.objects;
drop policy if exists "project-files owners can delete" on storage.objects;

-- Active RLS si nécessaire (souvent déjà activé par Supabase)
-- alter table storage.objects enable row level security; -- (déjà activé par défaut)

-- Lecture pour membres (proprio + équipe)
create policy "project-files members can read"
on storage.objects
for select
using (
  bucket_id = 'project-files'
  and public.is_project_member(public.object_project_id(name))
);

-- Écriture (insert/update/delete) pour membres
create policy "project-files members can write"
on storage.objects
for all
using (
  bucket_id = 'project-files'
  and public.is_project_member(public.object_project_id(name))
)
with check (
  bucket_id = 'project-files'
  and public.is_project_member(public.object_project_id(name))
);


-- 3) Kanban: force l'appartenance à un projet + RLS par projet
-- Ajoute project_id si manquant
alter table if exists public.kanban_boards
  add column if not exists project_id uuid;

-- Contrainte FK vers projects
do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_name = 'kanban_boards_project_id_fkey'
      and table_name = 'kanban_boards'
  ) then
    alter table public.kanban_boards
      add constraint kanban_boards_project_id_fkey
      foreign key (project_id)
      references public.projects(id)
      on delete cascade;
  end if;
end $$;

-- Index utile
create index if not exists idx_kanban_boards_project_id on public.kanban_boards(project_id);

-- Active RLS
alter table public.kanban_boards enable row level security;
alter table public.kanban_columns enable row level security;
alter table public.kanban_cards enable row level security;

-- Nettoyage des anciennes policies trop permissives (si existent)
drop policy if exists "kanban boards open all" on public.kanban_boards;
drop policy if exists "kanban columns open all" on public.kanban_columns;
drop policy if exists "kanban cards open all" on public.kanban_cards;

drop policy if exists "Project members can view kanban boards" on public.kanban_boards;
drop policy if exists "Project members can insert kanban boards" on public.kanban_boards;
drop policy if exists "Project members can update kanban boards" on public.kanban_boards;
drop policy if exists "Project owners can delete kanban boards" on public.kanban_boards;

drop policy if exists "Project members can view kanban columns" on public.kanban_columns;
drop policy if exists "Project members can write kanban columns" on public.kanban_columns;
drop policy if exists "Project owners can delete kanban columns" on public.kanban_columns;

drop policy if exists "Project members can view kanban cards" on public.kanban_cards;
drop policy if exists "Project members can write kanban cards" on public.kanban_cards;
drop policy if exists "Project owners can delete kanban cards" on public.kanban_cards;

-- Boards
create policy "Project members can view kanban boards"
on public.kanban_boards
for select
using (public.is_project_member(project_id));

create policy "Project members can insert kanban boards"
on public.kanban_boards
for insert
with check (public.is_project_member(project_id));

create policy "Project members can update kanban boards"
on public.kanban_boards
for update
using (public.is_project_member(project_id))
with check (public.is_project_member(project_id));

create policy "Project owners can delete kanban boards"
on public.kanban_boards
for delete
using (public.is_project_owner(project_id));

-- Columns (via board.project_id)
create policy "Project members can view kanban columns"
on public.kanban_columns
for select
using (
  public.is_project_member((
    select b.project_id from public.kanban_boards b where b.id = board_id
  ))
);

create policy "Project members can write kanban columns"
on public.kanban_columns
for insert
with check (
  public.is_project_member((
    select b.project_id from public.kanban_boards b where b.id = board_id
  ))
);

create policy "Project members can update kanban columns"
on public.kanban_columns
for update
using (
  public.is_project_member((
    select b.project_id from public.kanban_boards b where b.id = board_id
  ))
)
with check (
  public.is_project_member((
    select b.project_id from public.kanban_boards b where b.id = board_id
  ))
);

create policy "Project owners can delete kanban columns"
on public.kanban_columns
for delete
using (
  public.is_project_owner((
    select b.project_id from public.kanban_boards b where b.id = board_id
  ))
);

-- Cards (via board.project_id)
create policy "Project members can view kanban cards"
on public.kanban_cards
for select
using (
  public.is_project_member((
    select b.project_id from public.kanban_boards b where b.id = board_id
  ))
);

create policy "Project members can write kanban cards"
on public.kanban_cards
for insert
with check (
  public.is_project_member((
    select b.project_id from public.kanban_boards b where b.id = board_id
  ))
);

create policy "Project members can update kanban cards"
on public.kanban_cards
for update
using (
  public.is_project_member((
    select b.project_id from public.kanban_boards b where b.id = board_id
  ))
)
with check (
  public.is_project_member((
    select b.project_id from public.kanban_boards b where b.id = board_id
  ))
);

create policy "Project owners can delete kanban cards"
on public.kanban_cards
for delete
using (
  public.is_project_owner((
    select b.project_id from public.kanban_boards b where b.id = board_id
  ))
);


-- 4) Agenda: autoriser les membres (équipe) à gérer les événements
-- Nettoyage policies éventuelles homonymes
drop policy if exists "Project members can insert events" on public.project_events;
drop policy if exists "Project members can update events" on public.project_events;
drop policy if exists "Project members can delete events" on public.project_events;

create policy "Project members can insert events"
on public.project_events
for insert
with check (public.is_project_member(project_id));

create policy "Project members can update events"
on public.project_events
for update
using (public.is_project_member(project_id))
with check (public.is_project_member(project_id));

-- La suppression reste réservée aux owners (policy déjà en place); si besoin:
-- create policy "Project members can delete events"
-- on public.project_events
-- for delete
-- using (public.is_project_member(project_id));

-- Attendees gérés par les membres
drop policy if exists "Project members can manage attendees" on public.project_event_attendees;
create policy "Project members can manage attendees"
on public.project_event_attendees
for all
using (
  public.is_project_member((
    select e.project_id from public.project_events e where e.id = event_id
  ))
)
with check (
  public.is_project_member((
    select e.project_id from public.project_events e where e.id = event_id
  ))
);
