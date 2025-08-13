-- Remove Keycloak-dependent policies and shift to Supabase auth (auth.uid())

-- 1) Projects: add owner_id, relax legacy column, set owner via trigger, update RLS
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='projects' AND column_name='owner_id'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN owner_id uuid;
  END IF;
END $$;

-- Allow inserts without legacy user_id
ALTER TABLE public.projects ALTER COLUMN user_id DROP NOT NULL;

-- Function to set owner_id on insert
CREATE OR REPLACE FUNCTION public.set_projects_owner_id()
RETURNS trigger AS $$
BEGIN
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger
DROP TRIGGER IF EXISTS trg_set_projects_owner_id ON public.projects;
CREATE TRIGGER trg_set_projects_owner_id
BEFORE INSERT ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.set_projects_owner_id();

-- Enable RLS (already enabled, but ensure)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Drop old policies referencing keycloak headers
DO $$
BEGIN
  PERFORM 1 FROM pg_policies WHERE schemaname='public' AND tablename='projects' AND policyname='Project owners can delete';
  IF FOUND THEN EXECUTE 'DROP POLICY "Project owners can delete" ON public.projects'; END IF;
  PERFORM 1 FROM pg_policies WHERE schemaname='public' AND tablename='projects' AND policyname='Project owners can insert';
  IF FOUND THEN EXECUTE 'DROP POLICY "Project owners can insert" ON public.projects'; END IF;
  PERFORM 1 FROM pg_policies WHERE schemaname='public' AND tablename='projects' AND policyname='Project owners can select their projects';
  IF FOUND THEN EXECUTE 'DROP POLICY "Project owners can select their projects" ON public.projects'; END IF;
  PERFORM 1 FROM pg_policies WHERE schemaname='public' AND tablename='projects' AND policyname='Project owners can update';
  IF FOUND THEN EXECUTE 'DROP POLICY "Project owners can update" ON public.projects'; END IF;
END $$;

-- New owner-based policies
CREATE POLICY "Projects: owners can select"
ON public.projects
FOR SELECT
USING (owner_id = auth.uid());

CREATE POLICY "Projects: owners can insert"
ON public.projects
FOR INSERT
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Projects: owners can update"
ON public.projects
FOR UPDATE
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Projects: owners can delete"
ON public.projects
FOR DELETE
USING (owner_id = auth.uid());

-- 2) Update dependent tables' policies to check projects.owner_id

-- hr_resource_assignments
DO $$
BEGIN
  PERFORM 1 FROM pg_policies WHERE schemaname='public' AND tablename='hr_resource_assignments' AND policyname like 'Project owners can manage resource assignments%';
  IF FOUND THEN EXECUTE 'DROP POLICY "Project owners can manage resource assignments (JWT fallback)" ON public.hr_resource_assignments'; END IF;
END $$;

CREATE POLICY "Owners manage resource assignments"
ON public.hr_resource_assignments
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = hr_resource_assignments.project_id
    AND p.owner_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = hr_resource_assignments.project_id
    AND p.owner_id = auth.uid()
));

-- nextcloud_projects
DO $$
BEGIN
  PERFORM 1 FROM pg_policies WHERE schemaname='public' AND tablename='nextcloud_projects';
  IF FOUND THEN 
    EXECUTE 'DROP POLICY IF EXISTS "Owners can delete nextcloud entries" ON public.nextcloud_projects';
    EXECUTE 'DROP POLICY IF EXISTS "Owners can insert nextcloud entries" ON public.nextcloud_projects';
    EXECUTE 'DROP POLICY IF EXISTS "Owners can update nextcloud entries" ON public.nextcloud_projects';
    EXECUTE 'DROP POLICY IF EXISTS "Owners can view nextcloud entries" ON public.nextcloud_projects';
  END IF;
END $$;

CREATE POLICY "Owners manage nextcloud entries"
ON public.nextcloud_projects
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = nextcloud_projects.project_id
    AND p.owner_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = nextcloud_projects.project_id
    AND p.owner_id = auth.uid()
));

