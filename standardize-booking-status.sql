-- Solution Alternative: Standardiser tous les booking_status
-- Au lieu de modifier les politiques RLS (qui nécessitent des privilèges admin),
-- nous allons simplement uniformiser toutes les valeurs en 'accepted'

-- 1. Vérifier la situation actuelle
SELECT 
    booking_status, 
    COUNT(*) as count,
    STRING_AGG(DISTINCT p.title, ', ') as projects_affected
FROM hr_resource_assignments hra
LEFT JOIN projects p ON p.id = hra.project_id
WHERE booking_status IN ('accepted', 'booké')
GROUP BY booking_status;

-- 2. Mettre à jour tous les 'booké' en 'accepted'
UPDATE hr_resource_assignments
SET booking_status = 'accepted'
WHERE booking_status = 'booké';

-- 3. Vérifier que la mise à jour est faite
SELECT 
    booking_status, 
    COUNT(*) as count
FROM hr_resource_assignments
GROUP BY booking_status
ORDER BY booking_status;

-- 4. Vérifier spécifiquement pour le candidat problématique
SELECT 
    cp.first_name,
    cp.last_name,
    cp.email,
    cp.user_id,
    hra.booking_status,
    p.title as project_title,
    p.status as project_status
FROM candidate_profiles cp
JOIN hr_resource_assignments hra ON hra.candidate_id = cp.id
JOIN projects p ON p.id = hra.project_id
WHERE cp.first_name = 'CDP FM 2708'
    AND hra.project_id = 'd7dff6ec-5019-40ab-a00f-8bac8806eca7';