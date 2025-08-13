
  -- 1) Project members: membres d'un projet (auth.users)
  create table if not exists public.project_members (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.projects(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null default 'member',
    status text not null default 'accepted',
    created_at timestamptz not null default now(),
    unique(project_id, user_id)
  );

  alter table public.project_members enable row level security;

  -- Propriétaire du projet gère les membres
  create policy if not exists "Project members: owner manages"
    on public.project_members
    for all
    using (
      exists (
        select 1 from public.projects p
        where p.id = project_members.project_id
          and p.owner_id = auth.uid()
      )
    )
    with check (
      exists (
        select 1 from public.projects p
        where p.id = project_members.project_id
          and p.owner_id = auth.uid()
      )
    );

  -- Les membres peuvent voir les membres de leurs projets
  create policy if not exists "Project members: members can view their project's members"
    on public.project_members
    for select
    using (
      exists (
        select 1 from public.project_members pm2
        where pm2.project_id = project_members.project_id
          and pm2.user_id = auth.uid()
      )
      or exists (
        select 1 from public.projects p
        where p.id = project_members.project_id
          and p.owner_id = auth.uid()
      )
    );

  -- 2) ACLs de fichiers/ dossiers (basé sur le chemin Storage)
  create table if not exists public.project_file_acls (
    path text primary key,
    project_id uuid not null references public.projects(id) on delete cascade,
    visibility text not null default 'team' check (visibility in ('team','custom','private')),
    allowed_user_ids uuid[] not null default '{}',
    created_by uuid not null default auth.uid(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  alter table public.project_file_acls enable row level security;

  -- Trigger MAJ updated_at
  drop trigger if exists set_project_file_acls_updated_at on public.project_file_acls;
  create trigger set_project_file_acls_updated_at
    before update on public.project_file_acls
    for each row execute procedure public.update_updated_at_column();

  -- Propriétaire gère les ACL
  create policy if not exists "File ACLs: owner manages"
    on public.project_file_acls
    for all
    using (
      exists (
        select 1 from public.projects p
        where p.id = project_file_acls.project_id
          and p.owner_id = auth.uid()
      )
    )
    with check (
      exists (
        select 1 from public.projects p
        where p.id = project_file_acls.project_id
          and p.owner_id = auth.uid()
      )
    );

  -- Membres peuvent lire les ACL de leurs projets (utile pour UI)
  create policy if not exists "File ACLs: members can view for their projects"
    on public.project_file_acls
    for select
    using (
      exists (
        select 1 from public.project_members pm
        where pm.project_id = project_file_acls.project_id
          and pm.user_id = auth.uid()
      )
      or exists (
        select 1 from public.projects p
        where p.id = project_file_acls.project_id
          and p.owner_id = auth.uid()
      )
    );

  -- 3) Storage policies complémentaires pour la lecture par l'équipe et le custom
  -- NB: Conserver vos policies "owner" déjà en place pour select/insert/update/delete

  -- Team lecture via ACL.visibility = 'team'
  create policy if not exists "Project files: team can read via ACL"
    on storage.objects
    for select
    to authenticated
    using (
      bucket_id = 'project-files'
      and exists (
        select 1
        from public.project_file_acls a
        join public.project_members m
          on m.project_id = a.project_id
         and m.user_id   = auth.uid()
        where a.path = storage.objects.name
          and a.visibility = 'team'
      )
    );

  -- Lecture custom via allowed_user_ids (visibility = 'custom')
  create policy if not exists "Project files: custom users can read"
    on storage.objects
    for select
    to authenticated
    using (
      bucket_id = 'project-files'
      and exists (
        select 1
        from public.project_file_acls a
        where a.path = storage.objects.name
          and a.visibility = 'custom'
          and auth.uid() = any(a.allowed_user_ids)
      )
    );
  