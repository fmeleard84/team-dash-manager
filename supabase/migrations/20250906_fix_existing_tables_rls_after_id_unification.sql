-- Migration pour corriger les RLS après l'unification des IDs
-- Problème: Les tables active_time_tracking et client_profiles ont des policies obsolètes
-- qui utilisent l'ancien système d'ID au lieu du nouveau système unifié

-- ========================================
-- 1. CORRIGER LES POLICIES POUR active_time_tracking
-- ========================================

-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Candidats gèrent leurs propres sessions" ON active_time_tracking;
DROP POLICY IF EXISTS "Clients voient sessions de leurs projets" ON active_time_tracking;
DROP POLICY IF EXISTS "Users can manage their own tracking" ON active_time_tracking;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON active_time_tracking;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON active_time_tracking;

-- Activer RLS si ce n'est pas déjà fait
ALTER TABLE active_time_tracking ENABLE ROW LEVEL SECURITY;

-- Nouvelle policy pour les candidats (CRUD complet sur leurs sessions)
CREATE POLICY "candidates_manage_own_sessions"
ON active_time_tracking FOR ALL
TO authenticated
USING (candidate_id = auth.uid())
WITH CHECK (candidate_id = auth.uid());

-- Policy pour les clients (lecture seule des sessions de leurs projets)
CREATE POLICY "clients_view_project_sessions"
ON active_time_tracking FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = active_time_tracking.project_id
    AND p.owner_id = auth.uid()
  )
);

-- ========================================
-- 2. CORRIGER LES POLICIES POUR client_profiles
-- ========================================

-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Candidats voient clients de leurs projets" ON client_profiles;
DROP POLICY IF EXISTS "Clients voient leur propre profil" ON client_profiles;
DROP POLICY IF EXISTS "Admins voient tous les profils clients" ON client_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON client_profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON client_profiles;

-- Activer RLS
ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;

-- Policy pour les clients (CRUD sur leur propre profil)
CREATE POLICY "clients_manage_own_profile"
ON client_profiles FOR ALL
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Policy pour les candidats (lecture des profils clients de leurs projets acceptés)
CREATE POLICY "candidates_view_project_clients"
ON client_profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM projects p
    JOIN hr_resource_assignments hra ON hra.project_id = p.id
    WHERE p.owner_id = client_profiles.id
    AND hra.candidate_id = auth.uid()
    AND hra.booking_status = 'accepted'
  )
);

-- ========================================
-- 3. CORRIGER LES POLICIES POUR time_tracking_sessions
-- ========================================

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Users can manage their own sessions" ON time_tracking_sessions;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON time_tracking_sessions;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON time_tracking_sessions;

-- Activer RLS
ALTER TABLE time_tracking_sessions ENABLE ROW LEVEL SECURITY;

-- Policy pour les candidats (CRUD sur leurs propres sessions)
CREATE POLICY "candidates_manage_own_time_sessions"
ON time_tracking_sessions FOR ALL
TO authenticated
USING (candidate_id = auth.uid())
WITH CHECK (candidate_id = auth.uid());

-- Policy pour les clients (lecture des sessions de leurs projets)
CREATE POLICY "clients_view_project_time_sessions"
ON time_tracking_sessions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = time_tracking_sessions.project_id
    AND p.owner_id = auth.uid()
  )
);

-- ========================================
-- 4. VÉRIFIER ET CORRIGER LES CONTRAINTES FK
-- ========================================

-- S'assurer que les FK utilisent le bon référencement après l'unification
-- Pour active_time_tracking
ALTER TABLE active_time_tracking 
DROP CONSTRAINT IF EXISTS active_time_tracking_candidate_id_fkey CASCADE;

ALTER TABLE active_time_tracking 
ADD CONSTRAINT active_time_tracking_candidate_id_fkey 
FOREIGN KEY (candidate_id) 
REFERENCES candidate_profiles(id) 
ON DELETE CASCADE;

-- Pour time_tracking_sessions  
ALTER TABLE time_tracking_sessions 
DROP CONSTRAINT IF EXISTS time_tracking_sessions_candidate_id_fkey CASCADE;

ALTER TABLE time_tracking_sessions 
ADD CONSTRAINT time_tracking_sessions_candidate_id_fkey 
FOREIGN KEY (candidate_id) 
REFERENCES candidate_profiles(id) 
ON DELETE CASCADE;

-- ========================================
-- 5. CRÉER UNE FONCTION HELPER POUR VÉRIFIER L'ACCÈS
-- ========================================

CREATE OR REPLACE FUNCTION can_candidate_view_client(
  p_candidate_id UUID,
  p_client_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM projects p
    JOIN hr_resource_assignments hra ON hra.project_id = p.id
    WHERE p.owner_id = p_client_id
    AND hra.candidate_id = p_candidate_id
    AND hra.booking_status = 'accepted'
  );
END;
$$;

-- Donner les permissions
GRANT EXECUTE ON FUNCTION can_candidate_view_client TO authenticated;

-- ========================================
-- 6. COMMENTAIRES POUR DOCUMENTATION
-- ========================================

COMMENT ON POLICY "candidates_manage_own_sessions" ON active_time_tracking IS 
'Permet aux candidats de gérer leurs propres sessions de time tracking avec le nouveau système d''ID unifié';

COMMENT ON POLICY "candidates_view_project_clients" ON client_profiles IS 
'Permet aux candidats de voir les profils des clients pour les projets où ils sont assignés et acceptés';

COMMENT ON FUNCTION can_candidate_view_client IS 
'Fonction helper pour vérifier si un candidat peut voir un profil client basé sur les projets acceptés';