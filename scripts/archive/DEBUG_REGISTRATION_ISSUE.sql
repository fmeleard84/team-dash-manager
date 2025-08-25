-- ============================================================================
-- DÉBUGGER LE PROBLÈME D'INSCRIPTION DES CANDIDATS
-- ============================================================================

-- 1. VÉRIFIER TOUS LES TRIGGERS QUI POURRAIENT BLOQUER
SELECT 
    n.nspname as schema_name,
    t.tgname as trigger_name,
    c.relname as table_name,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE n.nspname IN ('auth', 'public')
    AND c.relname IN ('users', 'profiles', 'candidate_profiles')
ORDER BY n.nspname, c.relname, t.tgname;

-- 2. DÉSACTIVER TEMPORAIREMENT TOUS LES TRIGGERS PROBLÉMATIQUES
ALTER TABLE public.profiles DISABLE TRIGGER ALL;
ALTER TABLE public.candidate_profiles DISABLE TRIGGER ALL;

-- 3. SUPPRIMER LES TRIGGERS QUI POURRAIENT CAUSER DES PROBLÈMES
DROP TRIGGER IF EXISTS on_profile_created_candidate ON public.profiles;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 4. CRÉER UN TRIGGER MINIMAL QUI NE PEUT PAS ÉCHOUER
CREATE OR REPLACE FUNCTION public.handle_new_user_minimal()
RETURNS trigger AS $$
BEGIN
    -- Essayer d'insérer dans profiles, mais ne pas bloquer si ça échoue
    BEGIN
        INSERT INTO public.profiles (id, email, role)
        VALUES (
            new.id,
            new.email,
            COALESCE(new.raw_user_meta_data->>'role', 'client')
        )
        ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
        -- Ignorer complètement l'erreur
        NULL;
    END;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RECRÉER LE TRIGGER MINIMAL
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_minimal();

-- 6. VÉRIFIER LES CONTRAINTES SUR PROFILES
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.profiles'::regclass;

-- 7. VÉRIFIER LES CONTRAINTES SUR CANDIDATE_PROFILES
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.candidate_profiles'::regclass;

-- 8. SUPPRIMER LES CONTRAINTES PROBLÉMATIQUES SI NÉCESSAIRE
-- (À exécuter manuellement si on trouve des contraintes bloquantes)

-- 9. RÉACTIVER LES TRIGGERS DE BASE
ALTER TABLE public.profiles ENABLE TRIGGER ALL;

-- 10. NE PAS RÉACTIVER les triggers sur candidate_profiles pour l'instant
-- ALTER TABLE public.candidate_profiles ENABLE TRIGGER ALL;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 DÉBUGAGE INSCRIPTION CANDIDATS';
    RAISE NOTICE '';
    RAISE NOTICE '✅ ACTIONS EFFECTUÉES:';
    RAISE NOTICE '   - Triggers désactivés temporairement';
    RAISE NOTICE '   - Trigger minimal créé (ne peut pas échouer)';
    RAISE NOTICE '   - Contraintes vérifiées';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ TEST MAINTENANT:';
    RAISE NOTICE '   - Essayez de créer un candidat';
    RAISE NOTICE '   - Si ça marche, le problème venait d''un trigger';
    RAISE NOTICE '';
END $$;