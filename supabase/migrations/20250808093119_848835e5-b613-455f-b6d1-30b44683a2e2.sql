-- Create nextcloud_projects table to persist Nextcloud workspace links per project
CREATE TABLE IF NOT EXISTS public.nextcloud_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  nextcloud_url TEXT NOT NULL,
  folder_path TEXT,
  talk_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure one entry per project
CREATE UNIQUE INDEX IF NOT EXISTS idx_nextcloud_projects_project_id ON public.nextcloud_projects(project_id);

-- Enable RLS
ALTER TABLE public.nextcloud_projects ENABLE ROW LEVEL SECURITY;

-- RLS policies similar to planka_projects: allow access if related project exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'nextcloud_projects' AND policyname = 'Users can view their nextcloud projects'
  ) THEN
    CREATE POLICY "Users can view their nextcloud projects"
    ON public.nextcloud_projects
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = nextcloud_projects.project_id
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'nextcloud_projects' AND policyname = 'Users can insert their nextcloud projects'
  ) THEN
    CREATE POLICY "Users can insert their nextcloud projects"
    ON public.nextcloud_projects
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = nextcloud_projects.project_id
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'nextcloud_projects' AND policyname = 'Users can update their nextcloud projects'
  ) THEN
    CREATE POLICY "Users can update their nextcloud projects"
    ON public.nextcloud_projects
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = nextcloud_projects.project_id
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'nextcloud_projects' AND policyname = 'Users can delete their nextcloud projects'
  ) THEN
    CREATE POLICY "Users can delete their nextcloud projects"
    ON public.nextcloud_projects
    FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = nextcloud_projects.project_id
      )
    );
  END IF;
END $$;