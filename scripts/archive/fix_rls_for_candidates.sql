-- Script à exécuter dans l'éditeur SQL de Supabase pour corriger l'accès des candidats
-- aux demandes de mission

-- 1. Ajouter une politique pour permettre aux candidats de voir les assignments en recherche
CREATE POLICY "Candidates can view available assignments"
ON public.hr_resource_assignments
FOR SELECT
USING (
  -- Permettre de voir les assignments qui cherchent activement des candidats
  booking_status IN ('recherche', 'draft')
  AND auth.uid() IS NOT NULL  -- L'utilisateur doit être authentifié
);

-- 2. S'assurer que les projets sont lisibles par les utilisateurs authentifiés
-- (probablement déjà en place mais on vérifie)
DO $$
BEGIN
  -- Vérifier si la politique existe déjà
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'projects' 
    AND policyname = 'Authenticated users can view projects'
  ) THEN
    CREATE POLICY "Authenticated users can view projects"
    ON public.projects
    FOR SELECT
    USING (auth.uid() IS NOT NULL);
  END IF;
END
$$;

-- 3. S'assurer que hr_profiles est lisible
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'hr_profiles' 
    AND policyname = 'Profiles viewable by authenticated'
  ) THEN
    CREATE POLICY "Profiles viewable by authenticated"
    ON public.hr_profiles
    FOR SELECT
    USING (auth.uid() IS NOT NULL);
  END IF;
END
$$;

-- 4. S'assurer que hr_categories est lisible
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'hr_categories' 
    AND policyname = 'Categories viewable by authenticated'
  ) THEN
    CREATE POLICY "Categories viewable by authenticated"
    ON public.hr_categories
    FOR SELECT
    USING (auth.uid() IS NOT NULL);
  END IF;
END
$$;

-- Vérifier les politiques existantes sur hr_resource_assignments
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
WHERE tablename = 'hr_resource_assignments'
ORDER BY policyname;