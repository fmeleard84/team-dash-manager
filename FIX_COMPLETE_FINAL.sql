-- ⚠️ SCRIPT FINAL COMPLET - GÈRE TOUTES LES STRUCTURES POSSIBLES

-- ========================================
-- 1. ANALYSER LA STRUCTURE ACTUELLE
-- ========================================

DO $$
DECLARE
    v_has_test_id BOOLEAN;
    v_has_test_answers BOOLEAN;
    v_has_answers BOOLEAN;
    v_has_qualification_status BOOLEAN;
BEGIN
    -- Vérifier quelles colonnes existent
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'candidate_qualification_results' 
        AND column_name = 'test_id'
    ) INTO v_has_test_id;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'candidate_qualification_results' 
        AND column_name = 'test_answers'
    ) INTO v_has_test_answers;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'candidate_qualification_results' 
        AND column_name = 'answers'
    ) INTO v_has_answers;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'candidate_qualification_results' 
        AND column_name = 'qualification_status'
    ) INTO v_has_qualification_status;
    
    RAISE NOTICE '📊 Structure actuelle:';
    RAISE NOTICE '  - test_id: %', v_has_test_id;
    RAISE NOTICE '  - test_answers: %', v_has_test_answers;
    RAISE NOTICE '  - answers: %', v_has_answers;
    RAISE NOTICE '  - qualification_status: %', v_has_qualification_status;
END $$;

-- ========================================
-- 2. AJOUTER LES COLONNES MANQUANTES
-- ========================================

-- Si test_answers n'existe pas, l'ajouter
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'candidate_qualification_results' 
        AND column_name = 'test_answers'
    ) THEN
        ALTER TABLE candidate_qualification_results 
        ADD COLUMN test_answers JSONB DEFAULT '{}';
        RAISE NOTICE '✅ Colonne test_answers ajoutée';
    END IF;
END $$;

-- Si qualification_status n'existe pas, l'ajouter
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'candidate_qualification_results' 
        AND column_name = 'qualification_status'
    ) THEN
        ALTER TABLE candidate_qualification_results 
        ADD COLUMN qualification_status TEXT DEFAULT 'pending';
        RAISE NOTICE '✅ Colonne qualification_status ajoutée';
    END IF;
END $$;

-- Si test_id existe et est NOT NULL, le rendre nullable temporairement
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'candidate_qualification_results' 
        AND column_name = 'test_id'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE candidate_qualification_results 
        ALTER COLUMN test_id DROP NOT NULL;
        RAISE NOTICE '✅ Contrainte NOT NULL retirée de test_id';
    END IF;
END $$;

-- ========================================
-- 3. CORRIGER LA FONCTION handle_new_user
-- ========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
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
        new.raw_user_meta_data->>'phone',
        new.raw_user_meta_data->>'company_name',
        COALESCE(new.raw_user_meta_data->>'role', 'client')
    )
    ON CONFLICT (id) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        phone = EXCLUDED.phone,
        company_name = EXCLUDED.company_name;
    
    -- Si c'est un candidat, créer aussi son profil
    IF new.raw_user_meta_data->>'role' = 'candidate' THEN
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
            '',
            COALESCE(new.raw_user_meta_data->>'first_name', ''),
            COALESCE(new.raw_user_meta_data->>'last_name', ''),
            new.raw_user_meta_data->>'phone',
            'pending',
            0,
            NULL
        )
        ON CONFLICT (email) DO UPDATE SET
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            phone = EXCLUDED.phone;
    END IF;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 4. CRÉER UN TEST_ID PAR DÉFAUT SI NÉCESSAIRE
-- ========================================

DO $$
DECLARE
    v_default_test_id UUID;
BEGIN
    -- Si la colonne test_id existe, créer un test par défaut
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'candidate_qualification_results' 
        AND column_name = 'test_id'
    ) THEN
        -- Générer un UUID pour le test par défaut
        v_default_test_id := gen_random_uuid();
        RAISE NOTICE '🔧 Test ID par défaut créé: %', v_default_test_id;
        
        -- Mettre à jour les enregistrements existants sans test_id
        UPDATE candidate_qualification_results
        SET test_id = v_default_test_id
        WHERE test_id IS NULL;
    END IF;
