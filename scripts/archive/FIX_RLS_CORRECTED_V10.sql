-- ============================================================================
-- SYSTÈME DE SÉCURITÉ CORRIGÉ - VERSION 10
-- ============================================================================
-- 1. CLIENTS: Voient uniquement leurs propres projets
-- 2. RESSOURCES/CANDIDATS: Voient les projets où ils ont un booking ou assignation
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
-- ÉTAPE 3: POLITIQUES POUR LA TABLE PROJECTS
-- ============================================================================

-- Les projets sont visibles pour:
-- 1. Le propriétaire (owner_id)
-- 2. Les candidats/ressources avec un booking
-- 3. Les candidats/ressources avec une assignation
-- 4. Les participants aux messages du projet
CREATE POLICY "Project visibility complete" ON projects
    FOR SELECT USING (
        -- Le propriétaire voit son projet
        auth.uid() = owner_id
        OR
        -- Les candidats/ressources avec booking voient le projet
        EXISTS (
            SELECT 1 FROM project_bookings pb
            WHERE pb.project_id = projects.id
            AND pb.candidate_id = auth.uid()
        )
        OR
        -- Les ressources assignées voient le projet
        EXISTS (
            SELECT 1 FROM hr_resource_assignments hra
            WHERE hra.project_id = projects.id
            AND hra.candidate_id = auth.uid()
        )
        OR
        -- Les participants aux messages voient le projet
        EXISTS (
            SELECT 1 FROM message_participants mp
            JOIN message_threads mt ON mt.id = mp.thread_id
            WHERE mt.project_id = projects.id
            AND mp.user_id = auth.uid()
        )
    );

-- Seuls les propriétaires peuvent créer des projets
CREATE POLICY "Owners create projects" ON projects
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Seuls les propriétaires peuvent modifier leurs projets
CREATE POLICY "Owners update projects" ON projects
    FOR UPDATE USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

-- Seuls les propriétaires peuvent supprimer leurs projets
CREATE POLICY "Owners delete projects" ON projects
    FOR DELETE USING (auth.uid() = owner_id);

-- ============================================================================
-- KANBAN: ACCÈS POUR PROPRIÉTAIRES ET RESSOURCES AUTORISÉES
-- ============================================================================

CREATE POLICY "Kanban boards access" ON kanban_boards
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = kanban_boards.project_id
            AND (
                -- Propriétaire
                p.owner_id = auth.uid()
                OR
                -- Candidat avec booking accepté/confirmé
                EXISTS (
                    SELECT 1 FROM project_bookings pb
                    WHERE pb.project_id = p.id
                    AND pb.candidate_id = auth.uid()
                    AND pb.status IN ('accepted', 'confirmed')
                )
                OR
                -- Ressource assignée
                EXISTS (
                    SELECT 1 FROM hr_resource_assignments hra
                    WHERE hra.project_id = p.id
                    AND hra.candidate_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Kanban columns access" ON kanban_columns
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
                    AND pb.status IN ('accepted', 'confirmed')
                )
                OR EXISTS (
                    SELECT 1 FROM hr_resource_assignments hra
                    WHERE hra.project_id = p.id
                    AND hra.candidate_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Kanban cards access" ON kanban_cards
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
                    AND pb.status IN ('accepted', 'confirmed')
                )
                OR EXISTS (
                    SELECT 1 FROM hr_resource_assignments hra
                    WHERE hra.project_id = p.id
                    AND hra.candidate_id = auth.uid()
                )
            )
        )
    );

-- ============================================================================
-- MESSAGES: ACCÈS POUR PARTICIPANTS ET RESSOURCES AUTORISÉES
-- ============================================================================

CREATE POLICY "Message threads access" ON message_threads
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = message_threads.project_id
            AND (
                p.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM message_participants mp
                    WHERE mp.thread_id = message_threads.id
                    AND mp.user_id = auth.uid()
                )
                OR EXISTS (
                    SELECT 1 FROM project_bookings pb
                    WHERE pb.project_id = p.id
                    AND pb.candidate_id = auth.uid()
                    AND pb.status IN ('accepted', 'confirmed')
                )
                OR EXISTS (
                    SELECT 1 FROM hr_resource_assignments hra
                    WHERE hra.project_id = p.id
                    AND hra.candidate_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Messages access" ON messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM message_threads mt
            JOIN projects p ON p.id = mt.project_id
            WHERE mt.id = messages.thread_id
            AND (
                p.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM message_participants mp
                    WHERE mp.thread_id = mt.id
                    AND mp.user_id = auth.uid()
                )
                OR EXISTS (
                    SELECT 1 FROM project_bookings pb
                    WHERE pb.project_id = p.id
                    AND pb.candidate_id = auth.uid()
                    AND pb.status IN ('accepted', 'confirmed')
                )
                OR EXISTS (
                    SELECT 1 FROM hr_resource_assignments hra
                    WHERE hra.project_id = p.id
                    AND hra.candidate_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Message participants access" ON message_participants
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
                    AND pb.status IN ('accepted', 'confirmed')
                )
                OR EXISTS (
                    SELECT 1 FROM hr_resource_assignments hra
                    WHERE hra.project_id = p.id
                    AND hra.candidate_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Message attachments access" ON message_attachments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM messages m
            JOIN message_threads mt ON mt.id = m.thread_id
            JOIN projects p ON p.id = mt.project_id
            WHERE m.id = message_attachments.message_id
            AND (
                p.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM message_participants mp
                    WHERE mp.thread_id = mt.id
                    AND mp.user_id = auth.uid()
                )
                OR EXISTS (
                    SELECT 1 FROM project_bookings pb
                    WHERE pb.project_id = p.id
                    AND pb.candidate_id = auth.uid()
                )
                OR EXISTS (
                    SELECT 1 FROM hr_resource_assignments hra
                    WHERE hra.project_id = p.id
                    AND hra.candidate_id = auth.uid()
                )
            )
        )
    );

