-- ⚠️ IMPORTANT: Exécutez ce script dans le dashboard Supabase SQL Editor
-- Go to: https://supabase.com/dashboard/project/egdelmcijszuapcpglsy/sql/new

-- 1. Correction des politiques RLS pour candidate_qualification_results
-- =====================================================================

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Candidates can view own qualification results" ON candidate_qualification_results;
DROP POLICY IF EXISTS "Candidates can insert own qualification results" ON candidate_qualification_results;
DROP POLICY IF EXISTS "Candidates can update own qualification results" ON candidate_qualification_results;

-- Créer de nouvelles politiques RLS
CREATE POLICY "Users can view own qualification results"
ON candidate_qualification_results FOR SELECT
USING (
  candidate_id IN (
    SELECT id FROM candidate_profiles 
    WHERE email = auth.email()
  )
);

CREATE POLICY "Users can insert own qualification results"
ON candidate_qualification_results FOR INSERT
WITH CHECK (
  candidate_id IN (
    SELECT id FROM candidate_profiles 
    WHERE email = auth.email()
  )
);

CREATE POLICY "Users can update own qualification results"
ON candidate_qualification_results FOR UPDATE
USING (
  candidate_id IN (
    SELECT id FROM candidate_profiles 
    WHERE email = auth.email()
  )
);

-- 2. Correction des politiques RLS pour active_time_tracking
-- ===========================================================

-- Vérifier si la table existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'active_time_tracking') THEN
    -- Supprimer les anciennes politiques
    DROP POLICY IF EXISTS "Users can view own time tracking" ON active_time_tracking;
    DROP POLICY IF EXISTS "Candidates can view own time tracking" ON active_time_tracking;
    
    -- Créer nouvelle politique
    ALTER TABLE active_time_tracking ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view own time tracking"
    ON active_time_tracking FOR SELECT
    USING (
      candidate_id IN (
        SELECT id FROM candidate_profiles 
        WHERE email = auth.email()
      )
      OR 
      auth.uid() IN (
        SELECT user_id FROM profiles WHERE is_hr = true
      )
    );
  END IF;
END $$;

-- 3. Vérification et activation de RLS
-- =====================================

ALTER TABLE candidate_qualification_results ENABLE ROW LEVEL SECURITY;

-- 4. Test de vérification
-- =======================
-- Cette requête devrait retourner les résultats pour vérifier que tout fonctionne

DO $$
DECLARE
  test_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO test_count FROM candidate_qualification_results;
  RAISE NOTICE 'Nombre total de résultats de qualification: %', test_count;
  
  SELECT COUNT(*) INTO test_count FROM candidate_profiles;
  RAISE NOTICE 'Nombre total de profils candidats: %', test_count;
END $$;