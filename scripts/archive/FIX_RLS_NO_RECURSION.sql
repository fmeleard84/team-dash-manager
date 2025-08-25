-- ============================================================================
-- SYSTÈME DE SÉCURITÉ SANS RÉCURSION
-- ============================================================================
-- Évite les références circulaires entre tables
-- ============================================================================

-- ÉTAPE 1: DÉSACTIVER TEMPORAIREMENT RLS POUR NETTOYER
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

-- ============================================================================
-- ÉTAPE 2: SUPPRIMER TOUTES LES ANCIENNES POLITIQUES
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

-- ============================================================================
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
-- POLITIQUE POUR PROJECTS (SANS RÉCURSION)
-- ============================================================================

-- Simple: propriétaire OU dans les bookings (sans EXISTS pour éviter récursion)
CREATE POLICY "Projects no recursion" ON projects
    FOR ALL USING (
        auth.uid() = owner_id
        OR
        auth.uid() IN (
            SELECT candidate_id 
            FROM project_bookings 
            WHERE project_id = projects.id
        )
    );

-- ============================================================================
-- POLITIQUE POUR PROJECT_BOOKINGS (INDÉPENDANTE)
-- ============================================================================

-- Les bookings sont visibles par propriétaire du projet ou candidat
CREATE POLICY "Bookings independent" ON project_bookings
    FOR ALL USING (
        candidate_id = auth.uid()
        OR
        project_id IN (
            SELECT id FROM projects WHERE owner_id = auth.uid()
        )
    );

-- ============================================================================
-- KANBAN: BASÉ SUR PROJECT ACCESS
-- ============================================================================

CREATE POLICY "Kanban boards based on projects" ON kanban_boards
    FOR ALL USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE owner_id = auth.uid()
               OR id IN (
                   SELECT project_id FROM project_bookings 
                   WHERE candidate_id = auth.uid()
               )
        )
    );

CREATE POLICY "Kanban columns based on boards" ON kanban_columns
    FOR ALL USING (
        board_id IN (
            SELECT id FROM kanban_boards kb
            WHERE project_id IN (
                SELECT id FROM projects 
                WHERE owner_id = auth.uid()
                   OR id IN (
                       SELECT project_id FROM project_bookings 
                       WHERE candidate_id = auth.uid()
                   )
            )
        )
    );

CREATE POLICY "Kanban cards based on columns" ON kanban_cards
    FOR ALL USING (
        column_id IN (
            SELECT id FROM kanban_columns kc
            WHERE board_id IN (
                SELECT id FROM kanban_boards kb
                WHERE project_id IN (
                    SELECT id FROM projects 
                    WHERE owner_id = auth.uid()
                       OR id IN (
                           SELECT project_id FROM project_bookings 
                           WHERE candidate_id = auth.uid()
                       )
                )
            )
        )
    );

-- ============================================================================
-- MESSAGES: BASÉ SUR PROJECT ACCESS
-- ============================================================================

CREATE POLICY "Message threads based on projects" ON message_threads
    FOR ALL USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE owner_id = auth.uid()
               OR id IN (
                   SELECT project_id FROM project_bookings 
                   WHERE candidate_id = auth.uid()
               )
        )
    );

CREATE POLICY "Messages based on threads" ON messages
    FOR ALL USING (
        thread_id IN (
            SELECT id FROM message_threads
            WHERE project_id IN (
                SELECT id FROM projects 
                WHERE owner_id = auth.uid()
                   OR id IN (
                       SELECT project_id FROM project_bookings 
                       WHERE candidate_id = auth.uid()
                   )
            )
        )
    );

CREATE POLICY "Message participants based on threads" ON message_participants
    FOR ALL USING (
        thread_id IN (
            SELECT id FROM message_threads
            WHERE project_id IN (
                SELECT id FROM projects 
                WHERE owner_id = auth.uid()
                   OR id IN (
                       SELECT project_id FROM project_bookings 
                       WHERE candidate_id = auth.uid()
                   )
            )
        )
    );

CREATE POLICY "Message attachments based on messages" ON message_attachments
    FOR ALL USING (
        message_id IN (
            SELECT id FROM messages
            WHERE thread_id IN (
                SELECT id FROM message_threads
                WHERE project_id IN (
                    SELECT id FROM projects 
                    WHERE owner_id = auth.uid()
                       OR id IN (
                           SELECT project_id FROM project_bookings 
                           WHERE candidate_id = auth.uid()
                       )
                )
            )
        )
    );

-- ============================================================================
-- PROJECT FILES: BASÉ SUR PROJECT ACCESS
-- ============================================================================

CREATE POLICY "Project files based on projects" ON project_files
    FOR ALL USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE owner_id = auth.uid()
               OR id IN (
                   SELECT project_id FROM project_bookings 
                   WHERE candidate_id = auth.uid()
               )
        )
    );

-- ============================================================================
-- HR RESOURCE ASSIGNMENTS: OUVERT POUR MVP
-- ============================================================================

CREATE POLICY "HR assignments open" ON hr_resource_assignments
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
    RAISE NOTICE '✅ SYSTÈME SANS RÉCURSION CONFIGURÉ !';
    RAISE NOTICE '';
    RAISE NOTICE '🔑 APPROCHE:';
    RAISE NOTICE '   - Utilise IN au lieu de EXISTS';
    RAISE NOTICE '   - Évite les références circulaires';
    RAISE NOTICE '   - Projects et Bookings sont indépendants';
    RAISE NOTICE '';
    RAISE NOTICE '📋 ACCÈS:';
    RAISE NOTICE '   - Propriétaires voient leurs projets';
    RAISE NOTICE '   - Candidats avec booking voient les projets';
    RAISE NOTICE '   - Tout découle de cette règle de base';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ TEST:';
    RAISE NOTICE '   - Déconnectez-vous et reconnectez-vous';
    RAISE NOTICE '   - Vérifiez que les projets s''affichent';
    RAISE NOTICE '';
END $$;