-- Supprimer toutes les anciennes policies sur hr_resource_assignments
DROP POLICY IF EXISTS "Candidates can view assignments" ON hr_resource_assignments;
DROP POLICY IF EXISTS "Candidates view matching assignments" ON hr_resource_assignments;
DROP POLICY IF EXISTS "candidate_can_view_matching_assignments" ON hr_resource_assignments;
DROP POLICY IF EXISTS "candidate_can_update_own_assignments" ON hr_resource_assignments;
DROP POLICY IF EXISTS "Candidates update matching assignments" ON hr_resource_assignments;
DROP POLICY IF EXISTS "Clients can manage their project resources" ON hr_resource_assignments;
DROP POLICY IF EXISTS "Public read for hr_resource_assignments" ON hr_resource_assignments;

-- Permettre aux candidats de voir les assignations qui les concernent
CREATE POLICY "Candidates view relevant assignments" 
ON hr_resource_assignments
FOR SELECT
TO authenticated
USING (
  -- Le candidat peut voir les assignations qui lui sont directement assignées
  candidate_id = auth.uid()
  OR
  -- Le candidat peut voir les assignations en recherche qui correspondent à son profil
  (
    booking_status = 'recherche'
    AND EXISTS (
      SELECT 1 
      FROM candidate_profiles cp
      WHERE cp.id = auth.uid()
      AND cp.profile_id = hr_resource_assignments.profile_id
      AND cp.seniority = hr_resource_assignments.seniority
      AND cp.status != 'qualification'
    )
  )
  OR
  -- Le client peut voir toutes les assignations de ses projets
  EXISTS (
    SELECT 1 
    FROM projects p
    WHERE p.id = hr_resource_assignments.project_id
    AND p.owner_id = auth.uid()
  )
);

-- Permettre aux candidats de mettre à jour leur statut d'acceptation
CREATE POLICY "Candidates update their assignments"
ON hr_resource_assignments
FOR UPDATE
TO authenticated
USING (
  -- Le candidat peut updater les assignations qui lui sont assignées
  candidate_id = auth.uid()
  OR
  -- Le candidat peut accepter/refuser les assignations en recherche qui matchent
  (
    booking_status = 'recherche'
    AND EXISTS (
      SELECT 1 
      FROM candidate_profiles cp
      WHERE cp.id = auth.uid()
      AND cp.profile_id = hr_resource_assignments.profile_id
      AND cp.seniority = hr_resource_assignments.seniority
      AND cp.status != 'qualification'
    )
  )
);

-- Permettre aux clients de gérer leurs ressources
CREATE POLICY "Clients manage their resources"
ON hr_resource_assignments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM projects p
    WHERE p.id = hr_resource_assignments.project_id
    AND p.owner_id = auth.uid()
  )
);