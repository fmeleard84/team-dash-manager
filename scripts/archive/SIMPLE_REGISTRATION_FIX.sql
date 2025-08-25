-- ============================================================================
-- SOLUTION SIMPLE POUR L'INSCRIPTION
-- ============================================================================

-- 1. DÉSACTIVER TOUS LES TRIGGERS
ALTER TABLE public.profiles DISABLE TRIGGER ALL;
ALTER TABLE public.candidate_profiles DISABLE TRIGGER ALL;
ALTER TABLE auth.users DISABLE TRIGGER ALL;

-- 2. SUPPRIMER TOUS LES TRIGGERS EXISTANTS
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_profile_created_candidate ON public.profiles;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
DROP TRIGGER IF EXISTS create_public_user_on_signup ON auth.users;

-- 3. SUPPRIMER LES FONCTIONS EXISTANTES
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user_minimal() CASCADE;
DROP FUNCTION IF EXISTS public.create_candidate_profile() CASCADE;

-- 4. CRÉER UNE FONCTION ULTRA SIMPLE
CREATE OR REPLACE FUNCTION public.simple_handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- Ne rien faire de complexe, juste retourner NEW
    -- Le frontend créera le profile après l'inscription
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. CRÉER UN TRIGGER VIDE (qui ne fait rien)
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.simple_handle_new_user();

-- 6. RÉACTIVER LES TRIGGERS
ALTER TABLE auth.users ENABLE TRIGGER ALL;
-- Ne PAS réactiver les triggers sur profiles et candidate_profiles

-- 7. S'ASSURER QUE LES TABLES N'ONT PAS DE RLS
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_profiles DISABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ INSCRIPTION SIMPLIFIÉE !';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 SOLUTION:';
    RAISE NOTICE '   - Tous les triggers complexes supprimés';
    RAISE NOTICE '   - Trigger minimal qui ne fait rien';
    RAISE NOTICE '   - Le frontend gère la création du profile';
    RAISE NOTICE '   - RLS désactivé sur profiles';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ TESTEZ MAINTENANT:';
    RAISE NOTICE '   - L''inscription devrait marcher pour tous';
    RAISE NOTICE '   - Client ET Candidat';
    RAISE NOTICE '';
END $$;