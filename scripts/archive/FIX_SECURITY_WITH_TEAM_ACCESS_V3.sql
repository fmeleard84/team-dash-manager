-- ============================================================================
-- CORRECTION DE SÉCURITÉ AVEC ACCÈS ÉQUIPE - VERSION 3
-- ============================================================================
-- Ce script corrige l'isolation des clients TOUT EN permettant l'accès aux équipes
-- Les candidats acceptés peuvent voir les projets sur lesquels ils travaillent
-- ============================================================================

-- ÉTAPE 1: ACTIVER RLS SUR TOUTES LES TABLES CONCERNÉES
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

-- Supprimer toutes les politiques existantes
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
-- ÉTAPE 3: CRÉER LES NOUVELLES POLITIQUES AVEC ACCÈS ÉQUIPE
-- ============================================================================

-- PROJECTS: Les propriétaires ET les candidats acceptés peuvent voir les projets
CREATE POLICY "Owners and team members can view projects" ON projects
    FOR SELECT USING (
        -- Le propriétaire peut voir son projet
        auth.uid() = owner_id
        OR
        -- Les candidats acceptés peuvent voir le projet
        EXISTS (
            SELECT 1 FROM project_bookings pb
            WHERE pb.project_id = projects.id
            AND pb.candidate_id = auth.uid()
            AND pb.status = 'accepted'
        )
        OR
        -- Les membres de l'équipe HR assignés peuvent voir le projet
        EXISTS (
            SELECT 1 FROM hr_resource_assignments hra
            WHERE hra.project_id = projects.id
            AND hra.profile_id IN (
                SELECT profile_id FROM hr_profiles WHERE user_id = auth.uid()
            )
            AND hra.booking_status IN ('pending', 'confirmed')
        )
    );

-- Seuls les propriétaires peuvent créer/modifier/supprimer leurs projets
CREATE POLICY "Only owners can create projects" ON projects
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Only owners can update their projects" ON projects
    FOR UPDATE USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Only owners can delete their projects" ON projects
    FOR DELETE USING (auth.uid() = owner_id);

-- KANBAN_BOARDS: Accès pour propriétaires et équipes
CREATE POLICY "Project team can access kanban boards" ON kanban_boards
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
                    AND pb.status = 'accepted'
                )
            )
        )
    );

-- KANBAN_COLUMNS: Accès pour propriétaires et équipes
CREATE POLICY "Project team can access kanban columns" ON kanban_columns
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
                    AND pb.status = 'accepted'
                )
            )
        )
    );

-- KANBAN_CARDS: Accès pour propriétaires et équipes
CREATE POLICY "Project team can access kanban cards" ON kanban_cards
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
                    AND pb.status = 'accepted'
                )
            )
        )
    );

-- MESSAGE_THREADS: Accès pour propriétaires et équipes
CREATE POLICY "Project team can access message threads" ON message_threads
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
                    AND pb.status = 'accepted'
                )
            )
        )
    );

-- MESSAGES: Accès pour propriétaires et équipes
CREATE POLICY "Project team can access messages" ON messages
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
                    AND pb.status = 'accepted'
                )
            )
        )
    );

-- MESSAGE_PARTICIPANTS: Accès pour propriétaires et équipes
CREATE POLICY "Project team can access message participants" ON message_participants
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
                    AND pb.status = 'accepted'
                )
            )
        )
    );

-- MESSAGE_ATTACHMENTS: Accès pour propriétaires et équipes
CREATE POLICY "Project team can access message attachments" ON message_attachments
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
                    AND pb.status = 'accepted'
                )
            )
        )
    );

-- PROJECT_FILES: Accès pour propriétaires et équipes
CREATE POLICY "Project team can access project files" ON project_files
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
                    AND pb.status = 'accepted'
                )
            )
        )
    );

-- HR_RESOURCE_ASSIGNMENTS: Propriétaires et candidats concernés
CREATE POLICY "View resource assignments for involved users" ON hr_resource_assignments
    FOR SELECT USING (
        -- Propriétaire du projet
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = hr_resource_assignments.project_id
            AND p.owner_id = auth.uid()
        )
        OR
        -- Candidat concerné par l'assignation
        EXISTS (
            SELECT 1 FROM hr_profiles hp
            WHERE hp.profile_id = hr_resource_assignments.profile_id
            AND hp.user_id = auth.uid()
        )
    );

-- PROJECT_BOOKINGS: Propriétaires et candidats concernés
CREATE POLICY "View bookings for involved users" ON project_bookings
    FOR SELECT USING (
        -- Propriétaire du projet
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_bookings.project_id
            AND p.owner_id = auth.uid()
        )
        OR
        -- Le candidat concerné
        project_bookings.candidate_id = auth.uid()
    );

-- ============================================================================
-- ÉTAPE 4: VÉRIFICATION
-- ============================================================================

-- Afficher un résumé des politiques créées
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename IN (
        'projects', 
        'kanban_boards',
        'kanban_columns', 
        'kanban_cards',
        'message_threads', 
        'messages',
        'message_participants',
        'message_attachments',
        'project_files',
        'hr_resource_assignments',
        'project_bookings'
    )
ORDER BY tablename, policyname;

-- ============================================================================
-- MESSAGE DE CONFIRMATION
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ SÉCURITÉ MISE À JOUR AVEC SUCCÈS !';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 Isolation des clients : Chaque client ne voit que SES projets';
    RAISE NOTICE '👥 Accès équipe : Les candidats acceptés peuvent accéder aux projets';
    RAISE NOTICE '📁 Partage sécurisé : Kanban, Messages et Drive sont accessibles à l''équipe';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ IMPORTANT: Déconnectez-vous et reconnectez-vous pour appliquer les changements!';
    RAISE NOTICE '';
END $$;