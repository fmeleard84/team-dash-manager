-- Migration simplifiée pour corriger les relations de project_bookings après l'unification des IDs
-- Version sans ON CONFLICT pour éviter les erreurs

-- ========================================
-- 1. CORRIGER LA FOREIGN KEY
-- ========================================

-- Supprimer l'ancienne contrainte si elle existe
ALTER TABLE project_bookings 
DROP CONSTRAINT IF EXISTS project_bookings_candidate_id_fkey CASCADE;

-- Recréer la contrainte vers candidate_profiles avec le nouveau système d'ID unifié
ALTER TABLE project_bookings 
ADD CONSTRAINT project_bookings_candidate_id_fkey 
FOREIGN KEY (candidate_id) 
REFERENCES candidate_profiles(id) 
ON DELETE CASCADE;

-- ========================================
-- 2. CRÉER LES POLICIES RLS
-- ========================================

-- Activer RLS sur project_bookings
ALTER TABLE project_bookings ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Clients can view project bookings" ON project_bookings;
DROP POLICY IF EXISTS "Candidates can view their bookings" ON project_bookings;
DROP POLICY IF EXISTS "Users can view bookings for their projects" ON project_bookings;
DROP POLICY IF EXISTS "clients_view_project_bookings" ON project_bookings;
DROP POLICY IF EXISTS "candidates_view_own_bookings" ON project_bookings;
DROP POLICY IF EXISTS "candidates_update_booking_status" ON project_bookings;

-- Policy pour les clients (voir les bookings de leurs projets)
CREATE POLICY "clients_view_project_bookings"
ON project_bookings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_bookings.project_id
    AND p.owner_id = auth.uid()
  )
);

-- Policy pour les candidats (voir leurs propres bookings)
CREATE POLICY "candidates_view_own_bookings"
ON project_bookings FOR SELECT
TO authenticated
USING (candidate_id = auth.uid());

-- Policy pour les candidats (mettre à jour leur statut)
CREATE POLICY "candidates_update_booking_status"
ON project_bookings FOR UPDATE
TO authenticated
USING (
  candidate_id = auth.uid()
  AND status IN ('pending', 'accepted')
)
WITH CHECK (
  candidate_id = auth.uid()
  AND status IN ('confirmed', 'cancelled')
);

-- ========================================
-- 3. SYNCHRONISER LES DONNÉES (sans ON CONFLICT)
-- ========================================

-- Insérer les données manquantes depuis hr_resource_assignments
-- Uniquement celles qui n'existent pas déjà
INSERT INTO project_bookings (project_id, candidate_id, resource_assignment_id, status, created_at, updated_at)
SELECT DISTINCT
  hra.project_id,
  hra.candidate_id,
  hra.id, -- Utiliser l'ID de hr_resource_assignments comme resource_assignment_id
  CASE 
    WHEN hra.booking_status = 'accepted' THEN 'confirmed'
    WHEN hra.booking_status = 'declined' THEN 'cancelled'
    WHEN hra.booking_status = 'recherche' THEN 'pending'
    ELSE 'pending'
  END as status,
  hra.created_at,
  hra.updated_at
FROM hr_resource_assignments hra
WHERE hra.candidate_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM project_bookings pb
    WHERE pb.project_id = hra.project_id
    AND pb.candidate_id = hra.candidate_id
  );

-- ========================================
-- 4. CORRIGER LES ENREGISTREMENTS AVEC resource_assignment_id NULL
-- ========================================

-- D'abord, corriger les enregistrements existants qui ont resource_assignment_id à NULL
UPDATE project_bookings pb
SET 
  resource_assignment_id = hra.id
FROM hr_resource_assignments hra
WHERE pb.project_id = hra.project_id
  AND pb.candidate_id = hra.candidate_id
  AND pb.resource_assignment_id IS NULL
  AND hra.candidate_id IS NOT NULL;

-- ========================================
-- 5. METTRE À JOUR LES STATUTS EXISTANTS
-- ========================================

-- Mettre à jour les statuts des bookings existants pour correspondre à hr_resource_assignments
UPDATE project_bookings pb
SET 
  status = CASE 
    WHEN hra.booking_status = 'accepted' THEN 'confirmed'
    WHEN hra.booking_status = 'declined' THEN 'cancelled'
    WHEN hra.booking_status = 'recherche' THEN 'pending'
    ELSE pb.status
  END,
  resource_assignment_id = COALESCE(pb.resource_assignment_id, hra.id),
  updated_at = NOW()
FROM hr_resource_assignments hra
WHERE pb.project_id = hra.project_id
  AND pb.candidate_id = hra.candidate_id
  AND hra.candidate_id IS NOT NULL;

-- ========================================
-- 6. COMMENTAIRES POUR DOCUMENTATION
-- ========================================

COMMENT ON TABLE project_bookings IS 
'Table de liaison entre projets et candidats. Synchronisée avec hr_resource_assignments après unification des IDs';

COMMENT ON POLICY "candidates_view_own_bookings" ON project_bookings IS 
'Permet aux candidats de voir leurs propres bookings avec le nouveau système d''ID unifié (auth.uid())';