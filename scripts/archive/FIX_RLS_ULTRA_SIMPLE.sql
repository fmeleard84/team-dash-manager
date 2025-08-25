-- ============================================================================
-- SYSTÈME DE SÉCURITÉ ULTRA SIMPLIFIÉ POUR MVP
-- ============================================================================
-- OBJECTIF: Isolation basique entre clients uniquement
-- ============================================================================

-- ÉTAPE 1: ACTIVER RLS SUR TOUTES LES TABLES
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
-- POLITIQUE ULTRA SIMPLE: PROJECTS
-- ============================================================================

CREATE POLICY "Project access simple" ON projects
    FOR ALL USING (
        -- Propriétaire voit ses projets
        auth.uid() = owner_id
        OR
        -- Candidat avec booking voit le projet
        EXISTS (
            SELECT 1 FROM project_bookings pb
            WHERE pb.project_id = projects.id
            AND pb.candidate_id = auth.uid()
        )
    );

-- ============================================================================
-- KANBAN: SI ON VOIT LE PROJET, ON VOIT LE KANBAN
-- ============================================================================

CREATE POLICY "Kanban boards simple" ON kanban_boards
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = kanban_boards.project_id
            AND (
                p.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM project_bookings pb
                    WHERE pb.project_id = p.id
                    AND pb.candidate_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Kanban columns simple" ON kanban_columns
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM kanban_boards kb
            JOIN projects p ON p.id = kb.project_id
            WHERE kb.id = kanban_columns.board_id
            AND (
                p.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM project_bookings pb
                    WHERE pb.project_id = p.id
                    AND pb.candidate_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Kanban cards simple" ON kanban_cards
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM kanban_columns kc
            JOIN kanban_boards kb ON kb.id = kc.board_id
            JOIN projects p ON p.id = kb.project_id
            WHERE kc.id = kanban_cards.column_id
            AND (
                p.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM project_bookings pb
                    WHERE pb.project_id = p.id
                    AND pb.candidate_id = auth.uid()
                )
            )
        )
    );

-- ============================================================================
-- MESSAGES: ACCÈS SI ON VOIT LE PROJET
-- ============================================================================

CREATE POLICY "Message threads simple" ON message_threads
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = message_threads.project_id
            AND (
                p.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM project_bookings pb
                    WHERE pb.project_id = p.id
                    AND pb.candidate_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Messages simple" ON messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM message_threads mt
            JOIN projects p ON p.id = mt.project_id
            WHERE mt.id = messages.thread_id
            AND (
                p.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM project_bookings pb
                    WHERE pb.project_id = p.id
                    AND pb.candidate_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Message participants simple" ON message_participants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM message_threads mt
            JOIN projects p ON p.id = mt.project_id
            WHERE mt.id = message_participants.thread_id
            AND (
                p.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM project_bookings pb
                    WHERE pb.project_id = p.id
                    AND pb.candidate_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Message attachments simple" ON message_attachments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM messages m
            JOIN message_threads mt ON mt.id = m.thread_id
            JOIN projects p ON p.id = mt.project_id
            WHERE m.id = message_attachments.message_id
            AND (
                p.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM project_bookings pb
                    WHERE pb.project_id = p.id
                    AND pb.candidate_id = auth.uid()
                )
            )
        )
    );

-- ============================================================================
-- PROJECT FILES: ACCÈS SI ON VOIT LE PROJET
-- ============================================================================

CREATE POLICY "Project files simple" ON project_files
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_files.project_id
            AND (
                p.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM project_bookings pb
                    WHERE pb.project_id = p.id
                    AND pb.candidate_id = auth.uid()
                )
            )
        )
    );

-- ============================================================================
-- HR RESOURCE ASSIGNMENTS: POLITIQUE TRÈS SIMPLE
-- ============================================================================

CREATE POLICY "Resource assignments simple" ON hr_resource_assignments
    FOR ALL USING (
        -- Toujours true pour MVP (on filtre côté frontend)
        true
    );

-- ============================================================================
-- PROJECT BOOKINGS: ACCÈS SIMPLE
-- ============================================================================

CREATE POLICY "Bookings simple" ON project_bookings
    FOR ALL USING (
        -- Propriétaires voient les bookings de leurs projets
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_bookings.project_id
            AND p.owner_id = auth.uid()
        )
        OR
        -- Les candidats voient leurs propres bookings
        project_bookings.candidate_id = auth.uid()
    );

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
    RAISE NOTICE '✅ SYSTÈME MVP ULTRA SIMPLE CONFIGURÉ !';
    RAISE NOTICE '';
    RAISE NOTICE '🔑 RÈGLE PRINCIPALE:';
    RAISE NOTICE '   - Les clients voient LEURS projets (owner_id)';
    RAISE NOTICE '   - Les ressources avec booking voient le projet';
    RAISE NOTICE '';
    RAISE NOTICE '📋 TOUT EST OUVERT SI:';
    RAISE NOTICE '   - Vous êtes propriétaire du projet';
    RAISE NOTICE '   - Vous avez un booking sur le projet';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ NOTE MVP:';
    RAISE NOTICE '   - hr_resource_assignments: pas de restriction (true)';
    RAISE NOTICE '   - Le frontend gère les détails d''affichage';
    RAISE NOTICE '   - Focus sur l''isolation entre clients différents';
    RAISE NOTICE '';
END $$;