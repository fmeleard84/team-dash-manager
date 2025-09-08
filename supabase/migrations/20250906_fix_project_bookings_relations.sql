-- Migration pour corriger les relations de project_bookings après l'unification des IDs
-- NE PAS SUPPRIMER LA TABLE, juste corriger les relations

-- ========================================
-- 1. VÉRIFIER ET CORRIGER LA FOREIGN KEY
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
-- 2. METTRE À JOUR LES DONNÉES SI NÉCESSAIRE
-- ========================================

-- Si des enregistrements utilisent encore l'ancien système d'ID, les mettre à jour
-- (Seulement si nécessaire, sinon cette partie peut être commentée)

-- UPDATE project_bookings pb
-- SET candidate_id = cp.id
-- FROM candidate_profiles cp
-- WHERE pb.candidate_id = cp.old_id
-- AND cp.old_id IS NOT NULL;

-- ========================================
-- 3. CRÉER LES POLICIES RLS SI NÉCESSAIRE
-- ========================================

-- Activer RLS sur project_bookings si ce n'est pas déjà fait
ALTER TABLE project_bookings ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Clients can view project bookings" ON project_bookings;
DROP POLICY IF EXISTS "Candidates can view their bookings" ON project_bookings;
DROP POLICY IF EXISTS "Users can view bookings for their projects" ON project_bookings;

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
-- 4. AJOUTER UNE CONTRAINTE UNIQUE SI NÉCESSAIRE
-- ========================================

-- Créer une contrainte unique sur (project_id, candidate_id) si elle n'existe pas
ALTER TABLE project_bookings 
DROP CONSTRAINT IF EXISTS project_bookings_project_candidate_unique;

ALTER TABLE project_bookings 
ADD CONSTRAINT project_bookings_project_candidate_unique 
UNIQUE (project_id, candidate_id);

-- ========================================
-- 5. SYNCHRONISER AVEC hr_resource_assignments
-- ========================================

-- S'assurer que les données sont synchronisées entre les deux tables
-- Insérer dans project_bookings les assignations qui n'y sont pas encore
INSERT INTO project_bookings (project_id, candidate_id, status, created_at, updated_at)
SELECT 
  hra.project_id,
  hra.candidate_id,
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
  )
ON CONFLICT (project_id, candidate_id) DO UPDATE
SET 
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;

-- ========================================
-- 6. COMMENTAIRES POUR DOCUMENTATION
-- ========================================

COMMENT ON TABLE project_bookings IS 
'Table de liaison entre projets et candidats. Synchronisée avec hr_resource_assignments après unification des IDs';

COMMENT ON POLICY "candidates_view_own_bookings" ON project_bookings IS 
'Permet aux candidats de voir leurs propres bookings avec le nouveau système d''ID unifié (auth.uid())';