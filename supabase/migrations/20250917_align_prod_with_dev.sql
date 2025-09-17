-- ============================================
-- Migration: Alignement PROD sur DEV
-- Date: 2025-09-17
-- Description: Ajoute les colonnes manquantes identifiées
-- ============================================

-- 1. COLONNES MANQUANTES CRITIQUES
-- ---------------------------------

-- hr_resource_assignments.calculated_price
-- Cette colonne existe en DEV mais pas en PROD
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'hr_resource_assignments'
      AND column_name = 'calculated_price'
  ) THEN
    ALTER TABLE public.hr_resource_assignments
    ADD COLUMN calculated_price DECIMAL(10,2);

    COMMENT ON COLUMN public.hr_resource_assignments.calculated_price IS
    'Prix calculé pour cette assignation de ressource (peut être null)';

    -- Optionnel: Calculer les valeurs initiales basées sur base_price
    UPDATE public.hr_resource_assignments hra
    SET calculated_price = hp.base_price
    FROM public.hr_profiles hp
    WHERE hra.profile_id = hp.id
      AND hra.calculated_price IS NULL;
  END IF;
END $$;

-- hr_profiles.skills
-- Cette colonne existe en DEV mais pas en PROD
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'hr_profiles'
      AND column_name = 'skills'
  ) THEN
    ALTER TABLE public.hr_profiles
    ADD COLUMN skills TEXT[] DEFAULT '{}';

    COMMENT ON COLUMN public.hr_profiles.skills IS
    'Compétences associées à ce profil métier';

    -- Initialiser les skills pour les profils existants
    UPDATE public.hr_profiles SET skills = CASE
      WHEN name = 'Développeur Full-Stack' THEN ARRAY['JavaScript', 'React', 'Node.js', 'PostgreSQL']
      WHEN name = 'Développeur Frontend' THEN ARRAY['React', 'Vue.js', 'TypeScript', 'CSS']
      WHEN name = 'Développeur Backend' THEN ARRAY['Node.js', 'Python', 'API REST', 'PostgreSQL']
      WHEN name = 'Développeur Mobile' THEN ARRAY['React Native', 'Flutter', 'iOS', 'Android']
      WHEN name = 'DevOps' THEN ARRAY['Docker', 'Kubernetes', 'CI/CD', 'AWS']
      WHEN name = 'UX/UI Designer' THEN ARRAY['Figma', 'Sketch', 'Adobe XD', 'Prototypage']
      WHEN name = 'Product Designer' THEN ARRAY['Design Thinking', 'User Research', 'Prototypage']
      WHEN name = 'Chef de projet' THEN ARRAY['Agile', 'Scrum', 'Jira', 'Planification']
      WHEN name = 'Product Owner' THEN ARRAY['Agile', 'User Stories', 'Roadmap', 'Analytics']
      WHEN name = 'Scrum Master' THEN ARRAY['Scrum', 'Agile', 'Facilitation', 'Coaching']
      WHEN name = 'Data Analyst' THEN ARRAY['SQL', 'Python', 'Tableau', 'Analytics']
      WHEN name = 'Data Scientist' THEN ARRAY['Python', 'Machine Learning', 'TensorFlow', 'Statistics']
      WHEN name = 'Growth Hacker' THEN ARRAY['SEO', 'SEA', 'Analytics', 'A/B Testing']
      WHEN name = 'Community Manager' THEN ARRAY['Social Media', 'Content', 'Engagement']
      WHEN name = 'Business Developer' THEN ARRAY['Négociation', 'CRM', 'Prospection']
      WHEN name = 'Comptable' THEN ARRAY['Comptabilité', 'Excel', 'ERP']
      ELSE '{}'::TEXT[]
    END
    WHERE skills = '{}' OR skills IS NULL;
  END IF;
END $$;

-- 2. COLONNES OPTIONNELLES (si elles n'existent pas)
-- --------------------------------------------------

-- hr_profiles.description (peut être utile)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'hr_profiles'
      AND column_name = 'description'
  ) THEN
    ALTER TABLE public.hr_profiles
    ADD COLUMN description TEXT;

    COMMENT ON COLUMN public.hr_profiles.description IS
    'Description détaillée du profil métier';
  END IF;