-- planka_projects
DO $$
BEGIN
  PERFORM 1 FROM pg_policies WHERE schemaname='public' AND tablename='planka_projects';
  IF FOUND THEN 
    EXECUTE 'DROP POLICY IF EXISTS "Owners can delete planka entries" ON public.planka_projects';
    EXECUTE 'DROP POLICY IF EXISTS "Owners can insert planka entries" ON public.planka_projects';
    EXECUTE 'DROP POLICY IF EXISTS "Owners can update planka entries" ON public.planka_projects';
    EXECUTE 'DROP POLICY IF EXISTS "Owners can view planka entries" ON public.planka_projects';
  END IF;
END $$;

CREATE POLICY "Owners manage planka entries"
ON public.planka_projects
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = planka_projects.project_id
    AND p.owner_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = planka_projects.project_id
    AND p.owner_id = auth.uid()
));

-- project_events
DO $$
BEGIN
  PERFORM 1 FROM pg_policies WHERE schemaname='public' AND tablename='project_events';
  IF FOUND THEN 
    EXECUTE 'DROP POLICY IF EXISTS "Project owners can create events" ON public.project_events';
    EXECUTE 'DROP POLICY IF EXISTS "Project owners can delete their events" ON public.project_events';
    EXECUTE 'DROP POLICY IF EXISTS "Project owners can update their events" ON public.project_events';
    EXECUTE 'DROP POLICY IF EXISTS "Project owners can view their events" ON public.project_events';
  END IF;
END $$;

CREATE POLICY "Owners insert events"
ON public.project_events
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = project_events.project_id
    AND p.owner_id = auth.uid()
) AND created_by = auth.uid());

CREATE POLICY "Owners update events"
ON public.project_events
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = project_events.project_id
    AND p.owner_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = project_events.project_id
    AND p.owner_id = auth.uid()
));

CREATE POLICY "Owners delete events"
ON public.project_events
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = project_events.project_id
    AND p.owner_id = auth.uid()
));

CREATE POLICY "Owners select events"
ON public.project_events
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = project_events.project_id
    AND p.owner_id = auth.uid()
));

-- project_event_attendees
DO $$
BEGIN
  PERFORM 1 FROM pg_policies WHERE schemaname='public' AND tablename='project_event_attendees' AND policyname='Project owners can manage attendees';
  IF FOUND THEN EXECUTE 'DROP POLICY "Project owners can manage attendees" ON public.project_event_attendees'; END IF;
END $$;

CREATE POLICY "Owners manage attendees"
ON public.project_event_attendees
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.project_events e JOIN public.projects p ON p.id = e.project_id
  WHERE e.id = project_event_attendees.event_id AND p.owner_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.project_events e JOIN public.projects p ON p.id = e.project_id
  WHERE e.id = project_event_attendees.event_id AND p.owner_id = auth.uid()
));

-- project_flows
DO $$
BEGIN
  PERFORM 1 FROM pg_policies WHERE schemaname='public' AND tablename='project_flows';
  IF FOUND THEN 
    EXECUTE 'DROP POLICY IF EXISTS "Project owners can create project flows" ON public.project_flows';
    EXECUTE 'DROP POLICY IF EXISTS "Project owners can delete their project flows" ON public.project_flows';
    EXECUTE 'DROP POLICY IF EXISTS "Project owners can update their project flows" ON public.project_flows';
    EXECUTE 'DROP POLICY IF EXISTS "Project owners can view their project flows" ON public.project_flows';
  END IF;
END $$;

CREATE POLICY "Owners insert flows"
ON public.project_flows
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = project_flows.project_id
    AND p.owner_id = auth.uid()
));

CREATE POLICY "Owners update flows"
ON public.project_flows
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = project_flows.project_id
    AND p.owner_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = project_flows.project_id
    AND p.owner_id = auth.uid()
));

CREATE POLICY "Owners delete flows"
ON public.project_flows
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = project_flows.project_id
    AND p.owner_id = auth.uid()
));

CREATE POLICY "Owners select flows"
ON public.project_flows
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = project_flows.project_id
    AND p.owner_id = auth.uid()
));

-- project_bookings owner visibility
DO $$
BEGIN
  PERFORM 1 FROM pg_policies WHERE schemaname='public' AND tablename='project_bookings' AND policyname='Owners can view project bookings';
  IF FOUND THEN EXECUTE 'DROP POLICY "Owners can view project bookings" ON public.project_bookings'; END IF;
END $$;

CREATE POLICY "Owners select bookings"
ON public.project_bookings
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = project_bookings.project_id
    AND p.owner_id = auth.uid()
));