-- ⚠️ IMPORTANT: Exécutez ce script dans le dashboard Supabase SQL Editor
-- Go to: https://supabase.com/dashboard/project/egdelmcijszuapcpglsy/sql/new

-- ========================================
-- 1. VÉRIFIER ET CORRIGER LA TABLE candidate_qualification_results
-- ========================================

-- Vérifier si la table existe et sa structure
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'candidate_qualification_results') THEN
        RAISE NOTICE 'Création de la table candidate_qualification_results...';
        
        CREATE TABLE candidate_qualification_results (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE,
            test_answers JSONB NOT NULL DEFAULT '{}',
            score INTEGER DEFAULT 0,
            qualification_status TEXT CHECK (qualification_status IN ('qualified', 'pending', 'rejected')) DEFAULT 'pending',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Index
        CREATE INDEX idx_candidate_qualification_results_candidate_id 
        ON candidate_qualification_results (candidate_id);
        
        CREATE INDEX idx_candidate_qualification_results_status 
        ON candidate_qualification_results (qualification_status);
    END IF;
END $$;

-- Activer RLS
ALTER TABLE candidate_qualification_results ENABLE ROW LEVEL SECURITY;

-- Supprimer TOUTES les anciennes politiques
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'candidate_qualification_results'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON candidate_qualification_results', pol.policyname);
    END LOOP;
END $$;

-- Créer une politique TRÈS PERMISSIVE pour les candidats (temporaire pour debug)
CREATE POLICY "Allow all for authenticated users"
ON candidate_qualification_results 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- ========================================
-- 2. CORRIGER LA FONCTION handle_new_user POUR LE TÉLÉPHONE
-- ========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    v_phone TEXT;
    v_company TEXT;
BEGIN
    -- Récupérer les valeurs
    v_phone := new.raw_user_meta_data->>'phone';
    v_company := new.raw_user_meta_data->>'company_name';
    
    -- Debug log
    RAISE NOTICE 'Creating user with phone: %, company: %', v_phone, v_company;
    
    -- Créer le profil principal
    INSERT INTO public.profiles (
        id,
        email,
        first_name,
        last_name,
        phone,
        company_name,
        role
    )
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'first_name', ''),
        COALESCE(new.raw_user_meta_data->>'last_name', ''),
        v_phone,
        v_company,
        COALESCE(new.raw_user_meta_data->>'role', 'client')
    )
    ON CONFLICT (id) DO UPDATE SET
        phone = COALESCE(EXCLUDED.phone, profiles.phone),
        company_name = COALESCE(EXCLUDED.company_name, profiles.company_name),
        first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
        last_name = COALESCE(EXCLUDED.last_name, profiles.last_name);
    
    -- Si c'est un candidat
    IF new.raw_user_meta_data->>'role' = 'candidate' THEN
        RAISE NOTICE 'Creating candidate profile with phone: %', v_phone;
        
        INSERT INTO public.candidate_profiles (
            email,
            password_hash,
            first_name,
            last_name,
            phone,
            qualification_status,
            onboarding_step,
            profile_id
        )
        VALUES (
            new.email,
            '',  -- Password vide car auth gérée par Supabase
            COALESCE(new.raw_user_meta_data->>'first_name', ''),
            COALESCE(new.raw_user_meta_data->>'last_name', ''),
            v_phone,  -- Téléphone
            'pending',
            0,
            NULL
        )
        ON CONFLICT (email) DO UPDATE SET
            phone = COALESCE(EXCLUDED.phone, candidate_profiles.phone),
            first_name = COALESCE(EXCLUDED.first_name, candidate_profiles.first_name),
            last_name = COALESCE(EXCLUDED.last_name, candidate_profiles.last_name);
    END IF;
    
    -- Si c'est un client
    IF new.raw_user_meta_data->>'role' = 'client' THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_profiles') THEN
            INSERT INTO public.client_profiles (
                user_id,
                email,
                first_name,
                last_name,
                phone,
                company_name
            )
            VALUES (
                new.id,
                new.email,
                COALESCE(new.raw_user_meta_data->>'first_name', ''),
                COALESCE(new.raw_user_meta_data->>'last_name', ''),
                v_phone,
                v_company
            )
            ON CONFLICT (email) DO UPDATE SET
                phone = COALESCE(EXCLUDED.phone, client_profiles.phone),
                company_name = COALESCE(EXCLUDED.company_name, client_profiles.company_name);
        END IF;
    END IF;
    
    RETURN new;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
        RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 3. TEST MANUEL D'INSERTION DANS candidate_qualification_results
