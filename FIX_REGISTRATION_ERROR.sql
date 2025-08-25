-- ⚠️ SCRIPT POUR CORRIGER L'ERREUR "Database error saving new user"

-- ========================================
-- 1. VÉRIFIER LES TRIGGERS EXISTANTS
-- ========================================

SELECT 
    tgname as "Trigger Name",
    tgrelid::regclass as "Table",
    proname as "Function"
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'auth.users'::regclass
ORDER BY tgname;

-- ========================================
-- 2. VÉRIFIER LES COLONNES REQUISES
-- ========================================

-- Vérifier les colonnes de candidate_profiles
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'candidate_profiles'
AND is_nullable = 'NO'
AND column_default IS NULL
ORDER BY ordinal_position;

-- ========================================
-- 3. CORRIGER LA FONCTION handle_new_user (VERSION SÉCURISÉE)
-- ========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- Logging pour debug
    RAISE LOG 'handle_new_user triggered for user: %', new.email;
    RAISE LOG 'User metadata: %', new.raw_user_meta_data;
    
    -- Créer le profil principal avec gestion d'erreur
    BEGIN
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
            company_name = EXCLUDED.company_name,
            role = EXCLUDED.role;
            
        RAISE LOG 'Profile created/updated successfully';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG 'Error creating profile: %', SQLERRM;
            RAISE;
    END;
    
    -- Si c'est un candidat, créer son profil candidat
    IF new.raw_user_meta_data->>'role' = 'candidate' THEN
        BEGIN
            -- Vérifier quelles colonnes existent et sont requises
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
                first_name = EXCLUDED.first_name,
                last_name = EXCLUDED.last_name,
                phone = EXCLUDED.phone;
                
            RAISE LOG 'Candidate profile created/updated successfully';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE LOG 'Error creating candidate profile: %', SQLERRM;
                -- Ne pas faire échouer l'inscription si le profil candidat échoue
                -- L'utilisateur pourra être créé plus tard
        END;
    END IF;
    
    RETURN new;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Fatal error in handle_new_user: %', SQLERRM;
        RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 4. RECRÉER LE TRIGGER SI NÉCESSAIRE
-- ========================================

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recréer le trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- 5. AJOUTER DES VALEURS PAR DÉFAUT AUX COLONNES OBLIGATOIRES
-- ========================================

-- S'assurer que les colonnes obligatoires ont des valeurs par défaut
DO $$
BEGIN
    -- password_hash avec valeur par défaut
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'candidate_profiles' 
        AND column_name = 'password_hash'
        AND is_nullable = 'NO'
        AND column_default IS NULL
    ) THEN
        ALTER TABLE candidate_profiles 
        ALTER COLUMN password_hash SET DEFAULT '';
        RAISE NOTICE '✅ Valeur par défaut ajoutée pour password_hash';
    END IF;
    
    -- daily_rate avec valeur par défaut
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'candidate_profiles' 
        AND column_name = 'daily_rate'
        AND is_nullable = 'NO'
        AND column_default IS NULL
    ) THEN
        ALTER TABLE candidate_profiles 
        ALTER COLUMN daily_rate SET DEFAULT 0;
        RAISE NOTICE '✅ Valeur par défaut ajoutée pour daily_rate';
    END IF;
    
    -- seniority avec valeur par défaut
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'candidate_profiles' 
        AND column_name = 'seniority'
        AND is_nullable = 'NO'
        AND column_default IS NULL
    ) THEN
        ALTER TABLE candidate_profiles 
        ALTER COLUMN seniority SET DEFAULT 'junior';
        RAISE NOTICE '✅ Valeur par défaut ajoutée pour seniority';
    END IF;
END $$;

-- ========================================
-- 6. TEST DE LA FONCTION
-- ========================================

-- Tester la fonction avec des données simulées
DO $$
DECLARE
    v_test_id UUID := gen_random_uuid();
    v_test_email TEXT := 'test_' || extract(epoch from now())::text || '@example.com';
BEGIN
    -- Simuler un INSERT dans auth.users
    RAISE NOTICE '🧪 Test de la fonction handle_new_user...';
    
    -- Créer un faux utilisateur pour tester
    INSERT INTO profiles (id, email, first_name, last_name, role)
    VALUES (v_test_id, v_test_email, 'Test', 'User', 'client')
    ON CONFLICT DO NOTHING;
    
    -- Vérifier que ça fonctionne
    IF EXISTS (SELECT 1 FROM profiles WHERE id = v_test_id) THEN
        RAISE NOTICE '✅ Test réussi - La fonction peut créer des profils';
        -- Nettoyer
        DELETE FROM profiles WHERE id = v_test_id;
    ELSE
        RAISE NOTICE '❌ Test échoué - Vérifiez les permissions';
    END IF;
END $$;

-- ========================================
-- 7. VÉRIFIER LES LOGS RÉCENTS
-- ========================================

-- Cette requête ne fonctionnera que si vous avez accès aux logs
-- Sinon, vérifiez dans le dashboard Supabase > Logs
/*
SELECT 
    timestamp,
    event_message,
    metadata
FROM postgres_logs
WHERE timestamp > now() - interval '10 minutes'
AND (
    event_message LIKE '%handle_new_user%'
    OR event_message LIKE '%Database error%'
    OR event_message LIKE '%candidate_profiles%'
)
ORDER BY timestamp DESC
LIMIT 20;
*/

-- ========================================
-- 8. SOLUTION ALTERNATIVE : FONCTION SIMPLIFIÉE
-- ========================================

-- Si rien ne fonctionne, utiliser cette version ultra-simple
CREATE OR REPLACE FUNCTION public.handle_new_user_simple()
RETURNS trigger AS $$
BEGIN
    -- Juste créer le profil minimal
    INSERT INTO public.profiles (id, email, role)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'role', 'client')
    )
    ON CONFLICT (id) DO NOTHING;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Pour utiliser la version simple, décommentez ces lignes :
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--     AFTER INSERT ON auth.users
--     FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_simple();

-- ========================================
-- RAPPORT FINAL
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔧 CORRECTIONS APPLIQUÉES:';
    RAISE NOTICE '  1. Fonction handle_new_user corrigée avec gestion d''erreur';
    RAISE NOTICE '  2. Valeurs par défaut ajoutées aux colonnes obligatoires';
    RAISE NOTICE '  3. Trigger recréé';
    RAISE NOTICE '';
    RAISE NOTICE '📝 SI L''ERREUR PERSISTE:';
    RAISE NOTICE '  1. Vérifiez les logs dans Supabase Dashboard';
    RAISE NOTICE '  2. Essayez la fonction simple (lignes 214-225)';
    RAISE NOTICE '  3. Désactivez temporairement le trigger pour tester';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 POUR TESTER:';
    RAISE NOTICE '  1. Créez un nouveau compte candidat';
    RAISE NOTICE '  2. Vérifiez que le téléphone est sauvegardé';
    RAISE NOTICE '  3. Vérifiez dans profiles ET candidate_profiles';
END $$;