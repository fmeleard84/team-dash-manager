-- 1) Create project_events and project_event_attendees tables with RLS similar to project_flows

-- Create project_events table
CREATE TABLE IF NOT EXISTS public.project_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  location text,
  video_url text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create project_event_attendees table
CREATE TABLE IF NOT EXISTS public.project_event_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.project_events(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  email text,
  response_status text NOT NULL DEFAULT 'pending',
  required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_attendee_target CHECK (profile_id IS NOT NULL OR email IS NOT NULL),
  CONSTRAINT chk_response_status CHECK (response_status IN ('pending','accepted','declined','tentative'))
);

-- Timestamp trigger function already exists: public.update_updated_at_column
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_project_events_updated_at'
  ) THEN
    CREATE TRIGGER trg_update_project_events_updated_at
    BEFORE UPDATE ON public.project_events
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_project_event_attendees_updated_at'
  ) THEN
    CREATE TRIGGER trg_update_project_event_attendees_updated_at
    BEFORE UPDATE ON public.project_event_attendees
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.project_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_event_attendees ENABLE ROW LEVEL SECURITY;

-- Policies for project_events mirroring project_flows ownership
CREATE POLICY IF NOT EXISTS "Project owners can view their events"
ON public.project_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_events.project_id
      AND (
        p.keycloak_user_id = ((current_setting('request.headers', true))::jsonb ->> 'x-keycloak-sub')
        OR p.keycloak_user_id = ((current_setting('request.jwt.claims', true))::jsonb ->> 'sub')
      )
  )
);

CREATE POLICY IF NOT EXISTS "Project owners can create events"
ON public.project_events
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_events.project_id
      AND (
        p.keycloak_user_id = ((current_setting('request.headers', true))::jsonb ->> 'x-keycloak-sub')
        OR p.keycloak_user_id = ((current_setting('request.jwt.claims', true))::jsonb ->> 'sub')
      )
  )
  AND created_by = auth.uid()
);

CREATE POLICY IF NOT EXISTS "Project owners can update their events"
ON public.project_events
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_events.project_id
      AND (
        p.keycloak_user_id = ((current_setting('request.headers', true))::jsonb ->> 'x-keycloak-sub')
        OR p.keycloak_user_id = ((current_setting('request.jwt.claims', true))::jsonb ->> 'sub')
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_events.project_id
      AND (
        p.keycloak_user_id = ((current_setting('request.headers', true))::jsonb ->> 'x-keycloak-sub')
        OR p.keycloak_user_id = ((current_setting('request.jwt.claims', true))::jsonb ->> 'sub')
      )
  )
);

CREATE POLICY IF NOT EXISTS "Project owners can delete their events"
ON public.project_events
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_events.project_id
      AND (
        p.keycloak_user_id = ((current_setting('request.headers', true))::jsonb ->> 'x-keycloak-sub')
        OR p.keycloak_user_id = ((current_setting('request.jwt.claims', true))::jsonb ->> 'sub')
      )
  )
);

-- Policies for attendees
-- Owners can manage attendees of their events
CREATE POLICY IF NOT EXISTS "Project owners can manage attendees"
ON public.project_event_attendees
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.project_events e
    JOIN public.projects p ON p.id = e.project_id
    WHERE e.id = project_event_attendees.event_id
      AND (
        p.keycloak_user_id = ((current_setting('request.headers', true))::jsonb ->> 'x-keycloak-sub')
        OR p.keycloak_user_id = ((current_setting('request.jwt.claims', true))::jsonb ->> 'sub')
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_events e
    JOIN public.projects p ON p.id = e.project_id
    WHERE e.id = project_event_attendees.event_id
      AND (
        p.keycloak_user_id = ((current_setting('request.headers', true))::jsonb ->> 'x-keycloak-sub')
        OR p.keycloak_user_id = ((current_setting('request.jwt.claims', true))::jsonb ->> 'sub')
      )
  )
);

-- Attendees can view their own invitations when profile bound
CREATE POLICY IF NOT EXISTS "Attendees can view their invitations"
ON public.project_event_attendees
FOR SELECT
USING (
  profile_id = auth.uid()
);

-- 2) Create storage bucket for project files and RLS
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-files', 'project-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY IF NOT EXISTS "Owners can view project files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'project-files'
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id::text = (storage.foldername(name))[2]
      AND (
        p.keycloak_user_id = ((current_setting('request.headers', true))::jsonb ->> 'x-keycloak-sub')
        OR p.keycloak_user_id = ((current_setting('request.jwt.claims', true))::jsonb ->> 'sub')
      )
  )
);

CREATE POLICY IF NOT EXISTS "Owners can upload project files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'project-files'
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id::text = (storage.foldername(name))[2]
      AND (
        p.keycloak_user_id = ((current_setting('request.headers', true))::jsonb ->> 'x-keycloak-sub')
        OR p.keycloak_user_id = ((current_setting('request.jwt.claims', true))::jsonb ->> 'sub')
      )
  )
);

CREATE POLICY IF NOT EXISTS "Owners can update project files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'project-files'
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id::text = (storage.foldername(name))[2]
      AND (
        p.keycloak_user_id = ((current_setting('request.headers', true))::jsonb ->> 'x-keycloak-sub')
        OR p.keycloak_user_id = ((current_setting('request.jwt.claims', true))::jsonb ->> 'sub')
      )
  )
)
WITH CHECK (
  bucket_id = 'project-files'
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id::text = (storage.foldername(name))[2]
      AND (
        p.keycloak_user_id = ((current_setting('request.headers', true))::jsonb ->> 'x-keycloak-sub')
        OR p.keycloak_user_id = ((current_setting('request.jwt.claims', true))::jsonb ->> 'sub')
      )
  )
);

CREATE POLICY IF NOT EXISTS "Owners can delete project files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'project-files'
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id::text = (storage.foldername(name))[2]
      AND (
        p.keycloak_user_id = ((current_setting('request.headers', true))::jsonb ->> 'x-keycloak-sub')
        OR p.keycloak_user_id = ((current_setting('request.jwt.claims', true))::jsonb ->> 'sub')
      )
  )
);