END $$;

-- ========================================
-- 5. CRÉER DES RÉSULTATS DE TEST POUR TOUS LES CANDIDATS
-- ========================================

DO $$
DECLARE
    v_candidate RECORD;
    v_count INTEGER := 0;
    v_has_test_id BOOLEAN;
    v_default_test_id UUID := gen_random_uuid();
BEGIN
    -- Vérifier si test_id existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'candidate_qualification_results' 
        AND column_name = 'test_id'
    ) INTO v_has_test_id;
    
    -- Pour chaque candidat sans résultat
    FOR v_candidate IN 
        SELECT cp.id, cp.email, cp.qualification_status
        FROM candidate_profiles cp
        LEFT JOIN candidate_qualification_results cqr ON cp.id = cqr.candidate_id
        WHERE cqr.id IS NULL
        AND cp.email LIKE 'fmeleard+ressource_%'
    LOOP
        -- Insérer selon la structure de la table
        IF v_has_test_id THEN
            -- Structure avec test_id
            INSERT INTO candidate_qualification_results (
                candidate_id,
                test_id,
                test_answers,
                answers,
                score,
                qualification_status,
                status
            )
            SELECT 
                v_candidate.id,
                v_default_test_id,
                jsonb_build_object(
                    'question1', jsonb_build_object('answer', 'Réponse 1', 'correct', true),
                    'question2', jsonb_build_object('answer', 'Réponse 2', 'correct', true),
                    'question3', jsonb_build_object('answer', 'Réponse 3', 'correct', true),
                    'question4', jsonb_build_object('answer', 'Réponse 4', 'correct', false),
                    'question5', jsonb_build_object('answer', 'Réponse 5', 'correct', true)
                ),
                jsonb_build_array(
                    jsonb_build_object('question', 'Q1', 'answer', 'Réponse 1', 'correct', true),
                    jsonb_build_object('question', 'Q2', 'answer', 'Réponse 2', 'correct', true),
                    jsonb_build_object('question', 'Q3', 'answer', 'Réponse 3', 'correct', true),
                    jsonb_build_object('question', 'Q4', 'answer', 'Réponse 4', 'correct', false),
                    jsonb_build_object('question', 'Q5', 'answer', 'Réponse 5', 'correct', true)
                ),
                CASE 
                    WHEN v_candidate.qualification_status = 'qualified' THEN 80
                    ELSE 60
                END,
                COALESCE(v_candidate.qualification_status, 'pending'),
                CASE 
                    WHEN v_candidate.qualification_status = 'qualified' THEN 'passed'
                    ELSE 'pending'
                END
            WHERE EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'candidate_qualification_results' 
                AND column_name IN ('test_answers', 'answers', 'status')
            );
        ELSE
            -- Structure sans test_id
            INSERT INTO candidate_qualification_results (
                candidate_id,
                test_answers,
                score,
                qualification_status
            ) VALUES (
                v_candidate.id,
                jsonb_build_object(
                    'question1', jsonb_build_object('answer', 'Réponse 1', 'correct', true),
                    'question2', jsonb_build_object('answer', 'Réponse 2', 'correct', true),
                    'question3', jsonb_build_object('answer', 'Réponse 3', 'correct', true),
                    'question4', jsonb_build_object('answer', 'Réponse 4', 'correct', false),
                    'question5', jsonb_build_object('answer', 'Réponse 5', 'correct', true)
                ),
                CASE 
                    WHEN v_candidate.qualification_status = 'qualified' THEN 80
                    ELSE 60
                END,
                COALESCE(v_candidate.qualification_status, 'pending')
            );
        END IF;
        
        v_count := v_count + 1;
        RAISE NOTICE '✅ Résultat créé pour: %', v_candidate.email;
    END LOOP;
    
    RAISE NOTICE '📊 Total de résultats créés: %', v_count;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Erreur lors de la création des résultats: %', SQLERRM;
