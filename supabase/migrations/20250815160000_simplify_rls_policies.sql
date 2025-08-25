-- Simplification des politiques RLS - Correction des récursions et optimisation des performances
-- Migration créée le: 2025-08-15

-- =============================================================================
-- 1. FONCTIONS HELPER SÉCURISÉES (Non-récursives)
-- =============================================================================

-- Fonction pour récupérer l'email utilisateur de façon sécurisée
CREATE OR REPLACE FUNCTION auth.get_current_user_email()
RETURNS TEXT
SECURITY DEFINER
SET search_path = auth, public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Récupération depuis JWT token ou user metadata
  SELECT 
    COALESCE(
      (current_setting('request.jwt.claims', true)::json->>'email')::text,
      (current_setting('request.headers', true)::json->>'x-user-email')::text,
      auth.uid()::text
    ) INTO user_email;
  
  RETURN user_email;
END;
$$;

-- Fonction pour récupérer le rôle utilisateur de façon sécurisée
CREATE OR REPLACE FUNCTION auth.get_current_user_role()
RETURNS TEXT
SECURITY DEFINER
SET search_path = auth, public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Récupération depuis JWT token ou headers
  SELECT 
    COALESCE(
      (current_setting('request.jwt.claims', true)::json->>'role')::text,
      (current_setting('request.headers', true)::json->>'x-user-role')::text,
      'candidate'
    ) INTO user_role;
  
  RETURN user_role;
END;
$$;

-- Fonction pour vérifier si l'utilisateur est propriétaire d'un projet
CREATE OR REPLACE FUNCTION public.is_project_owner(project_id UUID, user_email TEXT DEFAULT NULL)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, auth, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  check_email TEXT;
BEGIN
  check_email := COALESCE(user_email, auth.get_current_user_email());
  
  RETURN EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = project_id AND owner_id = check_email
  );
END;
$$;

-- Fonction pour vérifier si l'utilisateur est membre d'un projet
CREATE OR REPLACE FUNCTION public.is_project_member(project_id UUID, user_email TEXT DEFAULT NULL)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, auth, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  check_email TEXT;
BEGIN
  check_email := COALESCE(user_email, auth.get_current_user_email());
  
  RETURN EXISTS (
    SELECT 1 FROM public.project_teams 
    WHERE project_id = project_id AND member_email = check_email
  ) OR public.is_project_owner(project_id, check_email);
END;
$$;

-- =============================================================================
-- 2. SUPPRESSION DES ANCIENNES POLITIQUES PROBLÉMATIQUES
-- =============================================================================

-- Projects: Supprimer les politiques trop permissives
DROP POLICY IF EXISTS "Allow all operations on projects" ON public.projects;
DROP POLICY IF EXISTS "Anyone can view projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can manage all projects" ON public.projects;

-- Candidate Profiles: Supprimer les politiques récursives
DROP POLICY IF EXISTS "Candidates can view their own profile" ON public.candidate_profiles;
DROP POLICY IF EXISTS "Admins can view all candidate profiles" ON public.candidate_profiles;
DROP POLICY IF EXISTS "Candidates can update their own profile" ON public.candidate_profiles;

-- Kanban: Supprimer les politiques complexes
DROP POLICY IF EXISTS "Users can view kanban boards for their projects" ON public.kanban_boards;
DROP POLICY IF EXISTS "Users can manage kanban content for their projects" ON public.kanban_cards;

-- Messages: Supprimer les politiques avec joins complexes
DROP POLICY IF EXISTS "Users can view message threads they participate in" ON public.message_threads;
DROP POLICY IF EXISTS "Users can view messages in threads they participate in" ON public.messages;

-- Storage: Supprimer les politiques avec triple JOIN
DROP POLICY IF EXISTS "Project members can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Project members can view files" ON storage.objects;

-- =============================================================================
-- 3. NOUVELLES POLITIQUES RLS SIMPLIFIÉES
-- =============================================================================

-- PROJECTS: Politiques simples basées sur ownership et membership
CREATE POLICY "projects_select_policy" ON public.projects
  FOR SELECT
  USING (
    auth.get_current_user_role() = 'admin' 
    OR owner_id = auth.get_current_user_email()
    OR public.is_project_member(id)
  );

CREATE POLICY "projects_insert_policy" ON public.projects
  FOR INSERT
  WITH CHECK (
    auth.get_current_user_role() IN ('admin', 'client')
    AND owner_id = auth.get_current_user_email()
  );

CREATE POLICY "projects_update_policy" ON public.projects
  FOR UPDATE
  USING (
    auth.get_current_user_role() = 'admin'
    OR (owner_id = auth.get_current_user_email() AND auth.get_current_user_role() = 'client')
  );

CREATE POLICY "projects_delete_policy" ON public.projects
  FOR DELETE
  USING (
    auth.get_current_user_role() = 'admin'
    OR owner_id = auth.get_current_user_email()
  );

