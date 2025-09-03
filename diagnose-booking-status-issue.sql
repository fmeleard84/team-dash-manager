-- DIAGNOSTIC: Vérifier l'incohérence des booking_status
-- Le problème semble être que les politiques RLS cherchent 'accepted' 
-- mais le booking_status peut être 'booké'

-- 1. Vérifier les booking_status existants
SELECT 
    'États de booking_status existants' as section,
    booking_status,
    COUNT(*) as nombre
FROM hr_resource_assignments 
GROUP BY booking_status
ORDER BY nombre DESC;

-- 2. Vérifier spécifiquement le candidat problématique
SELECT 
    'Candidat CDP FM 2708 spécifiquement' as section,
    cp.user_id,
    cp.first_name || ' ' || cp.last_name as candidat,
    hra.project_id,
    hra.booking_status,
    p.title as projet,
    CASE 
        WHEN hra.booking_status = 'accepted' THEN '✅ Devrait marcher avec RLS actuel'
        WHEN hra.booking_status = 'booké' THEN '❌ NE MARCHE PAS avec RLS actuel'
        ELSE '❓ Statut inconnu'
    END as diagnostic
FROM hr_resource_assignments hra
JOIN candidate_profiles cp ON cp.id = hra.candidate_id
LEFT JOIN projects p ON p.id = hra.project_id
WHERE cp.user_id = 'e64bc15d-e510-4e56-9502-a34be987218c'
AND hra.project_id = 'd7dff6ec-5019-40ab-a00f-8bac8806eca7';

-- 3. Vérifier tous les candidats qui devraient avoir accès mais sont bloqués
SELECT 
    'Candidats probablement bloqués' as section,
    cp.user_id,
    cp.first_name || ' ' || cp.last_name as candidat,
    hra.project_id,
    hra.booking_status,
    p.title as projet,
    'projects/' || hra.project_id || '/' as chemin_upload
FROM hr_resource_assignments hra
JOIN candidate_profiles cp ON cp.id = hra.candidate_id
LEFT JOIN projects p ON p.id = hra.project_id
WHERE hra.booking_status = 'booké'  -- Ces candidats sont probablement bloqués
AND cp.user_id IS NOT NULL
ORDER BY candidat;

-- 4. Vérifier les politiques RLS actuelles
SELECT 
    'Politiques RLS storage.objects' as section,
    policyname,
    cmd as operation,
    CASE 
        WHEN qual LIKE '%accepted%' AND qual NOT LIKE '%booké%' THEN '❌ Ne supporte que "accepted"'
        WHEN qual LIKE '%booké%' OR (qual LIKE '%accepted%' AND qual LIKE '%booké%') THEN '✅ Supporte "booké"'
        ELSE '❓ À vérifier manuellement'
    END as support_booking_status
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
ORDER BY policyname;

-- 5. CONCLUSION:
-- Si vous voyez des candidats avec booking_status = 'booké' mais que les politiques
-- ne vérifient que 'accepted', c'est le problème !
-- 
-- SOLUTION: Modifier les politiques RLS pour accepter BOTH 'accepted' ET 'booké'