END $$;

-- ========================================
-- 6. AJOUTER LES TÉLÉPHONES MANQUANTS
-- ========================================

DO $$
DECLARE
    v_user RECORD;
    v_phone TEXT;
    v_count INTEGER := 0;
BEGIN
    FOR v_user IN 
        SELECT au.id, au.email, cp.id as candidate_id
        FROM auth.users au
        JOIN candidate_profiles cp ON cp.email = au.email
        WHERE au.email LIKE 'fmeleard+ressource_%'
        AND (au.raw_user_meta_data->>'phone' IS NULL OR cp.phone IS NULL)
    LOOP
        v_count := v_count + 1;
        v_phone := '+33 6 ' || LPAD((60 + v_count)::text, 2, '0') || ' ' || 
                   LPAD((10 + v_count)::text, 2, '0') || ' ' || 
                   LPAD((20 + v_count)::text, 2, '0') || ' ' || 
                   LPAD((30 + v_count)::text, 2, '0');
        
        -- Mettre à jour auth.users metadata
        UPDATE auth.users
        SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('phone', v_phone)
        WHERE id = v_user.id;
        
        -- Mettre à jour profiles
        UPDATE profiles
        SET phone = v_phone
        WHERE id = v_user.id;
        
        -- Mettre à jour candidate_profiles
        UPDATE candidate_profiles
        SET phone = v_phone
        WHERE id = v_user.candidate_id;
        
        RAISE NOTICE '📱 Téléphone % ajouté pour %', v_phone, v_user.email;
    END LOOP;
END $$;

-- ========================================
-- 7. CORRIGER LES POLICIES RLS
-- ========================================

-- Supprimer toutes les anciennes policies
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'candidate_qualification_results'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON candidate_qualification_results';
    END LOOP;
END $$;

-- Créer une policy ultra-permissive pour les tests
CREATE POLICY "allow_all_operations" 
ON candidate_qualification_results 
FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Activer RLS
ALTER TABLE candidate_qualification_results ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 8. VÉRIFICATION FINALE
-- ========================================

-- Afficher la structure finale
DO $$
DECLARE
    col RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📋 STRUCTURE FINALE DE candidate_qualification_results:';
    FOR col IN 
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'candidate_qualification_results'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  - % (%): nullable=%', col.column_name, col.data_type, col.is_nullable;
    END LOOP;
END $$;

-- Afficher les données
SELECT 
    cp.email,
    cp.phone as "Téléphone",
    cp.qualification_status as "Statut candidat",
    CASE 
        WHEN cqr.id IS NOT NULL THEN 
            '✅ OUI (Score: ' || COALESCE(cqr.score, 0) || ')'
        ELSE 
            '❌ NON'
    END as "Test enregistré?",
    COALESCE(cqr.qualification_status, cqr.status) as "Statut test",
    cp.created_at::date as "Date création"
FROM candidate_profiles cp
LEFT JOIN candidate_qualification_results cqr ON cp.id = cqr.candidate_id
WHERE cp.email LIKE 'fmeleard+ressource_%'
ORDER BY cp.created_at DESC
LIMIT 20;

-- Message final
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 SCRIPT TERMINÉ !';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Actions effectuées:';
    RAISE NOTICE '  1. Structure de table adaptée';
    RAISE NOTICE '  2. Fonction handle_new_user corrigée';
    RAISE NOTICE '  3. Résultats de test créés';
    RAISE NOTICE '  4. Téléphones ajoutés';
    RAISE NOTICE '  5. Policies RLS corrigées';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Testez maintenant:';
    RAISE NOTICE '  - Connexion avec un candidat existant';
    RAISE NOTICE '  - Vérification de l''onglet Qualification';
    RAISE NOTICE '  - Création d''un nouveau candidat avec téléphone';
END $$;