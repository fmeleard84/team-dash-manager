-- ============================================
-- TEST DU TRIGGER POUR LES CANDIDATS
-- ============================================

-- 1. Vérifier le code du trigger actuel
SELECT '1. CODE DU TRIGGER ACTUEL:' as step;
SELECT proname, prosrc FROM pg_proc WHERE proname = 'handle_new_user' LIMIT 1;

-- 2. Tester la création d'un utilisateur candidat de test
DO $$
DECLARE
    test_user_id UUID;
    test_email TEXT;
    profile_exists BOOLEAN;
    candidate_exists BOOLEAN;
BEGIN
    -- Générer un email unique pour le test
    test_email := 'test_candidate_' || floor(random() * 100000) || '@test.com';
    test_user_id := gen_random_uuid();
    
    RAISE NOTICE '';
    RAISE NOTICE '2. TEST DE CRÉATION D''UN CANDIDAT:';
    RAISE NOTICE '   Email de test: %', test_email;
    RAISE NOTICE '   User ID: %', test_user_id;
    
    -- Simuler l'insertion d'un utilisateur (comme le fait Supabase Auth)
    BEGIN
        -- Créer une entrée auth.users de test
        INSERT INTO auth.users (
            id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_user_meta_data,
            created_at,
            updated_at,
            raw_app_meta_data,
            aud,
            role
        ) VALUES (
            test_user_id,
            test_email,
            '$2a$10$PZ8Jy8M8C.DqzTUZ0Jd1F.tGpQn1wDm1nh5jxGLrGPWqjOtoQZ3Ry', -- dummy password
            now(),
            jsonb_build_object(
                'role', 'candidate',
                'first_name', 'Test',
                'last_name', 'Candidat',
                'phone', '+33612345678'
            ),
            now(),
            now(),
            '{"provider": "email", "providers": ["email"]}',
            'authenticated',
            'authenticated'
        );
        
        RAISE NOTICE '   ✅ Utilisateur auth.users créé';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '   ❌ Erreur création auth.users: %', SQLERRM;
    END;
    
    -- Attendre un peu pour que le trigger s'exécute
    PERFORM pg_sleep(0.5);
    
    -- Vérifier si le profil a été créé
    SELECT EXISTS(
        SELECT 1 FROM profiles WHERE id = test_user_id
    ) INTO profile_exists;
    
    -- Vérifier si le candidate_profile a été créé
    SELECT EXISTS(
        SELECT 1 FROM candidate_profiles WHERE user_id = test_user_id
    ) INTO candidate_exists;
    
    RAISE NOTICE '';
    RAISE NOTICE '3. RÉSULTATS:';
    RAISE NOTICE '   Profil créé dans profiles: %', CASE WHEN profile_exists THEN '✅ OUI' ELSE '❌ NON' END;
    RAISE NOTICE '   Profil créé dans candidate_profiles: %', CASE WHEN candidate_exists THEN '✅ OUI' ELSE '❌ NON' END;
    
    -- Afficher les détails si créés
    IF profile_exists THEN
        RAISE NOTICE '';
        RAISE NOTICE '   Détails du profil:';
        PERFORM (
            SELECT role, first_name, last_name, phone 
            FROM profiles 
            WHERE id = test_user_id
        );
    END IF;
    
    IF candidate_exists THEN
        RAISE NOTICE '';
        RAISE NOTICE '   Détails du candidate_profile:';
        PERFORM (
            SELECT first_name, last_name, phone, onboarding_step, qualification_status 
            FROM candidate_profiles 
            WHERE user_id = test_user_id
        );
    END IF;
    
    -- Nettoyer les données de test
    RAISE NOTICE '';
    RAISE NOTICE '4. NETTOYAGE:';
    DELETE FROM candidate_profiles WHERE user_id = test_user_id;
    DELETE FROM profiles WHERE id = test_user_id;
    DELETE FROM auth.users WHERE id = test_user_id;
    RAISE NOTICE '   ✅ Données de test supprimées';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '   ❌ Erreur pendant le test: %', SQLERRM;
        -- Essayer de nettoyer quand même
        DELETE FROM candidate_profiles WHERE user_id = test_user_id;
        DELETE FROM profiles WHERE id = test_user_id;
        DELETE FROM auth.users WHERE id = test_user_id;
END $$;