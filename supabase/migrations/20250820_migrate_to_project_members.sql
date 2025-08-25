-- ========================================
-- MIGRATION DES DONNÉES VERS PROJECT_MEMBERS
-- ========================================

-- 1. Migrer les clients (owners) des projets
INSERT INTO project_members (
  project_id,
  user_id,
  user_email,
  user_type,
  display_name,
  job_title,
  role,
  status
)
SELECT DISTINCT
  p.id as project_id,
  p.owner_id as user_id,
  prof.email as user_email,
  'client' as user_type,
  COALESCE(prof.first_name, SPLIT_PART(prof.email, '@', 1)) as display_name,
  'Client' as job_title,
  'owner' as role,
  'active' as status
FROM projects p
JOIN profiles prof ON prof.id = p.owner_id
WHERE NOT EXISTS (
  SELECT 1 FROM project_members pm 
  WHERE pm.project_id = p.id 
  AND pm.user_email = prof.email
);

-- 2. Migrer les candidats depuis hr_resource_assignments (nouveau système avec candidate_id)
INSERT INTO project_members (
  project_id,
  user_id,
  user_email,
  user_type,
  display_name,
  job_title,
  role,
  status
)
SELECT DISTINCT
  hra.project_id,
  hra.candidate_id as user_id,
  cp.email as user_email,
  'candidate' as user_type,
  COALESCE(
    cp.first_name,
    SPLIT_PART(cp.email, '@', 1),
    'Candidat'
  ) as display_name,
  COALESCE(
    hra.job_title,
    cp.job_title,
    hp.job_title,
    'Consultant'
  ) as job_title,
  'member' as role,
  CASE 
    WHEN hra.booking_status IN ('accepted', 'booké') THEN 'active'
    WHEN hra.booking_status = 'recherche' THEN 'pending'
    ELSE 'inactive'
  END as status
FROM hr_resource_assignments hra
LEFT JOIN candidate_profiles cp ON cp.id = hra.candidate_id
LEFT JOIN hr_profiles hp ON hp.id = hra.profile_id
WHERE hra.candidate_id IS NOT NULL
  AND cp.email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM project_members pm 
    WHERE pm.project_id = hra.project_id 
    AND pm.user_email = cp.email
  );

-- 3. Migrer les candidats depuis hr_resource_assignments (ancien système avec profile_id seulement)
-- Pour ceux qui n'ont pas de candidate_id
INSERT INTO project_members (
  project_id,
  user_id,
  user_email,
  user_type,
  display_name,
  job_title,
  role,
  status
)
SELECT DISTINCT
  hra.project_id,
  hra.profile_id as user_id, -- On utilise profile_id comme user_id temporairement
  COALESCE(
    hp.name || '@temp.com',
    'unknown_' || hra.id || '@temp.com'
  ) as user_email,
  'candidate' as user_type,
  COALESCE(
    SPLIT_PART(hp.name, ' ', 1),
    hp.name,
    'Ressource'
  ) as display_name,
  COALESCE(
    hra.job_title,
    hp.job_title,
    'Consultant'
  ) as job_title,
  'member' as role,
  CASE 
    WHEN hra.booking_status IN ('accepted', 'booké') THEN 'active'
    WHEN hra.booking_status = 'recherche' THEN 'pending'
    ELSE 'inactive'
  END as status
FROM hr_resource_assignments hra
LEFT JOIN hr_profiles hp ON hp.id = hra.profile_id
WHERE hra.candidate_id IS NULL
  AND hra.profile_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM project_members pm 
    WHERE pm.project_id = hra.project_id 
    AND pm.user_id = hra.profile_id
  );

-- 4. Fonction helper pour synchroniser les changements futurs
CREATE OR REPLACE FUNCTION sync_project_members_from_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Si c'est une insertion ou mise à jour
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Si candidate_id existe
    IF NEW.candidate_id IS NOT NULL THEN
      INSERT INTO project_members (
        project_id,
        user_id,
        user_email,
        user_type,
        display_name,
        job_title,
        role,
        status
      )
      SELECT
        NEW.project_id,
        NEW.candidate_id,
        cp.email,
        'candidate',
        COALESCE(cp.first_name, SPLIT_PART(cp.email, '@', 1)),
        COALESCE(NEW.job_title, cp.job_title, 'Consultant'),
        'member',
        CASE 
          WHEN NEW.booking_status IN ('accepted', 'booké') THEN 'active'
          WHEN NEW.booking_status = 'recherche' THEN 'pending'
          ELSE 'inactive'
        END
      FROM candidate_profiles cp
      WHERE cp.id = NEW.candidate_id
      ON CONFLICT (project_id, user_email) 
      DO UPDATE SET
        status = EXCLUDED.status,
        job_title = EXCLUDED.job_title,
        updated_at = NOW();
    END IF;
  END IF;
  
  -- Si c'est une suppression
  IF TG_OP = 'DELETE' THEN
    DELETE FROM project_members
    WHERE project_id = OLD.project_id
      AND user_id = OLD.candidate_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Créer le trigger pour synchroniser automatiquement
CREATE TRIGGER sync_project_members_trigger
  AFTER INSERT OR UPDATE OR DELETE ON hr_resource_assignments
  FOR EACH ROW
  EXECUTE FUNCTION sync_project_members_from_assignment();