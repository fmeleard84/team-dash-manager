-- ============================================================================
-- DÉSACTIVER COMPLÈTEMENT RLS POUR DÉBUGGER
-- ============================================================================

-- DÉSACTIVER RLS SUR TOUTES LES TABLES
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_boards DISABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_columns DISABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_cards DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_threads DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_files DISABLE ROW LEVEL SECURITY;
ALTER TABLE hr_resource_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE hr_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- SUPPRIMER TOUTES LES POLITIQUES
DO $$ 
DECLARE
    pol RECORD;
    tbl TEXT;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY[
        'projects', 'kanban_boards', 'kanban_columns', 'kanban_cards',
        'message_threads', 'messages', 'message_participants', 'message_attachments',
        'project_files', 'hr_resource_assignments', 'project_bookings',
        'candidate_profiles', 'hr_profiles', 'profiles'
    ])
    LOOP
        FOR pol IN EXECUTE format('SELECT policyname FROM pg_policies WHERE tablename = %L', tbl)
        LOOP
            BEGIN
                EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, tbl);
            EXCEPTION WHEN OTHERS THEN
                -- Ignorer les erreurs
                NULL;
            END;
        END LOOP;
    END LOOP;
END $$;

-- SUPPRIMER LES FONCTIONS RLS
DROP FUNCTION IF EXISTS can_access_project(uuid);

-- VÉRIFIER LE STATUT
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'projects', 'kanban_boards', 'kanban_columns', 'kanban_cards',
    'message_threads', 'messages', 'message_participants', 'message_attachments',
    'project_files', 'hr_resource_assignments', 'project_bookings',
    'candidate_profiles', 'hr_profiles', 'profiles'
)
ORDER BY tablename;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🚨 RLS COMPLÈTEMENT DÉSACTIVÉ !';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ ATTENTION:';
    RAISE NOTICE '   - Aucune protection des données';
    RAISE NOTICE '   - Tous les utilisateurs voient tout';
    RAISE NOTICE '   - Ceci est TEMPORAIRE pour débugger';
    RAISE NOTICE '';
    RAISE NOTICE '✅ TESTEZ MAINTENANT:';
    RAISE NOTICE '   - Les candidats devraient voir les projets';
    RAISE NOTICE '   - Si ça ne marche pas, le problème n''est pas RLS';
    RAISE NOTICE '';
END $$;