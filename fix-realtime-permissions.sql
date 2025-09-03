-- Script pour corriger les permissions realtime

-- 1. S'assurer que les rôles ont les bonnes permissions sur hr_resource_assignments
GRANT SELECT ON hr_resource_assignments TO authenticated;
GRANT SELECT ON hr_resource_assignments TO anon;
GRANT SELECT ON hr_resource_assignments TO service_role;

-- 2. S'assurer que le rôle realtime peut accéder à la table
DO $$
BEGIN
    -- Créer le rôle s'il n'existe pas
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_realtime_admin') THEN
        CREATE ROLE supabase_realtime_admin;
    END IF;
END $$;

-- Donner les permissions au rôle realtime
GRANT USAGE ON SCHEMA public TO supabase_realtime_admin;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO supabase_realtime_admin;
GRANT SELECT ON hr_resource_assignments TO supabase_realtime_admin;

-- 3. S'assurer que RLS permet la lecture pour le realtime
-- Créer une politique permissive pour le SELECT si elle n'existe pas
DO $$
BEGIN
    -- Supprimer l'ancienne politique si elle existe
    DROP POLICY IF EXISTS "Enable read access for all users" ON hr_resource_assignments;
    DROP POLICY IF EXISTS "Allow authenticated users to view assignments" ON hr_resource_assignments;
    
    -- Créer une nouvelle politique plus permissive pour le realtime
    CREATE POLICY "Enable realtime read for all authenticated users" 
    ON hr_resource_assignments 
    FOR SELECT 
    TO authenticated 
    USING (true);
    
    -- Politique pour anon aussi (pour les tests)
    CREATE POLICY "Enable realtime read for anon" 
    ON hr_resource_assignments 
    FOR SELECT 
    TO anon 
    USING (true);
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Ignorer si la politique existe déjà
END $$;

-- 4. Vérifier le résultat
SELECT 
    'Permissions Check' as check_type,
    has_table_privilege('authenticated', 'hr_resource_assignments', 'SELECT') as auth_can_select,
    has_table_privilege('anon', 'hr_resource_assignments', 'SELECT') as anon_can_select,
    has_table_privilege('supabase_realtime_admin', 'hr_resource_assignments', 'SELECT') as realtime_can_select;

-- 5. Vérifier les politiques
SELECT 
    polname as policy_name,
    (SELECT rolname FROM pg_roles WHERE oid = polroles[1]) as role,
    polcmd as command
FROM pg_policy
WHERE polrelid = 'hr_resource_assignments'::regclass
ORDER BY polname;

-- 6. Forcer un reload de la configuration (si vous avez les droits admin)
-- SELECT pg_reload_conf();