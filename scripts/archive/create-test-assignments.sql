-- Créer des assignments de test pour vérifier le matching

-- 1. D'abord, créer quelques projets de test
INSERT INTO projects (id, title, description, status, project_date, client_budget, created_at, updated_at)
VALUES 
  ('test-project-1', 'New Project Marketing Digital', 'Campagne marketing digital pour Google Ads', 'play', NOW(), 5000, NOW(), NOW()),
  ('test-project-2', 'Projet Template eCommerce', 'Développement site ecommerce avec expertise Google Ads', 'play', NOW(), 8000, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  updated_at = NOW();

-- 2. Récupérer l'ID du profil "Directeur Marketing"
-- (On va supposer qu'il existe, sinon on le créera)

-- 3. Créer des assignments qui cherchent un Directeur Marketing
INSERT INTO hr_resource_assignments (
  project_id,
  profile_id,
  seniority,
  languages,
  expertises,
  calculated_price,
  booking_status,
  created_at,
  updated_at
)
SELECT 
  'test-project-1',
  hp.id,
  'intermediaire'::hr_seniority,
  ARRAY['Français'],
  ARRAY['Google Ads'],
  150.00,
  'recherche',
  NOW(),
  NOW()
FROM hr_profiles hp
WHERE hp.name ILIKE '%marketing%'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO hr_resource_assignments (
  project_id,
  profile_id,
  seniority,
  languages,
  expertises,
  calculated_price,
  booking_status,
  created_at,
  updated_at
)
SELECT 
  'test-project-2',
  hp.id,
  'intermediaire'::hr_seniority,
  ARRAY['Français'],
  ARRAY['Google Ads'],
  150.00,
  'recherche',
  NOW(),
  NOW()
FROM hr_profiles hp
WHERE hp.name ILIKE '%marketing%'
LIMIT 1
ON CONFLICT DO NOTHING;

-- 4. Vérifier ce qu'on a créé
SELECT 
  hra.id,
  hra.project_id,
  p.title as project_title,
  hp.name as profile_name,
  hra.seniority,
  hra.languages,
  hra.expertises,
  hra.booking_status
FROM hr_resource_assignments hra
JOIN projects p ON p.id = hra.project_id
JOIN hr_profiles hp ON hp.id = hra.profile_id
WHERE hra.project_id IN ('test-project-1', 'test-project-2');