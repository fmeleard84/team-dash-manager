-- ============================================================================
-- DÉSACTIVER RLS TEMPORAIREMENT POUR DÉBUGGER
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
    'project_files', 'hr_resource_assignments', 'project_bookings'
);

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ RLS DÉSACTIVÉ SUR TOUTES LES TABLES !';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ ATTENTION: Les données ne sont plus protégées !';
    RAISE NOTICE '   Ceci est temporaire pour débugger.';
    RAISE NOTICE '   Testez si vos projets s''affichent maintenant.';
    RAISE NOTICE '';
END $$;