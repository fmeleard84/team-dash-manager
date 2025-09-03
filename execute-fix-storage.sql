-- Script pour exécuter la fonction de correction RLS
-- À exécuter dans le Dashboard SQL Editor de Supabase

-- 1. Invoquer la fonction Edge directement
SELECT 
  net.http_post(
    url := 'https://egdelmcijszuapcpglsy.supabase.co/functions/v1/fix-storage-rls',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMzEwMDc5NiwiZXhwIjoyMDM4Njc2Nzk2fQ.TE58fRNXbMz8FmBXsSz0xOpOD0Lnfp-b3MhUZaAW1ec',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) as result;

-- Si la commande ci-dessus ne fonctionne pas, essayez celle-ci :

-- 2. Alternative : Créer une fonction locale qui invoque la fonction Edge
CREATE OR REPLACE FUNCTION fix_storage_rls_policies()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Créer les politiques simples directement
  
  -- Supprimer les anciennes
  EXECUTE 'DROP POLICY IF EXISTS "storage_upload_for_project_members" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "storage_view_for_project_members" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "storage_update_for_project_members" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "storage_delete_for_project_members" ON storage.objects';
  
  -- Créer les nouvelles politiques simples
  EXECUTE 'CREATE POLICY "allow_upload_authenticated" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = ''project-files'' AND name LIKE ''projects/%'')';
  EXECUTE 'CREATE POLICY "allow_view_authenticated" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = ''project-files'' AND name LIKE ''projects/%'')';
  EXECUTE 'CREATE POLICY "allow_update_authenticated" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = ''project-files'' AND name LIKE ''projects/%'') WITH CHECK (bucket_id = ''project-files'' AND name LIKE ''projects/%'')';
  EXECUTE 'CREATE POLICY "allow_delete_authenticated" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = ''project-files'' AND name LIKE ''projects/%'')';
  
  result := json_build_object(
    'success', true,
    'message', 'Politiques RLS appliquées avec succès'
  );
  
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Exécuter la fonction
SELECT fix_storage_rls_policies();

-- 3. Vérifier les politiques créées
SELECT 
    policyname,
    cmd,
    roles::text[]
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
ORDER BY policyname;

-- 4. Vérifier les candidats qui ont maintenant accès
SELECT 
    cp.user_id,
    cp.first_name || ' ' || cp.last_name as candidat,
    COUNT(DISTINCT hra.project_id) as nombre_projets
FROM hr_resource_assignments hra
JOIN candidate_profiles cp ON cp.id = hra.candidate_id
WHERE hra.booking_status = 'accepted'
AND cp.user_id IS NOT NULL
GROUP BY cp.user_id, cp.first_name, cp.last_name
ORDER BY candidat;