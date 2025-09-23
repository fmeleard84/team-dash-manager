-- Correction des politiques RLS pour kanban_files et drive_folders
-- Pour permettre la visibilité des fichiers générés par l'IA

-- 1. Politiques pour kanban_files
-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "kanban_files_select_policy" ON kanban_files;
DROP POLICY IF EXISTS "kanban_files_insert_policy" ON kanban_files;
DROP POLICY IF EXISTS "kanban_files_update_policy" ON kanban_files;
DROP POLICY IF EXISTS "kanban_files_delete_policy" ON kanban_files;

-- Créer les nouvelles politiques
-- SELECT: Tous les membres du projet peuvent voir tous les fichiers
CREATE POLICY "kanban_files_select_policy" ON kanban_files
FOR SELECT USING (
  project_id IN (
    SELECT project_id FROM hr_resource_assignments
    WHERE candidate_id = auth.uid()
    AND booking_status = 'accepted'
  )
  OR
  project_id IN (
    SELECT id FROM projects
    WHERE owner_id = auth.uid()
  )
  OR
  -- Permettre à l'IA (service role) de lire
  auth.role() = 'service_role'
);

-- INSERT: Membres du projet et IA peuvent créer des fichiers
CREATE POLICY "kanban_files_insert_policy" ON kanban_files
FOR INSERT WITH CHECK (
  project_id IN (
    SELECT project_id FROM hr_resource_assignments
    WHERE candidate_id = auth.uid()
    AND booking_status = 'accepted'
  )
  OR
  project_id IN (
    SELECT id FROM projects
    WHERE owner_id = auth.uid()
  )
  OR
  -- Permettre à l'IA (service role) de créer
  auth.role() = 'service_role'
);

-- UPDATE: Membres du projet peuvent modifier
CREATE POLICY "kanban_files_update_policy" ON kanban_files
FOR UPDATE USING (
  project_id IN (
    SELECT project_id FROM hr_resource_assignments
    WHERE candidate_id = auth.uid()
    AND booking_status = 'accepted'
  )
  OR
  project_id IN (
    SELECT id FROM projects
    WHERE owner_id = auth.uid()
  )
  OR
  auth.role() = 'service_role'
);

-- DELETE: Owner du projet et IA peuvent supprimer
CREATE POLICY "kanban_files_delete_policy" ON kanban_files
FOR DELETE USING (
  project_id IN (
    SELECT id FROM projects
    WHERE owner_id = auth.uid()
  )
  OR
  uploaded_by = auth.uid()
  OR
  auth.role() = 'service_role'
);

-- 2. Politiques pour drive_folders
-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "drive_folders_select_policy" ON drive_folders;
DROP POLICY IF EXISTS "drive_folders_insert_policy" ON drive_folders;
DROP POLICY IF EXISTS "drive_folders_update_policy" ON drive_folders;
DROP POLICY IF EXISTS "drive_folders_delete_policy" ON drive_folders;

-- Créer les nouvelles politiques
-- SELECT: Tous les membres du projet peuvent voir tous les dossiers
CREATE POLICY "drive_folders_select_policy" ON drive_folders
FOR SELECT USING (
  project_id IN (
    SELECT project_id FROM hr_resource_assignments
    WHERE candidate_id = auth.uid()
    AND booking_status = 'accepted'
  )
  OR
  project_id IN (
    SELECT id FROM projects
    WHERE owner_id = auth.uid()
  )
  OR
  auth.role() = 'service_role'
);

-- INSERT: Membres du projet et IA peuvent créer des dossiers
CREATE POLICY "drive_folders_insert_policy" ON drive_folders
FOR INSERT WITH CHECK (
  project_id IN (
    SELECT project_id FROM hr_resource_assignments
    WHERE candidate_id = auth.uid()
    AND booking_status = 'accepted'
  )
  OR
  project_id IN (
    SELECT id FROM projects
    WHERE owner_id = auth.uid()
  )
  OR
  auth.role() = 'service_role'
);

-- UPDATE: Membres du projet peuvent modifier
CREATE POLICY "drive_folders_update_policy" ON drive_folders
FOR UPDATE USING (
  project_id IN (
    SELECT project_id FROM hr_resource_assignments
    WHERE candidate_id = auth.uid()
    AND booking_status = 'accepted'
  )
  OR
  project_id IN (
    SELECT id FROM projects
    WHERE owner_id = auth.uid()
  )
  OR
  auth.role() = 'service_role'
);

-- DELETE: Owner du projet peut supprimer
CREATE POLICY "drive_folders_delete_policy" ON drive_folders
FOR DELETE USING (
  project_id IN (
    SELECT id FROM projects
    WHERE owner_id = auth.uid()
  )
  OR
  auth.role() = 'service_role'
);

-- 3. S'assurer que RLS est activé sur ces tables
ALTER TABLE kanban_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE drive_folders ENABLE ROW LEVEL SECURITY;