END $$;

-- hr_profiles.updated_at (pour le suivi)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'hr_profiles'
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.hr_profiles
    ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

    -- Créer un trigger pour mettre à jour automatiquement
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER update_hr_profiles_updated_at
      BEFORE UPDATE ON public.hr_profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- hr_resource_assignments.updated_at (pour le suivi)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'hr_resource_assignments'
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.hr_resource_assignments
    ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

    -- Créer un trigger si la fonction n'existe pas déjà
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER update_hr_resource_assignments_updated_at
      BEFORE UPDATE ON public.hr_resource_assignments
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- 3. VÉRIFICATION DES INDEX POUR LES PERFORMANCES
-- -----------------------------------------------

CREATE INDEX IF NOT EXISTS idx_hr_assignments_calculated_price
  ON public.hr_resource_assignments(calculated_price)
  WHERE calculated_price IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_hr_profiles_skills
  ON public.hr_profiles USING GIN(skills);

-- 4. VÉRIFICATION ET CRÉATION DES POLITIQUES RLS
-- ----------------------------------------------

-- S'assurer que RLS est activé
ALTER TABLE public.hr_resource_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_profiles ENABLE ROW LEVEL SECURITY;

-- Politique pour hr_profiles (lecture publique)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'hr_profiles'
      AND policyname = 'Lecture publique des profils'
  ) THEN
    CREATE POLICY "Lecture publique des profils" ON public.hr_profiles
      FOR SELECT
      USING (true);
  END IF;
END $$;

-- Politique pour hr_resource_assignments (candidats)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'hr_resource_assignments'
      AND policyname = 'Candidats peuvent voir les assignments'
  ) THEN
    CREATE POLICY "Candidats peuvent voir les assignments" ON public.hr_resource_assignments
      FOR SELECT
      USING (
        candidate_id = auth.uid() OR
        candidate_id IS NULL OR
        booking_status = 'recherche'
      );
  END IF;
END $$;

-- Politique pour hr_resource_assignments (clients)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'hr_resource_assignments'
      AND policyname = 'Clients gèrent leurs assignments'
  ) THEN
    CREATE POLICY "Clients gèrent leurs assignments" ON public.hr_resource_assignments
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.projects
          WHERE projects.id = hr_resource_assignments.project_id
          AND projects.owner_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.projects
          WHERE projects.id = hr_resource_assignments.project_id
          AND projects.owner_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Politique pour hr_resource_assignments (mise à jour candidats)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'hr_resource_assignments'
      AND policyname = 'Candidats peuvent accepter/refuser'
  ) THEN
    CREATE POLICY "Candidats peuvent accepter/refuser" ON public.hr_resource_assignments
      FOR UPDATE
      USING (candidate_id = auth.uid())
      WITH CHECK (candidate_id = auth.uid());
  END IF;
END $$;

-- 5. GRANT DES PERMISSIONS
-- ------------------------

GRANT SELECT ON public.hr_categories TO anon, authenticated;
GRANT SELECT ON public.hr_profiles TO anon, authenticated;
GRANT ALL ON public.hr_resource_assignments TO authenticated;

-- 6. VALIDATION FINALE
-- -------------------

-- Afficher un résumé des colonnes après migration
DO $$
DECLARE
  v_calculated_price_exists boolean;
  v_skills_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'hr_resource_assignments'
      AND column_name = 'calculated_price'
  ) INTO v_calculated_price_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'hr_profiles'
      AND column_name = 'skills'
  ) INTO v_skills_exists;

  RAISE NOTICE 'Migration terminée:';
  RAISE NOTICE '  - hr_resource_assignments.calculated_price: %',
    CASE WHEN v_calculated_price_exists THEN 'OK' ELSE 'MANQUANT' END;
  RAISE NOTICE '  - hr_profiles.skills: %',
    CASE WHEN v_skills_exists THEN 'OK' ELSE 'MANQUANT' END;
END $$;

-- Fin de la migration