-- CANDIDATE PROFILES: Politiques non-récursives
CREATE POLICY "candidate_profiles_select_policy" ON public.candidate_profiles
  FOR SELECT
  USING (
    auth.get_current_user_role() = 'admin'
    OR email = auth.get_current_user_email()
    OR auth.get_current_user_role() = 'hr_manager'
  );

CREATE POLICY "candidate_profiles_insert_policy" ON public.candidate_profiles
  FOR INSERT
  WITH CHECK (
    email = auth.get_current_user_email()
    OR auth.get_current_user_role() = 'admin'
  );

CREATE POLICY "candidate_profiles_update_policy" ON public.candidate_profiles
  FOR UPDATE
  USING (
    email = auth.get_current_user_email()
    OR auth.get_current_user_role() = 'admin'
  );

-- KANBAN BOARDS: Politiques basées sur project membership
CREATE POLICY "kanban_boards_select_policy" ON public.kanban_boards
  FOR SELECT
  USING (
    auth.get_current_user_role() = 'admin'
    OR public.is_project_member(project_id)
  );

CREATE POLICY "kanban_boards_insert_policy" ON public.kanban_boards
  FOR INSERT
  WITH CHECK (
    auth.get_current_user_role() = 'admin'
    OR public.is_project_owner(project_id)
  );

CREATE POLICY "kanban_boards_update_policy" ON public.kanban_boards
  FOR UPDATE
  USING (
    auth.get_current_user_role() = 'admin'
    OR public.is_project_member(project_id)
  );

-- KANBAN COLUMNS: Héritent des permissions du board
CREATE POLICY "kanban_columns_policy" ON public.kanban_columns
  FOR ALL
  USING (
    auth.get_current_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.kanban_boards kb
      WHERE kb.id = board_id 
      AND public.is_project_member(kb.project_id)
    )
  );

-- KANBAN CARDS: Héritent des permissions du board
CREATE POLICY "kanban_cards_policy" ON public.kanban_cards
  FOR ALL
  USING (
    auth.get_current_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.kanban_boards kb
      WHERE kb.id = board_id 
      AND public.is_project_member(kb.project_id)
    )
  );

-- MESSAGE THREADS: Politiques simplifiées
CREATE POLICY "message_threads_select_policy" ON public.message_threads
  FOR SELECT
  USING (
    auth.get_current_user_role() = 'admin'
    OR public.is_project_member(project_id)
  );

CREATE POLICY "message_threads_insert_policy" ON public.message_threads
  FOR INSERT
  WITH CHECK (
    public.is_project_member(project_id)
  );

-- MESSAGES: Basées sur les permissions du thread
CREATE POLICY "messages_select_policy" ON public.messages
  FOR SELECT
  USING (
    auth.get_current_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.message_threads mt
      WHERE mt.id = thread_id
      AND public.is_project_member(mt.project_id)
    )
  );

CREATE POLICY "messages_insert_policy" ON public.messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.message_threads mt
      WHERE mt.id = thread_id
      AND public.is_project_member(mt.project_id)
    )
  );

-- STORAGE: Politiques simplifiées pour project-files
CREATE POLICY "project_files_select_policy" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'project-files'
    AND (
      auth.get_current_user_role() = 'admin'
      OR EXISTS (
        SELECT 1 FROM public.project_files pf
        WHERE pf.file_path = name
        AND public.is_project_member(pf.project_id)
      )
    )
  );

CREATE POLICY "project_files_insert_policy" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'project-files'
    AND auth.get_current_user_email() IS NOT NULL
  );

-- =============================================================================
-- 4. OPTIMISATIONS D'INDEX POUR LES NOUVELLES POLITIQUES
-- =============================================================================

-- Index pour optimiser les vérifications de membership
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_teams_project_member 
ON public.project_teams(project_id, member_email);

-- Index pour optimiser les lookups kanban
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kanban_boards_project 
ON public.kanban_boards(project_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kanban_columns_board 
ON public.kanban_columns(board_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kanban_cards_board 
ON public.kanban_cards(board_id);

-- Index pour optimiser les message threads
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_threads_project 
ON public.message_threads(project_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_thread 
ON public.messages(thread_id);

-- =============================================================================
-- 5. VALIDATION ET COMMENTAIRES
-- =============================================================================

-- Ajouter des commentaires pour la maintenance
COMMENT ON FUNCTION auth.get_current_user_email() IS 'Helper function to get current user email in a non-recursive way';
COMMENT ON FUNCTION auth.get_current_user_role() IS 'Helper function to get current user role from JWT or headers';
COMMENT ON FUNCTION public.is_project_owner(UUID, TEXT) IS 'Check if user is owner of a project';
COMMENT ON FUNCTION public.is_project_member(UUID, TEXT) IS 'Check if user is member or owner of a project';

-- Logs pour le suivi
INSERT INTO public.migration_logs (migration_name, applied_at, description) 
VALUES (
  '20250815160000_simplify_rls_policies',
  NOW(),
  'Simplified RLS policies: removed recursions, optimized performance, added helper functions'
) ON CONFLICT DO NOTHING;