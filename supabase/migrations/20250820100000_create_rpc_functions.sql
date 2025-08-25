-- Créer les fonctions RPC pour la gestion unifiée des utilisateurs

-- Fonction pour obtenir les utilisateurs d'un projet
CREATE OR REPLACE FUNCTION get_project_users(p_project_id UUID)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  display_name TEXT,
  job_title TEXT,
  role TEXT,
  joined_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  -- Client du projet
  SELECT 
    p.owner_id as user_id,
    prof.email,
    COALESCE(prof.first_name, SPLIT_PART(prof.email, '@', 1)) as display_name,
    'Client'::TEXT as job_title,
    'client'::TEXT as role,
    p.created_at as joined_at
  FROM projects p
  JOIN profiles prof ON prof.id = p.owner_id
  WHERE p.id = p_project_id
  
  UNION ALL
  
  -- Candidats assignés (uniquement ceux avec candidate_id)
  SELECT 
    cp.id as user_id,
    cp.email,
    COALESCE(prof.first_name, SPLIT_PART(cp.email, '@', 1)) as display_name,
    COALESCE(cp.job_title, 'Consultant') as job_title,
    'candidate'::TEXT as role,
    hra.created_at as joined_at
  FROM hr_resource_assignments hra
  JOIN candidate_profiles cp ON cp.id = hra.candidate_id
  LEFT JOIN profiles prof ON prof.id = cp.profile_id
  WHERE hra.project_id = p_project_id
  AND hra.booking_status IN ('accepted', 'booké')
  AND hra.candidate_id IS NOT NULL
  
  UNION ALL
  
  -- Fallback: Anciens candidats avec profile_id (pour compatibilité)
  SELECT 
    hp.id as user_id,
    COALESCE(prof.email, 'unknown@example.com') as email,
    COALESCE(prof.first_name, hp.name, SPLIT_PART(COALESCE(prof.email, 'unknown'), '@', 1)) as display_name,
    COALESCE(hp.job_title, 'Consultant') as job_title,
    'candidate'::TEXT as role,
    hra.created_at as joined_at
  FROM hr_resource_assignments hra
  JOIN hr_profiles hp ON hp.id = hra.profile_id
  LEFT JOIN profiles prof ON prof.id = hp.profile_id
  WHERE hra.project_id = p_project_id
  AND hra.booking_status IN ('accepted', 'booké')
  AND hra.candidate_id IS NULL
  AND hra.profile_id IS NOT NULL
  
  ORDER BY 
    CASE role 
      WHEN 'client' THEN 1 
      WHEN 'candidate' THEN 2 
      ELSE 3 
    END,
    display_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir les projets d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_projects(user_email TEXT)
RETURNS TABLE (
  project_id UUID,
  project_title TEXT,
  role TEXT,
  status TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  -- Projets où l'utilisateur est client
  SELECT 
    p.id as project_id,
    p.title as project_title,
    'client'::TEXT as role,
    p.status,
    p.created_at
  FROM projects p
  JOIN profiles prof ON prof.id = p.owner_id
  WHERE prof.email = user_email
  
  UNION ALL
  
  -- Projets où l'utilisateur est candidat (via candidate_id)
  SELECT 
    p.id as project_id,
    p.title as project_title,
    'candidate'::TEXT as role,
    p.status,
    hra.created_at
  FROM projects p
  JOIN hr_resource_assignments hra ON hra.project_id = p.id
  JOIN candidate_profiles cp ON cp.id = hra.candidate_id
  WHERE cp.email = user_email
  AND hra.booking_status IN ('accepted', 'booké')
  AND hra.candidate_id IS NOT NULL
  
  UNION ALL
  
  -- Projets où l'utilisateur est candidat (via profile_id - ancien système)
  SELECT 
    p.id as project_id,
    p.title as project_title,
    'candidate'::TEXT as role,
    p.status,
    hra.created_at
  FROM projects p
  JOIN hr_resource_assignments hra ON hra.project_id = p.id
  JOIN hr_profiles hp ON hp.id = hra.profile_id
  JOIN profiles prof ON prof.id = hp.profile_id
  WHERE prof.email = user_email
  AND hra.booking_status IN ('accepted', 'booké')
  AND hra.candidate_id IS NULL
  AND hra.profile_id IS NOT NULL
  
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Donner les permissions pour exécuter ces fonctions
GRANT EXECUTE ON FUNCTION get_project_users(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_projects(TEXT) TO anon, authenticated;