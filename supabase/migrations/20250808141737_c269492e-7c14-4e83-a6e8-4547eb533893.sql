
-- 1) Projects: restreindre à l'auteur (Keycloak sub) + aux ressources affectées

alter table public.projects enable row level security;

drop policy if exists "Authenticated users can view projects" on public.projects;
drop policy if exists "Authenticated users can update projects" on public.projects;
drop policy if exists "Authenticated users can delete projects" on public.projects;
drop policy if exists "Authenticated users can create projects" on public.projects;

create policy "Project owners can select their projects"
  on public.projects
  for select
  using (
    keycloak_user_id is not null
    and keycloak_user_id = (current_setting('request.headers', true)::jsonb ->> 'x-keycloak-sub')
  );

create policy "Project owners can insert"
  on public.projects
  for insert
  with check (
    keycloak_user_id is not null
    and keycloak_user_id = (current_setting('request.headers', true)::jsonb ->> 'x-keycloak-sub')
  );

create policy "Project owners can update"
  on public.projects
  for update
  using (
    keycloak_user_id is not null
    and keycloak_user_id = (current_setting('request.headers', true)::jsonb ->> 'x-keycloak-sub')
  )
  with check (
    keycloak_user_id is not null
    and keycloak_user_id = (current_setting('request.headers', true)::jsonb ->> 'x-keycloak-sub')
  );

create policy "Project owners can delete"
  on public.projects
  for delete
  using (
    keycloak_user_id is not null
    and keycloak_user_id = (current_setting('request.headers', true)::jsonb ->> 'x-keycloak-sub')
  );

-- Permettre aux ressources d'afficher les projets auxquels elles sont affectées
create policy "Resources can view assigned projects"
  on public.projects
  for select
  using (
    exists (
      select 1
      from public.candidate_project_assignments cpa
      join public.candidate_profiles cp on cp.id = cpa.candidate_id
      where cpa.project_id = projects.id
        and cp.email = (current_setting('request.headers', true)::jsonb ->> 'x-keycloak-email')
    )
  );

-- 2) Project bookings: visibilité limitée à l'auteur du projet ou au candidat concerné

alter table public.project_bookings enable row level security;

drop policy if exists "Users can view their project bookings" on public.project_bookings;
drop policy if exists "Admins can manage all project bookings" on public.project_bookings;

create policy "Owners can view project bookings"
  on public.project_bookings
  for select
  using (
    exists (
      select 1
      from public.projects p
      where p.id = project_bookings.project_id
        and p.keycloak_user_id = (current_setting('request.headers', true)::jsonb ->> 'x-keycloak-sub')
    )
  );

create policy "Candidates can view their own bookings"
  on public.project_bookings
  for select
  using (
    exists (
      select 1
      from public.candidate_profiles cp
      where cp.id = project_bookings.candidate_id
        and cp.email = (current_setting('request.headers', true)::jsonb ->> 'x-keycloak-email')
    )
  );

-- 3) HR resource assignments: visibilité limitée au propriétaire du projet

alter table public.hr_resource_assignments enable row level security;

drop policy if exists "Allow access to resource assignments for existing projects" on public.hr_resource_assignments;

create policy "Owners can access their resource assignments"
  on public.hr_resource_assignments
  for select
  using (
    exists (
      select 1
      from public.projects p
      where p.id = hr_resource_assignments.project_id
        and p.keycloak_user_id = (current_setting('request.headers', true)::jsonb ->> 'x-keycloak-sub')
    )
  );

-- 4) Nextcloud projects: visibilité limitée au propriétaire du projet

alter table public.nextcloud_projects enable row level security;

drop policy if exists "Users can view their nextcloud projects" on public.nextcloud_projects;
drop policy if exists "Users can insert their nextcloud projects" on public.nextcloud_projects;
drop policy if exists "Users can update their nextcloud projects" on public.nextcloud_projects;
drop policy if exists "Users can delete their nextcloud projects" on public.nextcloud_projects;

create policy "Owners can view nextcloud entries"
  on public.nextcloud_projects
  for select
  using (
    exists (
      select 1
      from public.projects p
      where p.id = nextcloud_projects.project_id
        and p.keycloak_user_id = (current_setting('request.headers', true)::jsonb ->> 'x-keycloak-sub')
    )
  );

create policy "Owners can insert nextcloud entries"
  on public.nextcloud_projects
  for insert
  with check (
    exists (
      select 1
      from public.projects p
      where p.id = nextcloud_projects.project_id
        and p.keycloak_user_id = (current_setting('request.headers', true)::jsonb ->> 'x-keycloak-sub')
    )
  );

create policy "Owners can update nextcloud entries"
  on public.nextcloud_projects
  for update
  using (
    exists (
      select 1
      from public.projects p
      where p.id = nextcloud_projects.project_id
        and p.keycloak_user_id = (current_setting('request.headers', true)::jsonb ->> 'x-keycloak-sub')
    )
  )
  with check (
    exists (
      select 1
      from public.projects p
      where p.id = nextcloud_projects.project_id
        and p.keycloak_user_id = (current_setting('request.headers', true)::jsonb ->> 'x-keycloak-sub')
    )
  );

create policy "Owners can delete nextcloud entries"
  on public.nextcloud_projects
  for delete
  using (
    exists (
      select 1
      from public.projects p
      where p.id = nextcloud_projects.project_id
        and p.keycloak_user_id = (current_setting('request.headers', true)::jsonb ->> 'x-keycloak-sub')
    )
  );

-- 5) Planka projects: même logique que Nextcloud

alter table public.planka_projects enable row level security;

drop policy if exists "Users can view their planka projects" on public.planka_projects;
drop policy if exists "Users can create planka projects for their projects" on public.planka_projects;
drop policy if exists "Users can update their planka projects" on public.planka_projects;
drop policy if exists "Users can delete their planka projects" on public.planka_projects;

create policy "Owners can view planka entries"
  on public.planka_projects
  for select
  using (
    exists (
      select 1
      from public.projects p
      where p.id = planka_projects.project_id
        and p.keycloak_user_id = (current_setting('request.headers', true)::jsonb ->> 'x-keycloak-sub')
    )
  );

create policy "Owners can insert planka entries"
  on public.planka_projects
  for insert
  with check (
    exists (
      select 1
      from public.projects p
      where p.id = planka_projects.project_id
        and p.keycloak_user_id = (current_setting('request.headers', true)::jsonb ->> 'x-keycloak-sub')
    )
  );

create policy "Owners can update planka entries"
  on public.planka_projects
  for update
  using (
    exists (
      select 1
      from public.projects p
      where p.id = planka_projects.project_id
        and p.keycloak_user_id = (current_setting('request.headers', true)::jsonb ->> 'x-keycloak-sub')
    )
  )
  with check (
    exists (
      select 1
      from public.projects p
      where p.id = planka_projects.project_id
        and p.keycloak_user_id = (current_setting('request.headers', true)::jsonb ->> 'x-keycloak-sub')
    )
  );

create policy "Owners can delete planka entries"
  on public.planka_projects
  for delete
  using (
    exists (
      select 1
      from public.projects p
      where p.id = planka_projects.project_id
        and p.keycloak_user_id = (current_setting('request.headers', true)::jsonb ->> 'x-keycloak-sub')
    )
  );