-- ========================================

-- Tester si on peut insérer manuellement (décommentez pour tester)
/*
DO $$
DECLARE
    v_candidate_id UUID;
BEGIN
    -- Récupérer un candidat existant
    SELECT id INTO v_candidate_id 
    FROM candidate_profiles 
    WHERE email = 'fmeleard+ressource_8@gmail.com'  -- Remplacez par votre email
    LIMIT 1;
    
    IF v_candidate_id IS NOT NULL THEN
        -- Essayer d'insérer un résultat de test
        INSERT INTO candidate_qualification_results (
            candidate_id,
            test_answers,
            score,
            qualification_status
        ) VALUES (
            v_candidate_id,
            '{"q1": "answer1", "q2": "answer2"}'::jsonb,
            85,
            'qualified'
        )
        ON CONFLICT (candidate_id) 
        DO UPDATE SET 
            test_answers = EXCLUDED.test_answers,
            score = EXCLUDED.score,
            qualification_status = EXCLUDED.qualification_status,
            updated_at = NOW();
        
        RAISE NOTICE 'Test result inserted successfully for candidate %', v_candidate_id;
    ELSE
        RAISE NOTICE 'No candidate found with that email';
    END IF;
END $$;
*/

-- ========================================
-- 4. VÉRIFICATION ET DEBUG
-- ========================================

DO $$
DECLARE
    v_count INTEGER;
    v_candidate_count INTEGER;
    v_result_count INTEGER;
    v_phone_count INTEGER;
BEGIN
    -- Compter les candidats
    SELECT COUNT(*) INTO v_candidate_count FROM candidate_profiles;
    RAISE NOTICE '👥 Nombre total de candidats: %', v_candidate_count;
    
    -- Compter les candidats avec téléphone
    SELECT COUNT(*) INTO v_phone_count FROM candidate_profiles WHERE phone IS NOT NULL AND phone != '';
    RAISE NOTICE '📱 Candidats avec téléphone: %', v_phone_count;
    
    -- Compter les résultats de qualification
    SELECT COUNT(*) INTO v_result_count FROM candidate_qualification_results;
    RAISE NOTICE '📊 Nombre de résultats de qualification: %', v_result_count;
    
    -- Vérifier les politiques RLS
    SELECT COUNT(*) INTO v_count FROM pg_policies WHERE tablename = 'candidate_qualification_results';
    RAISE NOTICE '🔒 Nombre de politiques RLS sur candidate_qualification_results: %', v_count;
    
    -- Afficher quelques candidats récents pour debug
    RAISE NOTICE '';
    RAISE NOTICE '=== Derniers candidats créés ===';
    FOR v_count IN 
        SELECT id, email, phone, qualification_status, onboarding_step 
        FROM candidate_profiles 
        ORDER BY created_at DESC 
        LIMIT 3
    LOOP
        -- Cette boucle ne fait rien, juste pour la structure
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Script exécuté avec succès!';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  Si les résultats ne s''affichent toujours pas:';
    RAISE NOTICE '   1. Vérifiez les logs console du navigateur pour "Saving test results"';
    RAISE NOTICE '   2. Vérifiez que onboardingData.testAnswers contient des données';
    RAISE NOTICE '   3. Essayez de décommenter et exécuter le test manuel ci-dessus';
END $$;

-- ========================================
-- 5. AFFICHER LES CANDIDATS RÉCENTS AVEC LEUR STATUT
-- ========================================

SELECT 
    cp.email,
    cp.phone,
    cp.qualification_status,
    cp.onboarding_step,
    CASE 
        WHEN cqr.id IS NOT NULL THEN 'OUI (' || cqr.score || '/100)'
        ELSE 'NON'
    END as "Résultats test?",
    cp.created_at::date as "Date création"
FROM candidate_profiles cp
LEFT JOIN candidate_qualification_results cqr ON cp.id = cqr.candidate_id
ORDER BY cp.created_at DESC
LIMIT 10;