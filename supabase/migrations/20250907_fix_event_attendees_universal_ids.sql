-- Migration pour moderniser project_event_attendees avec le système d'IDs universels
-- Corrige le problème des participants qui n'apparaissent pas dans les invitations

-- ========================================
-- 1. AJOUTER LA COLONNE user_id (ID universel)
-- ========================================
ALTER TABLE project_event_attendees 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_event_attendees_user_id ON project_event_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_event_user ON project_event_attendees(event_id, user_id);

-- ========================================
-- 2. RENOMMER status EN response_status
-- ========================================
DO $$ 
BEGIN
    -- Vérifier si la colonne status existe et response_status n'existe pas
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'project_event_attendees' 
               AND column_name = 'status') 
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'project_event_attendees' 
                    AND column_name = 'response_status') THEN
        ALTER TABLE project_event_attendees RENAME COLUMN status TO response_status;
        COMMENT ON COLUMN project_event_attendees.response_status IS 'Statut de réponse: pending, accepted, declined';
    END IF;
END $$;

-- ========================================
-- 3. AJOUTER LA COLONNE required
-- ========================================
ALTER TABLE project_event_attendees 
ADD COLUMN IF NOT EXISTS required BOOLEAN DEFAULT true;

COMMENT ON COLUMN project_event_attendees.required IS 'Participation requise ou optionnelle';

-- ========================================
-- 4. AJOUTER LA COLONNE role
-- ========================================
ALTER TABLE project_event_attendees 
ADD COLUMN IF NOT EXISTS role TEXT;

COMMENT ON COLUMN project_event_attendees.role IS 'Rôle du participant: client, resource, etc.';

-- ========================================
-- 5. MIGRER LES DONNÉES EXISTANTES
-- ========================================
-- Migrer profile_id vers user_id si nécessaire
UPDATE project_event_attendees pea
SET user_id = p.id
FROM profiles p
WHERE pea.profile_id = p.id
AND pea.user_id IS NULL;

-- Pour les nouvelles entrées basées sur email, essayer de retrouver le user_id
UPDATE project_event_attendees pea
SET user_id = cp.id
FROM client_profiles cp
WHERE pea.email = cp.email
AND pea.user_id IS NULL;

UPDATE project_event_attendees pea
SET user_id = canp.id
FROM candidate_profiles canp
WHERE pea.email = canp.email
AND pea.user_id IS NULL;

-- ========================================
-- 6. CRÉER UNE CONTRAINTE UNIQUE
-- ========================================
-- Supprimer l'ancienne contrainte si elle existe
ALTER TABLE project_event_attendees 
DROP CONSTRAINT IF EXISTS project_event_attendees_event_email_unique;

-- Créer la nouvelle contrainte sur event_id + user_id
ALTER TABLE project_event_attendees 
ADD CONSTRAINT project_event_attendees_event_user_unique 
UNIQUE(event_id, user_id);

-- ========================================
-- 7. METTRE À JOUR LES POLITIQUES RLS
-- ========================================
-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Members can view attendees" ON project_event_attendees;
DROP POLICY IF EXISTS "Members can manage attendees" ON project_event_attendees;

-- Créer les nouvelles policies avec user_id
CREATE POLICY "Users can view event attendees"
ON project_event_attendees FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM project_events pe
    JOIN projects p ON p.id = pe.project_id
    WHERE pe.id = project_event_attendees.event_id
    AND (
      -- Client du projet
      p.owner_id = auth.uid()
      -- OU candidat accepté sur le projet
      OR EXISTS (
        SELECT 1 FROM hr_resource_assignments hra
        WHERE hra.project_id = p.id
        AND hra.candidate_id = auth.uid()
        AND hra.booking_status = 'accepted'
      )
    )
  )
);

CREATE POLICY "Project owners can manage attendees"
ON project_event_attendees FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM project_events pe
    JOIN projects p ON p.id = pe.project_id
    WHERE pe.id = project_event_attendees.event_id
    AND p.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_events pe
    JOIN projects p ON p.id = pe.project_id
    WHERE pe.id = project_event_attendees.event_id
    AND p.owner_id = auth.uid()
  )
);

-- ========================================
-- 8. CRÉER UNE VUE POUR FACILITER L'ACCÈS
-- ========================================
CREATE OR REPLACE VIEW project_event_attendees_with_profiles AS
SELECT 
  pea.*,
  COALESCE(cp.first_name, canp.first_name) as first_name,
  COALESCE(cp.last_name, canp.last_name) as last_name,
  COALESCE(cp.email, canp.email) as attendee_email,
  CASE 
    WHEN cp.id IS NOT NULL THEN 'client'
    WHEN canp.id IS NOT NULL THEN 'candidate'
    ELSE 'unknown'
  END as user_type
FROM project_event_attendees pea
LEFT JOIN client_profiles cp ON cp.id = pea.user_id
LEFT JOIN candidate_profiles canp ON canp.id = pea.user_id;

-- Grant access
GRANT SELECT ON project_event_attendees_with_profiles TO authenticated;

-- ========================================
-- 9. FONCTION HELPER POUR AJOUTER DES PARTICIPANTS
-- ========================================
CREATE OR REPLACE FUNCTION add_event_attendee(
  p_event_id UUID,
  p_user_id UUID,
  p_role TEXT DEFAULT NULL,
  p_required BOOLEAN DEFAULT true
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO project_event_attendees (
    event_id,
    user_id,
    role,
    required,
    response_status
  ) VALUES (
    p_event_id,
    p_user_id,
    p_role,
    p_required,
    'pending'
  )
  ON CONFLICT (event_id, user_id) 
  DO UPDATE SET
    role = EXCLUDED.role,
    required = EXCLUDED.required;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute
GRANT EXECUTE ON FUNCTION add_event_attendee TO authenticated;

-- ========================================
-- 10. MESSAGE DE CONFIRMATION
-- ========================================
SELECT 'Migration appliquée: project_event_attendees modernisée avec IDs universels' as message;