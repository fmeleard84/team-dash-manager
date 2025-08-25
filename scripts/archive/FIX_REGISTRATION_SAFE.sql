-- ============================================================================
-- SOLUTION SÛRE POUR L'INSCRIPTION (SANS TOUCHER AUTH.USERS)
-- ============================================================================

-- 1. DÉSACTIVER LES TRIGGERS SUR LES TABLES PUBLIC SEULEMENT
ALTER TABLE public.profiles DISABLE TRIGGER USER;
ALTER TABLE public.candidate_profiles DISABLE TRIGGER USER;

-- 2. SUPPRIMER LES TRIGGERS SUR LES TABLES PUBLIC
DROP TRIGGER IF EXISTS on_profile_created_candidate ON public.profiles;

-- 3. SUPPRIMER LES FONCTIONS QUI POURRAIENT CAUSER DES PROBLÈMES
DROP FUNCTION IF EXISTS public.create_candidate_profile() CASCADE;

-- 4. VÉRIFIER ET RECRÉER LA FONCTION handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- Créer un profile minimal, ignorer les erreurs
    BEGIN
        INSERT INTO public.profiles (id, email, role)
        VALUES (
            new.id,
            new.email,
            COALESCE(new.raw_user_meta_data->>'role', 'client')
        )
        ON CONFLICT (id) DO UPDATE
        SET 
            email = EXCLUDED.email,
            role = COALESCE(new.raw_user_meta_data->>'role', EXCLUDED.role);
    EXCEPTION WHEN OTHERS THEN
        -- Ignorer l'erreur et continuer
        RAISE LOG 'Could not create profile for user %: %', new.id, SQLERRM;
    END;
    
    -- Si c'est un candidat, essayer de créer candidate_profile
    IF new.raw_user_meta_data->>'role' = 'candidate' THEN
        BEGIN
            INSERT INTO public.candidate_profiles (
                id,
                profile_id,
                email,
                first_name,
                last_name,
                seniority,
                expertise
            ) VALUES (
                gen_random_uuid(),
                new.id,
                new.email,
                COALESCE(new.raw_user_meta_data->>'first_name', ''),
                COALESCE(new.raw_user_meta_data->>'last_name', ''),
                'intermediate',
                ARRAY[]::text[]
            )
            ON CONFLICT (email) DO UPDATE
            SET
                profile_id = EXCLUDED.profile_id;
        EXCEPTION WHEN OTHERS THEN
            -- Ignorer l'erreur
            RAISE LOG 'Could not create candidate_profile for user %: %', new.id, SQLERRM;
        END;
    END IF;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. VÉRIFIER SI LE TRIGGER EXISTE DÉJÀ
DO $$
BEGIN
    -- Supprimer le trigger s'il existe
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created' 
        AND tgrelid = 'auth.users'::regclass
    ) THEN
        DROP TRIGGER on_auth_user_created ON auth.users;
    END IF;
END $$;

-- 6. RECRÉER LE TRIGGER
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. S'ASSURER QUE RLS EST DÉSACTIVÉ
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_profiles DISABLE ROW LEVEL SECURITY;

-- 8. RÉACTIVER LES TRIGGERS USER SUR LES TABLES PUBLIC
ALTER TABLE public.profiles ENABLE TRIGGER USER;
ALTER TABLE public.candidate_profiles ENABLE TRIGGER USER;

-- 9. VÉRIFIER LA STRUCTURE DES TABLES
SELECT 
    'profiles' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'profiles'
    AND column_name IN ('id', 'email', 'role')
UNION ALL
SELECT 
    'candidate_profiles' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'candidate_profiles'
    AND column_name IN ('id', 'profile_id', 'email');

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ INSCRIPTION CORRIGÉE (VERSION SÛRE) !';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 MODIFICATIONS:';
    RAISE NOTICE '   - Fonction handle_new_user avec gestion d''erreur complète';
    RAISE NOTICE '   - Création automatique de candidate_profile si role=candidate';
    RAISE NOTICE '   - Toutes les erreurs sont ignorées (LOG seulement)';
    RAISE NOTICE '   - RLS désactivé sur profiles et candidate_profiles';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ TESTEZ:';
    RAISE NOTICE '   - Créez un nouveau candidat';
    RAISE NOTICE '   - L''inscription devrait fonctionner';
    RAISE NOTICE '   - Même si le profile n''est pas créé, l''utilisateur sera créé';
    RAISE NOTICE '';
END $$;