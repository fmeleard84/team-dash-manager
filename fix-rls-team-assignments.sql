-- =====================================================
-- FIX RLS : Permettre aux candidats de voir toute l'équipe
-- incluant les ressources IA
-- =====================================================

-- 1. D'abord, restaurer l'ancienne politique pour arrêter les erreurs 500
DROP POLICY IF EXISTS "hr_assignments_select" ON hr_resource_assignments;

CREATE POLICY "hr_assignments_select" ON hr_resource_assignments
  FOR SELECT
  USING (
    (candidate_id = auth.uid()) OR can_access_project(project_id, auth.uid())
  );

-- 2. Créer la fonction sécurisée pour récupérer les membres d'équipe
CREATE OR REPLACE FUNCTION get_team_assignments(p_project_id UUID)
RETURNS TABLE (
  id UUID,
  project_id UUID,
  profile_id UUID,
  candidate_id UUID,
  booking_status TEXT,
  seniority hr_seniority,
  languages TEXT[],
  expertises TEXT[],
  created_at TIMESTAMPTZ,
  hr_profile JSONB,
  candidate_profile JSONB
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier que l'utilisateur est bien membre accepté du projet
  IF EXISTS (
    SELECT 1 FROM hr_resource_assignments hra
    WHERE hra.project_id = p_project_id
    AND hra.candidate_id = auth.uid()
    AND hra.booking_status = 'accepted'
  ) OR EXISTS (
    -- Ou que c'est le propriétaire du projet
    SELECT 1 FROM projects p
    WHERE p.id = p_project_id
    AND p.owner_id = auth.uid()
  ) THEN
    -- Si oui, retourner TOUS les membres de l'équipe
    RETURN QUERY
    SELECT
      hra.id,
      hra.project_id,
      hra.profile_id,
      hra.candidate_id,
      hra.booking_status,
      hra.seniority,
      hra.languages,
      hra.expertises,
      hra.created_at,
      jsonb_build_object(
        'id', hp.id,
        'name', hp.name,
        'is_ai', hp.is_ai,
        'prompt_id', hp.prompt_id
      ) as hr_profile,
      CASE
        WHEN cp.id IS NOT NULL THEN
          jsonb_build_object(
            'id', cp.id,
            'first_name', cp.first_name,
            'last_name', cp.last_name,
            'email', cp.email
          )
        ELSE NULL
      END as candidate_profile
    FROM hr_resource_assignments hra
    LEFT JOIN hr_profiles hp ON hra.profile_id = hp.id
    LEFT JOIN candidate_profiles cp ON hra.candidate_id = cp.id
    WHERE hra.project_id = p_project_id
    AND hra.booking_status IN ('accepted', 'completed');
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. Donner les permissions pour exécuter la fonction
GRANT EXECUTE ON FUNCTION get_team_assignments(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_team_assignments(UUID) TO authenticated;

-- 4. Test de la fonction (à exécuter pour vérifier)
-- SELECT * FROM get_team_assignments('5ec653f5-5de9-4291-a2d9-e301425adbad');