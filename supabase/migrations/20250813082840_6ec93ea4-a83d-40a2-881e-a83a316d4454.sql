-- Storage policies for project-files bucket to allow project owners to manage files under project/{project_id}/...
create policy "Project files: owners can read"
  on storage.objects for select
  using (
    bucket_id = 'project-files'
    and exists (
      select 1 from public.projects p
      where p.id::text = (storage.foldername(name))[2]
        and p.owner_id = auth.uid()
    )
  );

create policy "Project files: owners can insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'project-files'
    and exists (
      select 1 from public.projects p
      where p.id::text = (storage.foldername(name))[2]
        and p.owner_id = auth.uid()
    )
  );

create policy "Project files: owners can update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'project-files'
    and exists (
      select 1 from public.projects p
      where p.id::text = (storage.foldername(name))[2]
        and p.owner_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'project-files'
    and exists (
      select 1 from public.projects p
      where p.id::text = (storage.foldername(name))[2]
        and p.owner_id = auth.uid()
    )
  );

create policy "Project files: owners can delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'project-files'
    and exists (
      select 1 from public.projects p
      where p.id::text = (storage.foldername(name))[2]
        and p.owner_id = auth.uid()
    )
  );