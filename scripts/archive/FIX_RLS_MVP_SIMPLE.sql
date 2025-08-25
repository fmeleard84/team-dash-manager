-- ============================================================================
-- SYSTÈME DE SÉCURITÉ MVP SIMPLIFIÉ
-- ============================================================================
-- PRINCIPE: Isolation entre clients uniquement
-- Les ressources/candidats peuvent voir les projets où ils sont impliqués
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
-- POLITIQUE SIMPLE: PROJECTS
-- ============================================================================

-- Visible pour: propriétaire OU candidat avec booking OU participant message
CREATE POLICY "Project access MVP" ON projects
    FOR ALL USING (
        -- Propriétaire
        auth.uid() = owner_id
        OR
        -- Candidat avec booking (peu importe le statut)
        EXISTS (
            SELECT 1 FROM project_bookings pb
            WHERE pb.project_id = projects.id
            AND pb.candidate_id = auth.uid()
        )
        OR
        -- Participant aux messages
        EXISTS (
            SELECT 1 FROM message_participants mp
            JOIN message_threads mt ON mt.id = mp.thread_id
            WHERE mt.project_id = projects.id
            AND mp.user_id = auth.uid()
        )
    );

-- ============================================================================
-- KANBAN: ACCÈS OUVERT POUR TOUS CEUX QUI VOIENT LE PROJET
-- ============================================================================

CREATE POLICY "Kanban boards MVP" ON kanban_boards
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

CREATE POLICY "Kanban columns MVP" ON kanban_columns
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

CREATE POLICY "Kanban cards MVP" ON kanban_cards
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
-- MESSAGES: ACCÈS OUVERT
-- ============================================================================

CREATE POLICY "Message threads MVP" ON message_threads
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
                OR EXISTS (
                    SELECT 1 FROM message_participants mp
                    WHERE mp.thread_id = message_threads.id
                    AND mp.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Messages MVP" ON messages
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
                OR EXISTS (
                    SELECT 1 FROM message_participants mp
                    WHERE mp.thread_id = mt.id
                    AND mp.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Message participants MVP" ON message_participants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM message_threads mt
            JOIN projects p ON p.id = mt.project_id
            WHERE mt.id = message_participants.thread_id
            AND (
                p.owner_id = auth.uid()
                OR message_participants.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM project_bookings pb
                    WHERE pb.project_id = p.id
                    AND pb.candidate_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Message attachments MVP" ON message_attachments
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
                OR EXISTS (
                    SELECT 1 FROM message_participants mp
                    WHERE mp.thread_id = mt.id
                    AND mp.user_id = auth.uid()
                )
            )
        )
    );

-- ============================================================================
-- PROJECT FILES: ACCÈS OUVERT
-- ============================================================================

CREATE POLICY "Project files MVP" ON project_files
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
-- HR RESOURCE ASSIGNMENTS: ACCÈS SIMPLE
-- ============================================================================

CREATE POLICY "Resource assignments MVP" ON hr_resource_assignments
    FOR ALL USING (
        -- Propriétaires voient tout
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = hr_resource_assignments.project_id
            AND p.owner_id = auth.uid()
        )
        OR
        -- Les ressources voient où elles sont assignées (utiliser profile_id au lieu de candidate_id)
        hr_resource_assignments.profile_id IN (
            SELECT id FROM hr_profiles WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- PROJECT BOOKINGS: ACCÈS SIMPLE
-- ============================================================================

CREATE POLICY "Bookings MVP" ON project_bookings
    FOR ALL USING (
        -- Propriétaires voient tous les bookings
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_bookings.project_id
            AND p.owner_id = auth.uid()
        )
        OR
        -- Les candidats voient leurs bookings
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
    RAISE NOTICE '✅ SYSTÈME DE SÉCURITÉ MVP CONFIGURÉ !';
    RAISE NOTICE '';
    RAISE NOTICE '🔑 RÈGLES SIMPLES:';
    RAISE NOTICE '   - Les clients voient UNIQUEMENT leurs projets';
    RAISE NOTICE '   - Les ressources avec booking voient le projet complet';
    RAISE NOTICE '   - Les participants aux messages voient le projet';
    RAISE NOTICE '';
    RAISE NOTICE '📋 ACCÈS:';
    RAISE NOTICE '   - Kanban: visible si accès au projet';
    RAISE NOTICE '   - Messages: visible si accès au projet';
    RAISE NOTICE '   - Fichiers: visible si accès au projet';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ MVP:';
    RAISE NOTICE '   - Politique simplifiée pour le MVP';
    RAISE NOTICE '   - Le frontend peut ajouter des filtres supplémentaires';
    RAISE NOTICE '   - Isolation principale: entre clients différents';
    RAISE NOTICE '';
END $$;