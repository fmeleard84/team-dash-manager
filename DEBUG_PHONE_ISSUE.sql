-- ⚠️ IMPORTANT: Exécutez ce script dans le dashboard Supabase SQL Editor

-- ========================================
-- 1. VÉRIFIER LES DONNÉES STOCKÉES DANS AUTH.USERS
-- ========================================

SELECT 
    email,
    raw_user_meta_data->>'first_name' as "Prénom dans metadata",
    raw_user_meta_data->>'last_name' as "Nom dans metadata",
    raw_user_meta_data->>'phone' as "Téléphone dans metadata",
    raw_user_meta_data->>'role' as "Rôle dans metadata",
    created_at::date as "Date création"
FROM auth.users
WHERE email LIKE 'fmeleard+ressource_%'
ORDER BY created_at DESC
LIMIT 5;

-- ========================================
-- 2. CORRIGER LA FONCTION handle_new_user AVEC PLUS DE LOGS
-- ========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    v_phone TEXT;
    v_company TEXT;
    v_first_name TEXT;
    v_last_name TEXT;
    v_role TEXT;
BEGIN
    -- Récupérer TOUTES les valeurs et les logger
    v_first_name := new.raw_user_meta_data->>'first_name';
    v_last_name := new.raw_user_meta_data->>'last_name';
    v_phone := new.raw_user_meta_data->>'phone';
    v_company := new.raw_user_meta_data->>'company_name';
    v_role := COALESCE(new.raw_user_meta_data->>'role', 'client');
    
    -- Log détaillé
    RAISE NOTICE '=== HANDLE_NEW_USER DEBUG ===';
    RAISE NOTICE 'Email: %', new.email;
    RAISE NOTICE 'First name: %', v_first_name;
    RAISE NOTICE 'Last name: %', v_last_name;
    RAISE NOTICE 'Phone: %', v_phone;
    RAISE NOTICE 'Company: %', v_company;
    RAISE NOTICE 'Role: %', v_role;
    RAISE NOTICE 'Full metadata: %', new.raw_user_meta_data;
    
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
        COALESCE(v_first_name, ''),
        COALESCE(v_last_name, ''),
        v_phone,  -- Peut être NULL, c'est OK
        v_company,  -- Peut être NULL, c'est OK
        v_role
    )
    ON CONFLICT (id) DO UPDATE SET
        phone = COALESCE(EXCLUDED.phone, profiles.phone),
        company_name = COALESCE(EXCLUDED.company_name, profiles.company_name),
        first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
        last_name = COALESCE(EXCLUDED.last_name, profiles.last_name);
    
    RAISE NOTICE 'Profile created/updated in profiles table';
    
    -- Si c'est un candidat
    IF v_role = 'candidate' THEN
        RAISE NOTICE 'Creating candidate profile...';
        
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
            COALESCE(v_first_name, ''),
            COALESCE(v_last_name, ''),
            v_phone,  -- Le téléphone ICI
            'pending',
            0,
            NULL
        )
        ON CONFLICT (email) DO UPDATE SET
            phone = COALESCE(EXCLUDED.phone, candidate_profiles.phone),
            first_name = COALESCE(EXCLUDED.first_name, candidate_profiles.first_name),
            last_name = COALESCE(EXCLUDED.last_name, candidate_profiles.last_name);
            
        RAISE NOTICE 'Candidate profile created/updated';
    END IF;
    
    RAISE NOTICE '=== END HANDLE_NEW_USER ===';
    RETURN new;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
        RAISE WARNING 'State: %', SQLSTATE;
        RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 3. TESTER MANUELLEMENT LA COPIE DU TÉLÉPHONE
-- ========================================

-- Regardons un utilisateur spécifique
DO $$
DECLARE
    v_user_id UUID;
    v_metadata JSONB;
    v_phone_in_metadata TEXT;
    v_phone_in_profiles TEXT;
    v_phone_in_candidates TEXT;
BEGIN
    -- Prendre le dernier candidat créé
    SELECT id, raw_user_meta_data 
    INTO v_user_id, v_metadata
    FROM auth.users 
    WHERE email LIKE 'fmeleard+ressource_%'
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF v_user_id IS NOT NULL THEN
        v_phone_in_metadata := v_metadata->>'phone';
        
        SELECT phone INTO v_phone_in_profiles
        FROM profiles 
        WHERE id = v_user_id;
        
        SELECT phone INTO v_phone_in_candidates
        FROM candidate_profiles 
        WHERE email = (SELECT email FROM auth.users WHERE id = v_user_id);
        
        RAISE NOTICE '';
        RAISE NOTICE '📱 ANALYSE DU TÉLÉPHONE:';
        RAISE NOTICE '  - Dans auth.users metadata: %', COALESCE(v_phone_in_metadata, 'NULL');
        RAISE NOTICE '  - Dans profiles table: %', COALESCE(v_phone_in_profiles, 'NULL');
        RAISE NOTICE '  - Dans candidate_profiles: %', COALESCE(v_phone_in_candidates, 'NULL');
        
        -- Si le téléphone est dans metadata mais pas dans les tables, le copier
        IF v_phone_in_metadata IS NOT NULL AND v_phone_in_profiles IS NULL THEN
            UPDATE profiles SET phone = v_phone_in_metadata WHERE id = v_user_id;
            RAISE NOTICE '  ✅ Téléphone copié dans profiles';
        END IF;
        
        IF v_phone_in_metadata IS NOT NULL AND v_phone_in_candidates IS NULL THEN
            UPDATE candidate_profiles 
            SET phone = v_phone_in_metadata 
            WHERE email = (SELECT email FROM auth.users WHERE id = v_user_id);
            RAISE NOTICE '  ✅ Téléphone copié dans candidate_profiles';
        END IF;
    END IF;
END $$;

-- ========================================
-- 4. AFFICHER LE RÉSULTAT FINAL
-- ========================================

SELECT 
    cp.email,
    au.raw_user_meta_data->>'phone' as "Phone dans Auth",
    p.phone as "Phone dans Profiles",
    cp.phone as "Phone dans Candidates",
    cp.created_at::date as "Date"
FROM candidate_profiles cp
JOIN auth.users au ON au.email = cp.email
LEFT JOIN profiles p ON p.email = cp.email
WHERE cp.email LIKE 'fmeleard+ressource_%'
ORDER BY cp.created_at DESC
LIMIT 5;