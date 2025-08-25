-- ============================================================================
-- TEST DIRECT DE CRÉATION D'UTILISATEUR
-- ============================================================================

-- 1. Essayer de créer directement un profile de test
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
BEGIN
    -- Essayer d'insérer un profile test
    INSERT INTO profiles (id, email, role)
    VALUES (test_user_id, 'test_candidate@example.com', 'candidate')
    ON CONFLICT (email) DO UPDATE
    SET role = 'candidate';
    
    RAISE NOTICE 'Test profile créé avec succès';
    
    -- Nettoyer
    DELETE FROM profiles WHERE id = test_user_id;
    RAISE NOTICE 'Test profile supprimé';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Erreur lors du test: %', SQLERRM;
END $$;

-- 2. Vérifier les contraintes sur la table profiles
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.profiles'::regclass;

-- 3. Vérifier les colonnes requises
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 4. Voir la définition complète de la table profiles
SELECT 
    'CREATE TABLE profiles (' || string_agg(
        column_name || ' ' || 
        data_type || 
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
        CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
        ', '
    ) || ');' as table_definition
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'profiles';