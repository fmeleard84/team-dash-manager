-- =====================================================
-- FIX RLS pour Upload Candidats
-- Problème: booking_status peut être 'accepted' OU 'booké'
-- =====================================================

-- 1. D'abord, vérifions les valeurs actuelles de booking_status
SELECT DISTINCT booking_status, COUNT(*) as count
FROM hr_resource_assignments
GROUP BY booking_status;

-- 2. Vérifions spécifiquement pour le projet problématique
SELECT 
    hra.id,
    hra.project_id,
    hra.candidate_id,
    hra.booking_status,
    cp.first_name,
    cp.last_name,
    cp.user_id
FROM hr_resource_assignments hra
JOIN candidate_profiles cp ON cp.id = hra.candidate_id
WHERE hra.project_id = 'd7dff6ec-5019-40ab-a00f-8bac8806eca7';

-- 3. Supprimer les anciennes politiques défaillantes
DROP POLICY IF EXISTS "Candidats can upload to accepted projects" ON storage.objects;
DROP POLICY IF EXISTS "Candidats can view files in accepted projects" ON storage.objects;
DROP POLICY IF EXISTS "Candidats can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Candidats can delete their own files" ON storage.objects;

-- 4. Créer les nouvelles politiques qui acceptent 'accepted' ET 'booké'
CREATE POLICY "Candidats can upload to accepted projects" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'project-files'
    AND (name LIKE 'projects/%')
    AND EXISTS (
        SELECT 1 FROM hr_resource_assignments hra
        JOIN candidate_profiles cp ON cp.id = hra.candidate_id
        WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
            AND cp.user_id = auth.uid()
            AND hra.booking_status IN ('accepted', 'booké')  -- FIX: accepte les 2 valeurs
    )
);

CREATE POLICY "Candidats can view files in accepted projects" ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'project-files'
    AND (name LIKE 'projects/%')
    AND EXISTS (
        SELECT 1 FROM hr_resource_assignments hra
        JOIN candidate_profiles cp ON cp.id = hra.candidate_id
        WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
            AND cp.user_id = auth.uid()
            AND hra.booking_status IN ('accepted', 'booké')  -- FIX: accepte les 2 valeurs
    )
);

CREATE POLICY "Candidats can update their own files" ON storage.objects
FOR UPDATE TO authenticated
USING (
    bucket_id = 'project-files'
    AND (name LIKE 'projects/%')
    AND EXISTS (
        SELECT 1 FROM hr_resource_assignments hra
        JOIN candidate_profiles cp ON cp.id = hra.candidate_id
        WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
            AND cp.user_id = auth.uid()
            AND hra.booking_status IN ('accepted', 'booké')  -- FIX: accepte les 2 valeurs
    )
);

CREATE POLICY "Candidats can delete their own files" ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'project-files'
    AND (name LIKE 'projects/%')
    AND EXISTS (
        SELECT 1 FROM hr_resource_assignments hra
        JOIN candidate_profiles cp ON cp.id = hra.candidate_id
        WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
            AND cp.user_id = auth.uid()
            AND hra.booking_status IN ('accepted', 'booké')  -- FIX: accepte les 2 valeurs
    )
);

-- 5. Optionnel: Standardiser tous les 'booké' en 'accepted' pour uniformiser
-- (Décommentez si vous voulez uniformiser les valeurs)
/*
UPDATE hr_resource_assignments
SET booking_status = 'accepted'
WHERE booking_status = 'booké';
*/

-- 6. Vérifier que les politiques sont bien appliquées
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'objects'
    AND schemaname = 'storage'
    AND policyname LIKE '%Candidat%'
ORDER BY policyname;