-- ============================================================================
-- PROJECT FILES: ACCÈS SELON LE CONTEXTE
-- ============================================================================

CREATE POLICY "Project files read access" ON project_files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_files.project_id
            AND (
                -- Propriétaire: accès total
                p.owner_id = auth.uid()
                OR
                -- Candidat accepté/confirmé: accès total
                EXISTS (
                    SELECT 1 FROM project_bookings pb
                    WHERE pb.project_id = p.id
                    AND pb.candidate_id = auth.uid()
                    AND pb.status IN ('accepted', 'confirmed')
                )
                OR
                -- Ressource assignée: accès total
                EXISTS (
                    SELECT 1 FROM hr_resource_assignments hra
                    WHERE hra.project_id = p.id
                    AND hra.candidate_id = auth.uid()
                )
                OR
                -- Candidat avec booking (tout statut): accès aux pièces jointes seulement
                (
                    EXISTS (
                        SELECT 1 FROM project_bookings pb
                        WHERE pb.project_id = p.id
                        AND pb.candidate_id = auth.uid()
                    )
                    AND (
                        project_files.file_path LIKE '%attachments%'
                        OR project_files.file_path LIKE '%pieces-jointes%'
                        OR project_files.file_path LIKE '%Attachments%'
                    )
                )
            )
        )
    );

CREATE POLICY "Project files write access" ON project_files
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_files.project_id
            AND (
                p.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM project_bookings pb
                    WHERE pb.project_id = p.id
                    AND pb.candidate_id = auth.uid()
                    AND pb.status IN ('accepted', 'confirmed')
                )
                OR EXISTS (
                    SELECT 1 FROM hr_resource_assignments hra
                    WHERE hra.project_id = p.id
                    AND hra.candidate_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Project files update access" ON project_files
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_files.project_id
            AND (
                p.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM project_bookings pb
                    WHERE pb.project_id = p.id
                    AND pb.candidate_id = auth.uid()
                    AND pb.status IN ('accepted', 'confirmed')
                )
                OR EXISTS (
                    SELECT 1 FROM hr_resource_assignments hra
                    WHERE hra.project_id = p.id
                    AND hra.candidate_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Project files delete access" ON project_files
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_files.project_id
            AND p.owner_id = auth.uid()
        )
    );

-- ============================================================================
-- HR RESOURCE ASSIGNMENTS & PROJECT BOOKINGS
-- ============================================================================

CREATE POLICY "Resource assignments visibility" ON hr_resource_assignments
    FOR SELECT USING (
        -- Propriétaires voient toutes les assignations de leurs projets
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = hr_resource_assignments.project_id
            AND p.owner_id = auth.uid()
        )
        OR
        -- Les ressources voient leurs propres assignations
        hr_resource_assignments.candidate_id = auth.uid()
    );

CREATE POLICY "Resource assignments management" ON hr_resource_assignments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = hr_resource_assignments.project_id
            AND p.owner_id = auth.uid()
        )
    );

CREATE POLICY "Resource assignments update" ON hr_resource_assignments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = hr_resource_assignments.project_id
            AND p.owner_id = auth.uid()
        )
    );

CREATE POLICY "Bookings visibility" ON project_bookings
    FOR SELECT USING (
        -- Propriétaires voient tous les bookings de leurs projets
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_bookings.project_id
            AND p.owner_id = auth.uid()
        )
        OR
        -- Les candidats voient leurs propres bookings
        project_bookings.candidate_id = auth.uid()
    );

CREATE POLICY "Candidates create bookings" ON project_bookings
    FOR INSERT WITH CHECK (
        candidate_id = auth.uid()
    );

CREATE POLICY "Update bookings" ON project_bookings
    FOR UPDATE USING (
        -- Propriétaires peuvent tout mettre à jour
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_bookings.project_id
            AND p.owner_id = auth.uid()
        )
        OR
        -- Les candidats peuvent mettre à jour leur propre booking
        candidate_id = auth.uid()
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_bookings.project_id
            AND p.owner_id = auth.uid()
        )
        OR
        candidate_id = auth.uid()
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
    RAISE NOTICE '✅ SYSTÈME DE SÉCURITÉ V10 CONFIGURÉ !';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 ACCÈS PROJETS:';
    RAISE NOTICE '   - Propriétaires: voient leurs projets (owner_id)';
    RAISE NOTICE '   - Ressources avec booking: voient les projets';
    RAISE NOTICE '   - Ressources assignées: voient les projets';
    RAISE NOTICE '   - Participants messages: voient les projets';
    RAISE NOTICE '';
    RAISE NOTICE '📋 KANBAN & MESSAGES:';
    RAISE NOTICE '   - Accès pour propriétaires';
    RAISE NOTICE '   - Accès pour ressources acceptées/confirmées';
    RAISE NOTICE '   - Accès pour ressources assignées';
    RAISE NOTICE '';
    RAISE NOTICE '📁 FICHIERS:';
    RAISE NOTICE '   - Tous les bookings: accès aux pièces jointes';
    RAISE NOTICE '   - Acceptés/assignés: accès complet au Drive';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ IMPORTANT:';
    RAISE NOTICE '   - Déconnectez-vous et reconnectez-vous';
    RAISE NOTICE '   - Les données sont maintenant isolées par utilisateur';
    RAISE NOTICE '';
END $$;