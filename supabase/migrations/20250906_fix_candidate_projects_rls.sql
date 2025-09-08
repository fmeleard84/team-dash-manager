-- Migration pour corriger les règles RLS des candidats sur les projets
-- Problème: Les candidats ne peuvent pas voir leurs projets assignés
-- Solution: Créer des policies appropriées avec le nouveau système d'ID unifié

-- ========================================
-- 1. NETTOYER LES ANCIENNES POLICIES
-- ========================================

-- Policies sur projects
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Clients can view their projects" ON projects;
DROP POLICY IF EXISTS "Candidats voient projets où ils sont assignés" ON projects;
DROP POLICY IF EXISTS "Candidats accèdent à leurs projets acceptés" ON projects;
DROP POLICY IF EXISTS "Users can view projects they are assigned to" ON projects;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON projects;

-- Policies sur hr_resource_assignments  
DROP POLICY IF EXISTS "Candidats voient leurs assignations" ON hr_resource_assignments;
DROP POLICY IF EXISTS "Candidats peuvent voir leurs propres assignations" ON hr_resource_assignments;
DROP POLICY IF EXISTS "Users can view resource assignments for their projects" ON hr_resource_assignments;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON hr_resource_assignments;
DROP POLICY IF EXISTS "Candidats peuvent accepter/refuser" ON hr_resource_assignments;

-- ========================================
-- 2. CRÉER LES NOUVELLES POLICIES POUR PROJECTS
-- ========================================

-- Policy pour les clients (propriétaires de projets)
CREATE POLICY "Clients voient leurs propres projets"
ON projects FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Policy pour les candidats assignés aux projets
CREATE POLICY "Candidats voient projets où ils sont acceptés"
ON projects FOR SELECT
TO authenticated
USING (
  -- Vérifier que le candidat est assigné et a accepté
  EXISTS (
    SELECT 1 
    FROM hr_resource_assignments hra
    WHERE hra.project_id = projects.id
      AND hra.candidate_id = auth.uid()
      AND hra.booking_status = 'accepted'
  )
  -- Le projet doit être dans un statut approprié (pas en pause)
  AND projects.status IN ('attente-team', 'play', 'completed')
);

-- Policy pour les admins/HR (optionnel, si nécessaire)
CREATE POLICY "Admins voient tous les projets"
ON projects FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'hr')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'hr')
  )
);

-- ========================================
-- 3. CRÉER LES POLICIES POUR HR_RESOURCE_ASSIGNMENTS
-- ========================================

-- Policy pour les clients (voir les assignations de leurs projets)
CREATE POLICY "Clients voient assignations de leurs projets"
ON hr_resource_assignments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = hr_resource_assignments.project_id
    AND projects.owner_id = auth.uid()
  )
);

-- Policy pour les candidats (voir et modifier leurs propres assignations)
CREATE POLICY "Candidats voient leurs assignations"
ON hr_resource_assignments FOR SELECT
TO authenticated
USING (candidate_id = auth.uid());

-- Policy pour permettre aux candidats d'accepter/refuser
CREATE POLICY "Candidats peuvent accepter ou refuser"
ON hr_resource_assignments FOR UPDATE
TO authenticated
USING (
  candidate_id = auth.uid()
  -- Peut seulement modifier si c'est en recherche
  AND booking_status = 'recherche'
)
WITH CHECK (
  candidate_id = auth.uid()
  -- Peut seulement passer à accepted ou declined
  AND booking_status IN ('accepted', 'declined')
);

-- Policy pour les admins/HR
CREATE POLICY "Admins gèrent toutes les assignations"
ON hr_resource_assignments FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'hr')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'hr')
  )
);

-- ========================================
-- 4. CRÉER LES POLICIES POUR LES TABLES ASSOCIÉES
-- ========================================

-- Policies pour project_events (planning, etc.)
DROP POLICY IF EXISTS "Users can view events for their projects" ON project_events;

CREATE POLICY "Utilisateurs voient événements de leurs projets"
ON project_events FOR SELECT
TO authenticated
USING (
  -- Client propriétaire
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_events.project_id
    AND projects.owner_id = auth.uid()
  )
  OR
  -- Candidat assigné et accepté
  EXISTS (
    SELECT 1 
    FROM hr_resource_assignments hra
    JOIN projects p ON p.id = hra.project_id
    WHERE hra.project_id = project_events.project_id
      AND hra.candidate_id = auth.uid()
      AND hra.booking_status = 'accepted'
      AND p.status IN ('attente-team', 'play', 'completed')
  )
);

