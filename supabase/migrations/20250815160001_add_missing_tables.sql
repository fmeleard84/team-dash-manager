-- Tables manquantes pour le système RLS simplifié
-- Migration créée le: 2025-08-15

-- =============================================================================
-- 1. TABLE MIGRATION_LOGS pour le suivi des migrations
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.migration_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    migration_name TEXT NOT NULL UNIQUE,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS pour migration_logs (lecture seule pour admins)
ALTER TABLE public.migration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "migration_logs_admin_read" ON public.migration_logs
  FOR SELECT
  USING (auth.get_current_user_role() = 'admin');

-- =============================================================================
-- 2. TABLE PROJECT_FILES pour la gestion des fichiers (si elle n'existe pas)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.project_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    file_size BIGINT,
    file_type TEXT,
    uploaded_by TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_public BOOLEAN DEFAULT FALSE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les lookups fréquents
CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON public.project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_uploaded_by ON public.project_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_project_files_path ON public.project_files(file_path);

-- RLS pour project_files
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_files_select_policy" ON public.project_files
  FOR SELECT
  USING (
    auth.get_current_user_role() = 'admin'
    OR is_public = true
    OR public.is_project_member(project_id)
  );

CREATE POLICY "project_files_insert_policy" ON public.project_files
  FOR INSERT
  WITH CHECK (
    public.is_project_member(project_id)
    AND uploaded_by = auth.get_current_user_email()
  );

CREATE POLICY "project_files_update_policy" ON public.project_files
  FOR UPDATE
  USING (
    auth.get_current_user_role() = 'admin'
    OR (uploaded_by = auth.get_current_user_email() AND public.is_project_member(project_id))
  );

CREATE POLICY "project_files_delete_policy" ON public.project_files
  FOR DELETE
  USING (
    auth.get_current_user_role() = 'admin'
    OR uploaded_by = auth.get_current_user_email()
  );

-- Trigger pour updated_at
CREATE TRIGGER update_project_files_updated_at 
  BEFORE UPDATE ON public.project_files
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =============================================================================
-- 3. VERIFICATION DES TABLES PROJECT_TEAMS (nécessaire pour les nouvelles politiques)
-- =============================================================================

-- Vérifier si la table project_teams existe, sinon la créer
CREATE TABLE IF NOT EXISTS public.project_teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    member_email TEXT NOT NULL,
    member_name TEXT,
    member_role TEXT DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, member_email)
);

-- Index pour optimiser les vérifications RLS
CREATE INDEX IF NOT EXISTS idx_project_teams_project_member 
ON public.project_teams(project_id, member_email);

-- RLS pour project_teams
ALTER TABLE public.project_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_teams_select_policy" ON public.project_teams
  FOR SELECT
  USING (
    auth.get_current_user_role() = 'admin'
    OR member_email = auth.get_current_user_email()
    OR public.is_project_owner(project_id)
  );

CREATE POLICY "project_teams_insert_policy" ON public.project_teams
  FOR INSERT
  WITH CHECK (
    auth.get_current_user_role() = 'admin'
    OR public.is_project_owner(project_id)
  );

CREATE POLICY "project_teams_update_policy" ON public.project_teams
  FOR UPDATE
  USING (
    auth.get_current_user_role() = 'admin'
    OR public.is_project_owner(project_id)
  );

CREATE POLICY "project_teams_delete_policy" ON public.project_teams
  FOR DELETE
  USING (
    auth.get_current_user_role() = 'admin'
    OR public.is_project_owner(project_id)
    OR member_email = auth.get_current_user_email()
  );

-- =============================================================================
-- 4. CORRECTIONS POUR LES TABLES HR (si nécessaires)
-- =============================================================================

-- Assurer que les tables HR ont des politiques cohérentes
DROP POLICY IF EXISTS "Allow all operations on hr_categories" ON public.hr_categories;
DROP POLICY IF EXISTS "Allow all operations on hr_profiles" ON public.hr_profiles;
DROP POLICY IF EXISTS "Allow all operations on hr_expertises" ON public.hr_expertises;
DROP POLICY IF EXISTS "Allow all operations on hr_languages" ON public.hr_languages;

-- Politiques HR simplifiées (lecture pour tous, écriture pour admins/hr_managers)
CREATE POLICY "hr_categories_select_policy" ON public.hr_categories
  FOR SELECT USING (true);

CREATE POLICY "hr_categories_modify_policy" ON public.hr_categories
  FOR ALL
  USING (auth.get_current_user_role() IN ('admin', 'hr_manager'));

CREATE POLICY "hr_profiles_select_policy" ON public.hr_profiles
  FOR SELECT USING (true);

CREATE POLICY "hr_profiles_modify_policy" ON public.hr_profiles
  FOR ALL
  USING (auth.get_current_user_role() IN ('admin', 'hr_manager'));

CREATE POLICY "hr_expertises_select_policy" ON public.hr_expertises
  FOR SELECT USING (true);

CREATE POLICY "hr_expertises_modify_policy" ON public.hr_expertises
  FOR ALL
  USING (auth.get_current_user_role() IN ('admin', 'hr_manager'));

CREATE POLICY "hr_languages_select_policy" ON public.hr_languages
  FOR SELECT USING (true);

CREATE POLICY "hr_languages_modify_policy" ON public.hr_languages
  FOR ALL
  USING (auth.get_current_user_role() IN ('admin', 'hr_manager'));

-- =============================================================================
-- 5. LOG DE LA MIGRATION
-- =============================================================================

INSERT INTO public.migration_logs (migration_name, applied_at, description) 
VALUES (
  '20250815160001_add_missing_tables',
  NOW(),
  'Added missing tables: migration_logs, project_files, project_teams with simplified RLS policies'
) ON CONFLICT (migration_name) DO NOTHING;