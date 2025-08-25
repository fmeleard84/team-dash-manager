-- Forcer la visibilité des assignments de test pour debugging

-- 1. Vérifier les assignments existants
SELECT 
  hra.id,
  hra.project_id,
  hra.profile_id,
  hra.booking_status,
  hra.languages,
  hra.expertises,
  hra.seniority,
  p.title as project_title,
  p.status as project_status,
  hp.name as profile_name
FROM hr_resource_assignments hra
JOIN projects p ON p.id = hra.project_id
JOIN hr_profiles hp ON hp.id = hra.profile_id
WHERE hra.profile_id = '922efb64-1684-45ec-8aea-436c4dad2f37'
  AND p.status = 'play'
ORDER BY hra.created_at DESC;

-- 2. Si les assignments n'existent pas, les créer
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
  p.id,
  '922efb64-1684-45ec-8aea-436c4dad2f37',
  'intermediate'::hr_seniority,
  ARRAY['Français'],
  ARRAY['Google Ads'],
  150.00,
  'recherche',
  NOW(),
  NOW()
FROM projects p
WHERE p.id IN ('a1111111-1111-1111-1111-111111111111', 'a2222222-2222-2222-2222-222222222222')
  AND NOT EXISTS (
    SELECT 1 FROM hr_resource_assignments hra2 
    WHERE hra2.project_id = p.id 
    AND hra2.profile_id = '922efb64-1684-45ec-8aea-436c4dad2f37'
  );

-- 3. Vérifier le résultat
SELECT 
  hra.id,
  hra.project_id,
  hra.booking_status,
  p.title as project_title,
  p.status as project_status
FROM hr_resource_assignments hra
JOIN projects p ON p.id = hra.project_id
WHERE hra.profile_id = '922efb64-1684-45ec-8aea-436c4dad2f37'
  AND p.status = 'play'
ORDER BY hra.created_at DESC;