-- Policies pour kanban_columns
DROP POLICY IF EXISTS "Users can view kanban columns for their projects" ON kanban_columns;

CREATE POLICY "Utilisateurs voient colonnes kanban de leurs projets"
ON kanban_columns FOR SELECT
TO authenticated
USING (
  -- Client propriétaire
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = kanban_columns.project_id
    AND projects.owner_id = auth.uid()
  )
  OR
  -- Candidat assigné sur projet actif
  EXISTS (
    SELECT 1 
    FROM hr_resource_assignments hra
    JOIN projects p ON p.id = hra.project_id
    WHERE hra.project_id = kanban_columns.project_id
      AND hra.candidate_id = auth.uid()
      AND hra.booking_status = 'accepted'
      AND p.status = 'play'  -- Kanban seulement pour projets actifs
  )
);

-- Policies pour kanban_tasks
DROP POLICY IF EXISTS "Users can view kanban tasks for their projects" ON kanban_tasks;

CREATE POLICY "Utilisateurs voient tâches kanban de leurs projets"
ON kanban_tasks FOR SELECT
TO authenticated
USING (
  -- Via la colonne kanban
  EXISTS (
    SELECT 1 
    FROM kanban_columns kc
    JOIN projects p ON p.id = kc.project_id
    WHERE kc.id = kanban_tasks.column_id
    AND (
      p.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM hr_resource_assignments hra
        WHERE hra.project_id = p.id
          AND hra.candidate_id = auth.uid()
          AND hra.booking_status = 'accepted'
          AND p.status = 'play'
      )
    )
  )
);

-- Policies pour messages
DROP POLICY IF EXISTS "Users can view messages for their projects" ON messages;

CREATE POLICY "Utilisateurs voient messages de leurs projets"
ON messages FOR SELECT
TO authenticated
USING (
  -- Client propriétaire
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = messages.project_id
    AND projects.owner_id = auth.uid()
  )
  OR
  -- Candidat assigné sur projet actif
  EXISTS (
    SELECT 1 
    FROM hr_resource_assignments hra
    JOIN projects p ON p.id = hra.project_id
    WHERE hra.project_id = messages.project_id
      AND hra.candidate_id = auth.uid()
      AND hra.booking_status = 'accepted'
      AND p.status = 'play'  -- Messages seulement pour projets actifs
  )
);

-- ========================================
-- 5. VÉRIFIER ET CORRIGER LES CONTRAINTES FK
-- ========================================

-- S'assurer que les FK utilisent bien le nouveau système d'ID unifié
ALTER TABLE hr_resource_assignments 
DROP CONSTRAINT IF EXISTS hr_resource_assignments_candidate_id_fkey CASCADE;

ALTER TABLE hr_resource_assignments 
ADD CONSTRAINT hr_resource_assignments_candidate_id_fkey 
FOREIGN KEY (candidate_id) 
REFERENCES candidate_profiles(id) 
ON DELETE CASCADE;

-- ========================================
-- 6. ACTIVER RLS SUR TOUTES LES TABLES
-- ========================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_resource_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 7. CRÉER UNE FONCTION DE VÉRIFICATION
-- ========================================

CREATE OR REPLACE FUNCTION check_candidate_project_access(
  p_candidate_id UUID,
  p_project_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM hr_resource_assignments hra
    JOIN projects p ON p.id = hra.project_id
    WHERE hra.candidate_id = p_candidate_id
      AND hra.project_id = p_project_id
      AND hra.booking_status = 'accepted'
      AND p.status IN ('attente-team', 'play', 'completed')
  );
END;
$$;

-- Donner les permissions d'exécution
GRANT EXECUTE ON FUNCTION check_candidate_project_access TO authenticated;

-- ========================================
-- 8. LOGS ET COMMENTAIRES
-- ========================================

COMMENT ON POLICY "Candidats voient projets où ils sont acceptés" ON projects IS 
'Permet aux candidats de voir les projets où ils ont accepté une mission. Nécessite booking_status = accepted et project.status approprié';

COMMENT ON POLICY "Candidats peuvent accepter ou refuser" ON hr_resource_assignments IS 
'Permet aux candidats de passer leur statut de recherche à accepted ou declined';

COMMENT ON FUNCTION check_candidate_project_access IS 
'Fonction helper pour vérifier si un candidat a accès à un projet spécifique';