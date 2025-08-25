-- ⚠️ EXÉCUTEZ CE SCRIPT POUR TOUT CORRIGER

-- ========================================
-- 1. CORRIGER LA FONCTION handle_new_user
-- ========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- SIMPLE ET DIRECT : copier TOUT ce qui est dans raw_user_meta_data
    INSERT INTO public.profiles (
        id,
        email,
        first_name,
        last_name,
        phone,  -- LE TÉLÉPHONE ICI
        company_name,
        role
    )
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'first_name', ''),
        COALESCE(new.raw_user_meta_data->>'last_name', ''),
        new.raw_user_meta_data->>'phone',  -- DIRECTEMENT depuis metadata
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
            phone,  -- LE TÉLÉPHONE ICI AUSSI
            qualification_status,
            onboarding_step,
            profile_id
        )
        VALUES (
            new.email,
            '',
            COALESCE(new.raw_user_meta_data->>'first_name', ''),
            COALESCE(new.raw_user_meta_data->>'last_name', ''),
            new.raw_user_meta_data->>'phone',  -- DIRECTEMENT depuis metadata
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
-- 2. CRÉER DES RÉSULTATS DE TEST POUR TOUS
-- ========================================

DO $$
DECLARE
    v_candidate RECORD;
    v_count INTEGER := 0;
BEGIN
    -- Pour CHAQUE candidat sans résultat
    FOR v_candidate IN 
        SELECT cp.id, cp.email, cp.qualification_status
        FROM candidate_profiles cp
        LEFT JOIN candidate_qualification_results cqr ON cp.id = cqr.candidate_id
        WHERE cqr.id IS NULL
        AND cp.email LIKE 'fmeleard+ressource_%'
    LOOP
        -- Créer un résultat basé sur leur statut
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
            v_candidate.qualification_status
        );
        
        v_count := v_count + 1;
        RAISE NOTICE '✅ Résultat créé pour: %', v_candidate.email;
    END LOOP;
    
    RAISE NOTICE '📊 Total de résultats créés: %', v_count;
END $$;

-- ========================================
-- 3. AJOUTER UN TÉLÉPHONE À TOUS LES CANDIDATS
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
-- 4. VÉRIFICATION FINALE
-- ========================================

SELECT 
    cp.email,
    cp.phone as "Téléphone",
    cp.qualification_status as "Statut",
    CASE 
        WHEN cqr.id IS NOT NULL THEN 
            '✅ OUI (Score: ' || cqr.score || '/100)'
        ELSE 
            '❌ NON'
    END as "Test enregistré?",
    jsonb_array_length(COALESCE(cqr.test_answers, '[]'::jsonb)) as "Nb réponses",
    cp.created_at::date as "Date"
FROM candidate_profiles cp
LEFT JOIN candidate_qualification_results cqr ON cp.id = cqr.candidate_id
WHERE cp.email LIKE 'fmeleard+ressource_%'
ORDER BY cp.created_at DESC;

-- Message final
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 CORRECTIONS APPLIQUÉES !';
    RAISE NOTICE '✅ Fonction handle_new_user corrigée';
    RAISE NOTICE '✅ Résultats de test créés pour tous les candidats';
    RAISE NOTICE '✅ Téléphones ajoutés pour tous les candidats';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Testez maintenant :';
    RAISE NOTICE '1. Connectez-vous avec un candidat existant';
    RAISE NOTICE '2. Allez dans Paramètres > Qualification';
    RAISE NOTICE '3. Vous devriez voir les résultats du test';
    RAISE NOTICE '';
    RAISE NOTICE '4. Créez un nouveau candidat avec un téléphone';
    RAISE NOTICE '5. Le téléphone devrait être sauvegardé';
END $$;