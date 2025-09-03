-- SCRIPT DIRECT POUR APPLIQUER LES POLITIQUES RLS
-- Ce script crée les politiques directement sans utiliser de fonction helper

-- 1. Activer RLS sur storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer toutes les politiques existantes (ignorer les erreurs si elles n'existent pas)
DO $$ 
DECLARE 
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects'
  LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
      RAISE NOTICE 'Dropped policy: %', pol.policyname;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not drop policy %: %', pol.policyname, SQLERRM;
    END;
  END LOOP;
END $$;

-- 3. Créer les nouvelles politiques avec la logique directe (sans fonction helper)

-- POLITIQUE 1: INSERT (Upload)
CREATE POLICY "storage_upload_for_project_members"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-files' 
  AND name LIKE 'projects/%'
  AND (
    -- Client owner peut uploader
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = SPLIT_PART(name, '/', 2)
      AND p.owner_id = auth.uid()
    )
    OR
    -- Candidat accepté peut uploader
    EXISTS (
      SELECT 1 FROM public.hr_resource_assignments hra
      JOIN public.candidate_profiles cp ON cp.id = hra.candidate_id
      WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
      AND cp.user_id = auth.uid()
      AND hra.booking_status = 'accepted'
    )
    OR
    -- Membre d'équipe projet peut uploader
    EXISTS (
      SELECT 1 FROM public.project_teams pt
      WHERE pt.project_id::text = SPLIT_PART(name, '/', 2)
      AND pt.member_id = auth.uid()
    )
  )
);

-- POLITIQUE 2: SELECT (View)
CREATE POLICY "storage_view_for_project_members"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-files' 
  AND name LIKE 'projects/%'
  AND (
    -- Client owner peut voir
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = SPLIT_PART(name, '/', 2)
      AND p.owner_id = auth.uid()
    )
    OR
    -- Candidat accepté peut voir
    EXISTS (
      SELECT 1 FROM public.hr_resource_assignments hra
      JOIN public.candidate_profiles cp ON cp.id = hra.candidate_id
      WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
      AND cp.user_id = auth.uid()
      AND hra.booking_status = 'accepted'
    )
    OR
    -- Membre d'équipe projet peut voir
    EXISTS (
      SELECT 1 FROM public.project_teams pt
      WHERE pt.project_id::text = SPLIT_PART(name, '/', 2)
      AND pt.member_id = auth.uid()
    )
  )
);

-- POLITIQUE 3: UPDATE
CREATE POLICY "storage_update_for_project_members"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'project-files' 
  AND name LIKE 'projects/%'
  AND (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = SPLIT_PART(name, '/', 2)
      AND p.owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.hr_resource_assignments hra
      JOIN public.candidate_profiles cp ON cp.id = hra.candidate_id
      WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
      AND cp.user_id = auth.uid()
      AND hra.booking_status = 'accepted'
    )
  )
)
WITH CHECK (
  bucket_id = 'project-files' 
  AND name LIKE 'projects/%'
  AND (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = SPLIT_PART(name, '/', 2)
      AND p.owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.hr_resource_assignments hra
      JOIN public.candidate_profiles cp ON cp.id = hra.candidate_id
      WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
      AND cp.user_id = auth.uid()
      AND hra.booking_status = 'accepted'
    )
  )
);

-- POLITIQUE 4: DELETE
CREATE POLICY "storage_delete_for_project_members"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-files' 
  AND name LIKE 'projects/%'
  AND (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = SPLIT_PART(name, '/', 2)
      AND p.owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.hr_resource_assignments hra
      JOIN public.candidate_profiles cp ON cp.id = hra.candidate_id
      WHERE hra.project_id::text = SPLIT_PART(name, '/', 2)
      AND cp.user_id = auth.uid()
      AND hra.booking_status = 'accepted'
    )
  )
);

-- 4. Vérifier les politiques créées
SELECT 
    policyname,
    cmd,
    roles::text[]
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
ORDER BY policyname;

-- 5. Vérifier les candidats qui devraient avoir accès
SELECT 
    cp.user_id,
    cp.first_name || ' ' || cp.last_name as candidat,
    hra.project_id,
    p.title as projet,
    hra.booking_status,
    'projects/' || hra.project_id || '/' as dossier_projet
FROM hr_resource_assignments hra
JOIN candidate_profiles cp ON cp.id = hra.candidate_id
JOIN projects p ON p.id = hra.project_id
WHERE hra.booking_status = 'accepted'
AND cp.user_id IS NOT NULL
ORDER BY candidat, projet;

-- Si tout est OK, les candidats listés ci-dessus pourront uploader dans leurs dossiers projet