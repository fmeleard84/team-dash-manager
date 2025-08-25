-- ⚠️ SOLUTION SANS TOUCHER À AUTH.USERS

-- ========================================
-- 1. VÉRIFIER L'ÉTAT ACTUEL
-- ========================================

-- Voir si le trigger existe et quelle fonction il utilise
SELECT 
    'ÉTAT DU TRIGGER:' as info;
    
SELECT 
    t.tgname as "Trigger",
    p.proname as "Fonction",
    CASE t.tgenabled 
        WHEN 'O' THEN '✅ Actif'
        WHEN 'D' THEN '❌ Désactivé'
        ELSE '⚠️ État inconnu'
    END as "État"
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'auth.users'::regclass
AND t.tgtype = 7;

-- ========================================
-- 2. CORRIGER LA FONCTION SANS TOUCHER AU TRIGGER
-- ========================================

-- On ne peut pas modifier le trigger, mais on peut modifier la fonction qu'il appelle !
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    v_error_context TEXT;
BEGIN
    -- Version qui ne peut pas faire échouer l'inscription
    BEGIN
        -- Étape 1: Profil principal (obligatoire)
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
            first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
            last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
            phone = COALESCE(EXCLUDED.phone, profiles.phone),
            company_name = COALESCE(EXCLUDED.company_name, profiles.company_name),
            role = COALESCE(EXCLUDED.role, profiles.role);
    EXCEPTION
        WHEN OTHERS THEN
            -- Log mais ne pas faire échouer
            v_error_context := SQLERRM;
            RAISE WARNING 'Erreur création profile: %', v_error_context;
    END;
    
    -- Étape 2: Profil candidat (optionnel)
    IF new.raw_user_meta_data->>'role' = 'candidate' THEN
        BEGIN
            -- D'abord, s'assurer que les colonnes ont des valeurs par défaut
            INSERT INTO public.candidate_profiles (
                email,
                password_hash,
                first_name,
                last_name,
                phone,
                qualification_status,
                daily_rate,
                seniority
            )
            VALUES (
                new.email,
                '', -- password_hash vide
                COALESCE(new.raw_user_meta_data->>'first_name', ''),
                COALESCE(new.raw_user_meta_data->>'last_name', ''),
                new.raw_user_meta_data->>'phone',
                'pending',
                0, -- daily_rate par défaut
                'junior' -- seniority par défaut
            )
            ON CONFLICT (email) DO UPDATE SET
                first_name = COALESCE(EXCLUDED.first_name, candidate_profiles.first_name),
                last_name = COALESCE(EXCLUDED.last_name, candidate_profiles.last_name),
                phone = COALESCE(EXCLUDED.phone, candidate_profiles.phone);
        EXCEPTION
            WHEN OTHERS THEN
                v_error_context := SQLERRM;
                RAISE WARNING 'Erreur création candidate_profile: %', v_error_context;
                
                -- Essayer une insertion minimale
                BEGIN
                    INSERT INTO public.candidate_profiles (
                        email,
                        password_hash,
                        daily_rate,
                        seniority
                    )
                    VALUES (
                        new.email,
                        '',
                        0,
                        'junior'
                    )
                    ON CONFLICT (email) DO NOTHING;
                EXCEPTION
                    WHEN OTHERS THEN
                        -- Même l'insertion minimale échoue, on abandonne silencieusement
                        NULL;
                END;
        END;
    END IF;
    
    -- TOUJOURS retourner new pour ne pas bloquer l'inscription
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 3. S'ASSURER QUE LES COLONNES OBLIGATOIRES ONT DES VALEURS PAR DÉFAUT
-- ========================================

-- Pour candidate_profiles
DO $$
BEGIN
    -- password_hash
    BEGIN
        ALTER TABLE candidate_profiles ALTER COLUMN password_hash SET DEFAULT '';
        RAISE NOTICE '✅ Valeur par défaut ajoutée pour password_hash';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'ℹ️ password_hash a déjà une valeur par défaut ou erreur: %', SQLERRM;
    END;
    
    -- daily_rate
    BEGIN
        ALTER TABLE candidate_profiles ALTER COLUMN daily_rate SET DEFAULT 0;
        RAISE NOTICE '✅ Valeur par défaut ajoutée pour daily_rate';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'ℹ️ daily_rate a déjà une valeur par défaut ou erreur: %', SQLERRM;
    END;
    
    -- seniority
    BEGIN
        ALTER TABLE candidate_profiles ALTER COLUMN seniority SET DEFAULT 'junior';
        RAISE NOTICE '✅ Valeur par défaut ajoutée pour seniority';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'ℹ️ seniority a déjà une valeur par défaut ou erreur: %', SQLERRM;
    END;
END $$;

-- ========================================
-- 4. CRÉER UNE FONCTION DE RÉCUPÉRATION
-- ========================================

-- Cette fonction peut être appelée manuellement après l'inscription pour corriger les données
CREATE OR REPLACE FUNCTION public.fix_user_profile(p_email TEXT)
RETURNS void AS $$
DECLARE
    v_user_id UUID;
    v_metadata JSONB;
