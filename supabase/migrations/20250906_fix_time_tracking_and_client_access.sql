-- Migration pour corriger les problèmes de time tracking et d'accès aux profils clients
-- Problème 1: Table active_time_tracking n'existe pas
-- Problème 2: Les candidats ne peuvent pas voir les profils clients de leurs projets

-- ========================================
-- 1. CRÉER LA TABLE active_time_tracking SI ELLE N'EXISTE PAS
-- ========================================

CREATE TABLE IF NOT EXISTS active_time_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  duration INTEGER DEFAULT 0, -- durée en secondes
  status TEXT CHECK (status IN ('active', 'paused', 'completed')) DEFAULT 'active',
  activity_description TEXT,
  hourly_rate DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Créer les index pour les performances
CREATE INDEX IF NOT EXISTS idx_active_time_tracking_candidate ON active_time_tracking(candidate_id);
CREATE INDEX IF NOT EXISTS idx_active_time_tracking_project ON active_time_tracking(project_id);
CREATE INDEX IF NOT EXISTS idx_active_time_tracking_status ON active_time_tracking(status);

-- ========================================
-- 2. CRÉER LES POLICIES POUR active_time_tracking
-- ========================================

-- Activer RLS
ALTER TABLE active_time_tracking ENABLE ROW LEVEL SECURITY;

-- Policy pour les candidats (voir et gérer leurs propres sessions)
DROP POLICY IF EXISTS "Candidats gèrent leurs propres sessions" ON active_time_tracking;
CREATE POLICY "Candidats gèrent leurs propres sessions"
ON active_time_tracking FOR ALL
TO authenticated
USING (candidate_id = auth.uid())
WITH CHECK (candidate_id = auth.uid());

-- Policy pour les clients (voir les sessions de leurs projets)
DROP POLICY IF EXISTS "Clients voient sessions de leurs projets" ON active_time_tracking;
CREATE POLICY "Clients voient sessions de leurs projets"
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
-- 3. CORRIGER LES POLICIES POUR client_profiles
-- ========================================

-- Les candidats doivent pouvoir voir les profils clients des projets où ils sont assignés
DROP POLICY IF EXISTS "Candidats voient clients de leurs projets" ON client_profiles;
CREATE POLICY "Candidats voient clients de leurs projets"
ON client_profiles FOR SELECT
TO authenticated
USING (
  -- Le candidat est assigné à un projet de ce client
  EXISTS (
    SELECT 1 
    FROM projects p
    JOIN hr_resource_assignments hra ON hra.project_id = p.id
    WHERE p.owner_id = client_profiles.id
    AND hra.candidate_id = auth.uid()
    AND hra.booking_status = 'accepted'
  )
);

-- Policy existante pour les clients (voir leur propre profil)
DROP POLICY IF EXISTS "Clients voient leur propre profil" ON client_profiles;
CREATE POLICY "Clients voient leur propre profil"
ON client_profiles FOR ALL
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Policy pour les admins
DROP POLICY IF EXISTS "Admins voient tous les profils clients" ON client_profiles;
CREATE POLICY "Admins voient tous les profils clients"
ON client_profiles FOR ALL
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
-- 4. CRÉER UNE VUE POUR FACILITER L'ACCÈS
-- ========================================

-- Vue pour les sessions de time tracking actives
CREATE OR REPLACE VIEW active_sessions AS
SELECT 
  att.*,
  p.title as project_title,
  p.status as project_status,
  cp.first_name as candidate_first_name,
  cp.last_name as candidate_last_name,
  cl.company_name as client_company
FROM active_time_tracking att
JOIN projects p ON p.id = att.project_id
JOIN candidate_profiles cp ON cp.id = att.candidate_id
LEFT JOIN client_profiles cl ON cl.id = p.owner_id
WHERE att.status IN ('active', 'paused');

-- Donner les permissions sur la vue
GRANT SELECT ON active_sessions TO authenticated;

-- ========================================
-- 5. FONCTION POUR CALCULER LE TEMPS TOTAL
-- ========================================

CREATE OR REPLACE FUNCTION calculate_time_spent(
  p_candidate_id UUID,
  p_project_id UUID,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS TABLE (
  total_seconds INTEGER,
  total_hours DECIMAL(10,2),
  total_amount DECIMAL(10,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(duration), 0)::INTEGER as total_seconds,
    ROUND(COALESCE(SUM(duration), 0) / 3600.0, 2) as total_hours,
    ROUND(COALESCE(SUM(duration * hourly_rate / 3600.0), 0), 2) as total_amount
  FROM active_time_tracking
  WHERE candidate_id = p_candidate_id
    AND project_id = p_project_id
    AND status = 'completed'
    AND (p_date_from IS NULL OR start_time >= p_date_from)
    AND (p_date_to IS NULL OR start_time <= p_date_to);
END;
$$;

-- Donner les permissions
GRANT EXECUTE ON FUNCTION calculate_time_spent TO authenticated;

-- ========================================
-- 6. TRIGGER POUR METTRE À JOUR updated_at
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_active_time_tracking_updated_at ON active_time_tracking;
CREATE TRIGGER update_active_time_tracking_updated_at
BEFORE UPDATE ON active_time_tracking
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- ========================================
-- 7. COMMENTAIRES ET DOCUMENTATION
-- ========================================

COMMENT ON TABLE active_time_tracking IS 'Table pour suivre le temps passé par les candidats sur les projets';
COMMENT ON COLUMN active_time_tracking.duration IS 'Durée totale en secondes';
COMMENT ON COLUMN active_time_tracking.hourly_rate IS 'Taux horaire du candidat au moment de la session';

COMMENT ON POLICY "Candidats voient clients de leurs projets" ON client_profiles IS 
'Permet aux candidats de voir les informations des clients pour les projets où ils sont assignés et acceptés';

COMMENT ON FUNCTION calculate_time_spent IS 
'Calcule le temps total passé et le montant pour un candidat sur un projet pour une période donnée';