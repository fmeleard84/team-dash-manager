-- Création des tables Drive pour le stockage des fichiers et dossiers
-- Ces tables sont nécessaires pour l'intégration Drive et la sauvegarde des livrables IA

-- Table pour les dossiers du Drive
CREATE TABLE IF NOT EXISTS public.drive_folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  folder_name TEXT NOT NULL,
  folder_path TEXT NOT NULL UNIQUE,
  parent_folder TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_ai_folder BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Table pour les fichiers du Drive/Kanban
CREATE TABLE IF NOT EXISTS public.kanban_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  folder_path TEXT,
  is_ai_generated BOOLEAN DEFAULT FALSE,
  ai_member_name TEXT,
  content_type TEXT,
  card_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(project_id, file_path)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_drive_folders_project_id ON public.drive_folders(project_id);
CREATE INDEX IF NOT EXISTS idx_drive_folders_folder_path ON public.drive_folders(folder_path);
CREATE INDEX IF NOT EXISTS idx_kanban_files_project_id ON public.kanban_files(project_id);
CREATE INDEX IF NOT EXISTS idx_kanban_files_folder_path ON public.kanban_files(folder_path);
CREATE INDEX IF NOT EXISTS idx_kanban_files_uploaded_by ON public.kanban_files(uploaded_by);

-- RLS Policies pour drive_folders
ALTER TABLE public.drive_folders ENABLE ROW LEVEL SECURITY;

-- Policy pour voir les dossiers d'un projet
CREATE POLICY "view_project_folders" ON public.drive_folders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
      AND (
        p.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.hr_resource_assignments hra
          WHERE hra.project_id = p.id
          AND hra.candidate_id = auth.uid()
          AND hra.booking_status = 'accepted'
        )
      )
    )
  );

-- Policy pour créer des dossiers (membres du projet)
CREATE POLICY "create_project_folders" ON public.drive_folders
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
      AND (
        p.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.hr_resource_assignments hra
          WHERE hra.project_id = p.id
          AND hra.candidate_id = auth.uid()
          AND hra.booking_status = 'accepted'
        )
      )
    )
  );

-- Policy pour modifier les dossiers (créateur uniquement)
CREATE POLICY "update_own_folders" ON public.drive_folders
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Policy pour supprimer les dossiers (créateur ou owner du projet)
CREATE POLICY "delete_project_folders" ON public.drive_folders
  FOR DELETE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
      AND p.owner_id = auth.uid()
    )
  );

-- RLS Policies pour kanban_files
ALTER TABLE public.kanban_files ENABLE ROW LEVEL SECURITY;

-- Policy pour voir les fichiers d'un projet
CREATE POLICY "view_project_files" ON public.kanban_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
      AND (
        p.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.hr_resource_assignments hra
          WHERE hra.project_id = p.id
          AND hra.candidate_id = auth.uid()
          AND hra.booking_status = 'accepted'
        )
      )
    )
  );

-- Policy pour uploader des fichiers (membres du projet)
CREATE POLICY "upload_project_files" ON public.kanban_files
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
      AND (
        p.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.hr_resource_assignments hra
          WHERE hra.project_id = p.id
          AND hra.candidate_id = auth.uid()
          AND hra.booking_status = 'accepted'
        )
      )
    )
  );

-- Policy pour modifier les métadonnées des fichiers (uploader uniquement)
CREATE POLICY "update_own_files" ON public.kanban_files
  FOR UPDATE
  USING (uploaded_by = auth.uid())
  WITH CHECK (uploaded_by = auth.uid());

-- Policy pour supprimer les fichiers (uploader ou owner du projet)
CREATE POLICY "delete_project_files" ON public.kanban_files
  FOR DELETE
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
      AND p.owner_id = auth.uid()
    )
  );

-- Policy spéciale pour le service role (Edge Functions, IA)
CREATE POLICY "service_role_all_access_folders" ON public.drive_folders
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "service_role_all_access_files" ON public.kanban_files
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Créer le dossier racine pour chaque projet existant
INSERT INTO public.drive_folders (project_id, folder_name, folder_path, parent_folder, is_ai_folder)
SELECT
  p.id,
  'IA',
  'projects/' || p.id || '/IA',
  'projects/' || p.id,
  TRUE
FROM public.projects p
WHERE NOT EXISTS (
  SELECT 1 FROM public.drive_folders df
  WHERE df.project_id = p.id
  AND df.folder_name = 'IA'
)
ON CONFLICT DO NOTHING;