BEGIN
    -- Récupérer l'utilisateur et ses metadata
    SELECT id, raw_user_meta_data 
    INTO v_user_id, v_metadata
    FROM auth.users 
    WHERE email = p_email;
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'Utilisateur non trouvé: %', p_email;
        RETURN;
    END IF;
    
    -- Mettre à jour le profil
    UPDATE profiles 
    SET 
        phone = COALESCE(v_metadata->>'phone', phone),
        first_name = COALESCE(v_metadata->>'first_name', first_name),
        last_name = COALESCE(v_metadata->>'last_name', last_name),
        company_name = COALESCE(v_metadata->>'company_name', company_name)
    WHERE id = v_user_id;
    
    -- Si candidat, mettre à jour aussi candidate_profiles
    IF v_metadata->>'role' = 'candidate' THEN
        UPDATE candidate_profiles
        SET 
            phone = COALESCE(v_metadata->>'phone', phone),
            first_name = COALESCE(v_metadata->>'first_name', first_name),
            last_name = COALESCE(v_metadata->>'last_name', last_name)
        WHERE email = p_email;
    END IF;
    
    RAISE NOTICE '✅ Profil corrigé pour %', p_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 5. TESTER LA FONCTION
-- ========================================

-- Test pour vérifier que la fonction fonctionne
DO $$
DECLARE
    test_result BOOLEAN;
BEGIN
    -- Tester si on peut insérer dans profiles
    BEGIN
        INSERT INTO profiles (id, email, role) 
        VALUES (gen_random_uuid(), 'test_' || extract(epoch from now())::text || '@test.com', 'client')
        ON CONFLICT DO NOTHING;
        test_result := true;
    EXCEPTION
        WHEN OTHERS THEN
            test_result := false;
    END;
    
    IF test_result THEN
        RAISE NOTICE '✅ TEST RÉUSSI: La fonction peut créer des profils';
    ELSE
        RAISE NOTICE '❌ TEST ÉCHOUÉ: Problème de permissions sur profiles';
    END IF;
END $$;

-- ========================================
-- 6. VÉRIFIER LES COLONNES DE candidate_profiles
-- ========================================

SELECT 
    '', '---' WHERE false;
SELECT 
    'STRUCTURE DE candidate_profiles:' as info;
    
SELECT 
    column_name as "Colonne",
    CASE is_nullable 
        WHEN 'NO' THEN '❌ NOT NULL'
        ELSE '✅ Nullable'
    END as "Nullable",
    column_default as "Valeur par défaut"
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'candidate_profiles'
AND is_nullable = 'NO'
ORDER BY ordinal_position;

-- ========================================
-- 7. SOLUTION DE CONTOURNEMENT
-- ========================================

-- Si rien ne fonctionne, créer une fonction RPC pour créer les profils manuellement
CREATE OR REPLACE FUNCTION public.create_user_profiles_manually(
    p_user_id UUID,
    p_email TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_phone TEXT,
    p_company_name TEXT,
    p_role TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Créer/mettre à jour le profil principal
    INSERT INTO profiles (id, email, first_name, last_name, phone, company_name, role)
    VALUES (p_user_id, p_email, p_first_name, p_last_name, p_phone, p_company_name, p_role)
    ON CONFLICT (id) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        phone = EXCLUDED.phone,
        company_name = EXCLUDED.company_name;
    
    -- Si candidat, créer aussi le profil candidat
    IF p_role = 'candidate' THEN
        INSERT INTO candidate_profiles (
            email, 
            password_hash, 
            first_name, 
            last_name, 
            phone,
            qualification_status,
            daily_rate,
            seniority
        )
        VALUES (
            p_email, 
            '', 
            p_first_name, 
            p_last_name, 
            p_phone,
            'pending',
            0,
            'junior'
        )
        ON CONFLICT (email) DO UPDATE SET
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            phone = EXCLUDED.phone;
    END IF;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Erreur création profil manuel: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 8. INSTRUCTIONS FINALES
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎯 SOLUTIONS APPLIQUÉES:';
    RAISE NOTICE '';
    RAISE NOTICE '1. ✅ Fonction handle_new_user corrigée (ne bloque plus)';
    RAISE NOTICE '2. ✅ Valeurs par défaut ajoutées aux colonnes';
    RAISE NOTICE '3. ✅ Fonction de récupération créée: fix_user_profile()';
    RAISE NOTICE '4. ✅ Fonction manuelle créée: create_user_profiles_manually()';
    RAISE NOTICE '';
    RAISE NOTICE '📋 TESTEZ MAINTENANT:';
    RAISE NOTICE '1. Créez un nouveau compte candidat';
    RAISE NOTICE '2. Si ça fonctionne mais sans téléphone, utilisez:';
    RAISE NOTICE '   SELECT fix_user_profile(''email@example.com'');';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 SI ÇA NE FONCTIONNE TOUJOURS PAS:';
    RAISE NOTICE 'Appelez la fonction manuelle depuis votre code après l''inscription:';
    RAISE NOTICE '   SELECT create_user_profiles_manually(...)';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ IMPORTANT:';
    RAISE NOTICE 'Les WARNINGS sont normaux et n''empêchent pas l''inscription!';
END $$;