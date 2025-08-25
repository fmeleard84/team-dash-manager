-- ============================================================================
-- SYSTÈME RLS MVP - TRÈS OUVERT
-- ============================================================================
-- Principe: Isolation minimale, laisse le frontend filtrer
-- ============================================================================

-- ÉTAPE 1: DÉSACTIVER RLS POUR NETTOYER
-- ============================================================================
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

-- ÉTAPE 2: SUPPRIMER TOUTES LES ANCIENNES POLITIQUES ET FONCTIONS
-- ============================================================================
DO $$ 
DECLARE
    pol RECORD;
    tbl TEXT;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY[
        'projects', 'kanban_boards', 'kanban_columns', 'kanban_cards',
        'message_threads', 'messages', 'message_participants', 'message_attachments',
        'project_files', 'hr_resource_assignments', 'project_bookings'
    ])
    LOOP
        FOR pol IN EXECUTE format('SELECT policyname FROM pg_policies WHERE tablename = %L', tbl)
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, tbl);
        END LOOP;
    END LOOP;
END $$;

-- Supprimer la fonction si elle existe
DROP FUNCTION IF EXISTS can_access_project(uuid);

-- ÉTAPE 3: RÉACTIVER RLS
-- ============================================================================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_resource_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_bookings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLITIQUE ULTRA SIMPLE POUR PROJECTS
-- ============================================================================

-- Politique très ouverte pour MVP
CREATE POLICY "Projects MVP open" ON projects
    FOR ALL USING (
        -- Propriétaire voit ses projets
        owner_id = auth.uid()
        OR
        -- OU le projet a un statut public/validé (pour les candidats)
        status IN ('validate', 'in_progress', 'completed')
        OR
        -- OU il y a un booking (peu importe qui)
        EXISTS (SELECT 1 FROM project_bookings WHERE project_id = projects.id)
    );

-- ============================================================================
-- PROJECT_BOOKINGS: TRÈS OUVERT
-- ============================================================================

CREATE POLICY "Bookings MVP open" ON project_bookings
    FOR ALL USING (
        -- Toujours vrai pour MVP
        true
    );

-- ============================================================================
-- KANBAN: SI ON VOIT LE PROJET
-- ============================================================================

CREATE POLICY "Kanban boards MVP" ON kanban_boards
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects p 
            WHERE p.id = kanban_boards.project_id
            AND (
                p.owner_id = auth.uid() 
                OR p.status IN ('validate', 'in_progress', 'completed')
                OR EXISTS (SELECT 1 FROM project_bookings WHERE project_id = p.id)
            )
        )
    );

CREATE POLICY "Kanban columns MVP" ON kanban_columns
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM kanban_boards kb
            WHERE kb.id = kanban_columns.board_id
        )
    );

CREATE POLICY "Kanban cards MVP" ON kanban_cards
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM kanban_columns kc
            WHERE kc.id = kanban_cards.column_id
        )
    );

-- ============================================================================
-- MESSAGES: TRÈS OUVERT
-- ============================================================================

CREATE POLICY "Message threads MVP" ON message_threads
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects p 
            WHERE p.id = message_threads.project_id
            AND (
                p.owner_id = auth.uid() 
                OR p.status IN ('validate', 'in_progress', 'completed')
                OR EXISTS (SELECT 1 FROM project_bookings WHERE project_id = p.id)
            )
        )
    );

CREATE POLICY "Messages MVP" ON messages
    FOR ALL USING (
        EXISTS (SELECT 1 FROM message_threads WHERE id = messages.thread_id)
    );

CREATE POLICY "Message participants MVP" ON message_participants
    FOR ALL USING (
        EXISTS (SELECT 1 FROM message_threads WHERE id = message_participants.thread_id)
    );

CREATE POLICY "Message attachments MVP" ON message_attachments
    FOR ALL USING (
        EXISTS (SELECT 1 FROM messages WHERE id = message_attachments.message_id)
    );

-- ============================================================================
-- PROJECT FILES: TRÈS OUVERT
-- ============================================================================

CREATE POLICY "Project files MVP" ON project_files
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects p 
            WHERE p.id = project_files.project_id
            AND (
                p.owner_id = auth.uid() 
                OR p.status IN ('validate', 'in_progress', 'completed')
                OR EXISTS (SELECT 1 FROM project_bookings WHERE project_id = p.id)
            )
        )
    );

-- ============================================================================
-- HR RESOURCE ASSIGNMENTS: COMPLÈTEMENT OUVERT
-- ============================================================================

CREATE POLICY "HR assignments MVP" ON hr_resource_assignments
    FOR ALL USING (true);

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================

SELECT 
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename IN (
        'projects', 'kanban_boards', 'kanban_columns', 'kanban_cards',
        'message_threads', 'messages', 'project_files',
        'hr_resource_assignments', 'project_bookings'
    )
ORDER BY tablename, policyname;

-- ============================================================================
-- MESSAGE DE CONFIRMATION
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ SYSTÈME MVP TRÈS OUVERT CONFIGURÉ !';
    RAISE NOTICE '';
    RAISE NOTICE '🔓 ACCÈS ÉLARGI:';
    RAISE NOTICE '   - Propriétaires: voient leurs projets';
    RAISE NOTICE '   - TOUS: voient les projets avec statut validate/in_progress/completed';
    RAISE NOTICE '   - TOUS: voient les projets qui ont des bookings';
    RAISE NOTICE '';
    RAISE NOTICE '📋 SIMPLIFICATIONS:';
    RAISE NOTICE '   - project_bookings: complètement ouvert (true)';
    RAISE NOTICE '   - hr_resource_assignments: complètement ouvert (true)';
    RAISE NOTICE '   - Pas de récursion, politiques simples';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 MVP:';
    RAISE NOTICE '   - Isolation basique entre clients (owner_id)';
    RAISE NOTICE '   - Candidats voient beaucoup de projets';
    RAISE NOTICE '   - Le frontend gère le filtrage fin';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ À FAIRE:';
    RAISE NOTICE '   - Le frontend doit filtrer selon le rôle utilisateur';
    RAISE NOTICE '   - Cette config est temporaire pour le MVP';
    RAISE NOTICE '';
END $$;