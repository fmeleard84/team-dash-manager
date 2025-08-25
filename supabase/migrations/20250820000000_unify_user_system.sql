-- Migration pour unifier le système de gestion des utilisateurs
-- Objectif : Utiliser uniquement candidate_id et supprimer les références profile_id obsolètes

-- 1. Nettoyer les données existantes (MVP sans données sensibles)
TRUNCATE TABLE hr_resource_assignments CASCADE;
TRUNCATE TABLE hr_profiles CASCADE;

-- 2. Supprimer la colonne profile_id obsolète de hr_resource_assignments
ALTER TABLE hr_resource_assignments 
DROP COLUMN IF EXISTS profile_id;

-- 3. Rendre candidate_id obligatoire pour les nouvelles assignations
ALTER TABLE hr_resource_assignments 
ALTER COLUMN candidate_id SET NOT NULL;

-- 4. Ajouter job_title directement dans hr_resource_assignments pour éviter les jointures
ALTER TABLE hr_resource_assignments 
ADD COLUMN IF NOT EXISTS job_title TEXT DEFAULT 'Consultant';

-- 5. Ajouter un champ display_name pour un affichage cohérent
ALTER TABLE hr_resource_assignments 
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 6. Créer une vue matérialisée pour les membres de projet (performance optimale)
CREATE MATERIALIZED VIEW IF NOT EXISTS project_users AS
SELECT DISTINCT
  p.id as project_id,
  p.title as project_title,
  -- Client
  p.owner_id as user_id,
  prof.email as email,
  prof.first_name as display_name,
  'Client' as job_title,
  'client' as role,
  p.created_at as joined_at
FROM projects p
LEFT JOIN profiles prof ON prof.id = p.owner_id

UNION ALL

-- Candidats assignés
SELECT DISTINCT
  hra.project_id,
  p.title as project_title,
  cp.id as user_id,
  cp.email,
  COALESCE(prof.first_name, SPLIT_PART(cp.email, '@', 1)) as display_name,
  COALESCE(hra.job_title, cp.job_title, 'Consultant') as job_title,
  'candidate' as role,
  hra.created_at as joined_at
FROM hr_resource_assignments hra
JOIN projects p ON p.id = hra.project_id
JOIN candidate_profiles cp ON cp.id = hra.candidate_id
LEFT JOIN profiles prof ON prof.id = cp.profile_id
WHERE hra.booking_status IN ('accepted', 'booké')
AND hra.candidate_id IS NOT NULL;

-- 7. Créer un index pour les performances
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_users_unique 
ON project_users(project_id, user_id, role);

CREATE INDEX IF NOT EXISTS idx_project_users_project 
ON project_users(project_id);

CREATE INDEX IF NOT EXISTS idx_project_users_user 
ON project_users(user_id);

-- 8. Créer une fonction pour rafraîchir la vue matérialisée
CREATE OR REPLACE FUNCTION refresh_project_users()
RETURNS trigger AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY project_users;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 9. Créer des triggers pour rafraîchir automatiquement la vue
DROP TRIGGER IF EXISTS refresh_project_users_on_assignment ON hr_resource_assignments;
CREATE TRIGGER refresh_project_users_on_assignment
AFTER INSERT OR UPDATE OR DELETE ON hr_resource_assignments
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_project_users();

DROP TRIGGER IF EXISTS refresh_project_users_on_project ON projects;
CREATE TRIGGER refresh_project_users_on_project
AFTER INSERT OR UPDATE OR DELETE ON projects
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_project_users();

-- 10. Créer une fonction RPC pour obtenir les projets d'un utilisateur
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
  
  -- Projets où l'utilisateur est candidat
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
  
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Créer une fonction RPC pour obtenir les utilisateurs d'un projet
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
  SELECT 
    pu.user_id,
    pu.email,
    pu.display_name,
    pu.job_title,
    pu.role,
    pu.joined_at
  FROM project_users pu
  WHERE pu.project_id = p_project_id
  ORDER BY 
    CASE pu.role 
      WHEN 'client' THEN 1 
      WHEN 'candidate' THEN 2 
      ELSE 3 
    END,
    pu.display_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Mettre à jour les politiques RLS
DROP POLICY IF EXISTS "Candidates can view their own assignments" ON hr_resource_assignments;
CREATE POLICY "Candidates can view their assignments" ON hr_resource_assignments
  FOR SELECT
  USING (
    candidate_id IN (
      SELECT id FROM candidate_profiles 
      WHERE email = (auth.jwt() ->> 'email')
    )
  );

-- 13. Rafraîchir la vue matérialisée
REFRESH MATERIALIZED VIEW project_users;