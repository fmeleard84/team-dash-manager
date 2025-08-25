-- ============================================================================
-- SYSTÈME DE SÉCURITÉ FLEXIBLE - VERSION 9
-- ============================================================================
-- 1. CLIENTS: Voient uniquement leurs propres projets
-- 2. RESSOURCES/CANDIDATS: Voient les projets où ils ont un booking
-- 3. TEAM MEMBERS: Voient les projets où ils sont membres d'équipe
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
-- 2. Les membres de l'équipe (team_members)
-- 3. Les candidats/ressources avec un booking
-- 4. Les participants aux messages
CREATE POLICY "Project visibility flexible" ON projects
    FOR SELECT USING (
        -- Le propriétaire voit son projet
        auth.uid() = owner_id
        OR
        -- Les membres de l'équipe voient le projet
        auth.uid() = ANY(team_members)
        OR
        -- Les candidats/ressources avec booking voient le projet
        EXISTS (
            SELECT 1 FROM project_bookings pb
            WHERE pb.project_id = projects.id
            AND pb.candidate_id = auth.uid()
        )
        OR
        -- Les participants aux messages voient le projet
        EXISTS (
            SELECT 1 FROM message_participants mp
            JOIN message_threads mt ON mt.id = mp.thread_id
            WHERE mt.project_id = projects.id
            AND mp.user_id = auth.uid()
        )
        OR
        -- Les ressources assignées voient le projet
        EXISTS (
            SELECT 1 FROM hr_resource_assignments hra
            WHERE hra.project_id = projects.id
            AND hra.candidate_id = auth.uid()
        )
    );

-- Seuls les propriétaires peuvent créer des projets
CREATE POLICY "Owners create projects" ON projects
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Propriétaires et membres d'équipe peuvent modifier
CREATE POLICY "Owners and team update projects" ON projects
    FOR UPDATE USING (
        auth.uid() = owner_id 
        OR auth.uid() = ANY(team_members)
    )
    WITH CHECK (
        auth.uid() = owner_id 
        OR auth.uid() = ANY(team_members)
    );

-- Seuls les propriétaires peuvent supprimer
CREATE POLICY "Only owners delete projects" ON projects
    FOR DELETE USING (auth.uid() = owner_id);

-- ============================================================================
-- KANBAN: ACCÈS POUR PROPRIÉTAIRES, ÉQUIPE ET CANDIDATS ACCEPTÉS
-- ============================================================================

CREATE POLICY "Kanban boards access flexible" ON kanban_boards
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = kanban_boards.project_id
            AND (
                -- Propriétaire
                p.owner_id = auth.uid()
                OR
                -- Membre de l'équipe
                auth.uid() = ANY(p.team_members)
                OR
                -- Candidat avec booking accepté
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

CREATE POLICY "Kanban columns access flexible" ON kanban_columns
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM kanban_boards kb
            JOIN projects p ON p.id = kb.project_id
            WHERE kb.id = kanban_columns.board_id
            AND (
                p.owner_id = auth.uid()
                OR auth.uid() = ANY(p.team_members)
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

CREATE POLICY "Kanban cards access flexible" ON kanban_cards
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM kanban_columns kc
            JOIN kanban_boards kb ON kb.id = kc.board_id
            JOIN projects p ON p.id = kb.project_id
            WHERE kc.id = kanban_cards.column_id
            AND (
                p.owner_id = auth.uid()
                OR auth.uid() = ANY(p.team_members)
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
-- MESSAGES: ACCÈS POUR TOUS LES PARTICIPANTS
-- ============================================================================

CREATE POLICY "Message threads access flexible" ON message_threads
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = message_threads.project_id
            AND (
                p.owner_id = auth.uid()
                OR auth.uid() = ANY(p.team_members)
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

CREATE POLICY "Messages access flexible" ON messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM message_threads mt
            JOIN projects p ON p.id = mt.project_id
            WHERE mt.id = messages.thread_id
            AND (
                p.owner_id = auth.uid()
                OR auth.uid() = ANY(p.team_members)
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

CREATE POLICY "Message participants access flexible" ON message_participants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM message_threads mt
            JOIN projects p ON p.id = mt.project_id
            WHERE mt.id = message_participants.thread_id
            AND (
                p.owner_id = auth.uid()
                OR auth.uid() = ANY(p.team_members)
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

CREATE POLICY "Message attachments access flexible" ON message_attachments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM messages m
            JOIN message_threads mt ON mt.id = m.thread_id
            JOIN projects p ON p.id = mt.project_id
            WHERE m.id = message_attachments.message_id
            AND (
                p.owner_id = auth.uid()
                OR auth.uid() = ANY(p.team_members)
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

CREATE POLICY "Project files read access flexible" ON project_files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_files.project_id
            AND (
                -- Propriétaire ou équipe: accès total
                p.owner_id = auth.uid()
                OR auth.uid() = ANY(p.team_members)
                OR
                -- Candidat accepté: accès total
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
                -- Candidat avec booking: accès aux pièces jointes
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

CREATE POLICY "Project files write access flexible" ON project_files
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_files.project_id
            AND (
                p.owner_id = auth.uid()
                OR auth.uid() = ANY(p.team_members)
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

CREATE POLICY "Project files update access flexible" ON project_files
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_files.project_id
            AND (
                p.owner_id = auth.uid()
                OR auth.uid() = ANY(p.team_members)
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

CREATE POLICY "Project files delete access flexible" ON project_files
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_files.project_id
            AND (
                p.owner_id = auth.uid()
                OR auth.uid() = ANY(p.team_members)
            )
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
            AND (p.owner_id = auth.uid() OR auth.uid() = ANY(p.team_members))
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
            AND (p.owner_id = auth.uid() OR auth.uid() = ANY(p.team_members))
        )
    );

CREATE POLICY "Resource assignments update" ON hr_resource_assignments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = hr_resource_assignments.project_id
            AND (p.owner_id = auth.uid() OR auth.uid() = ANY(p.team_members))
        )
    );

CREATE POLICY "Bookings visibility flexible" ON project_bookings
    FOR SELECT USING (
        -- Propriétaires et équipe voient tous les bookings
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_bookings.project_id
            AND (p.owner_id = auth.uid() OR auth.uid() = ANY(p.team_members))
        )
        OR
        -- Les candidats voient leurs propres bookings
        project_bookings.candidate_id = auth.uid()
    );

CREATE POLICY "Candidates create bookings" ON project_bookings
    FOR INSERT WITH CHECK (
        candidate_id = auth.uid()
    );

CREATE POLICY "Owners update bookings" ON project_bookings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_bookings.project_id
            AND (p.owner_id = auth.uid() OR auth.uid() = ANY(p.team_members))
        )
        OR
        -- Les candidats peuvent mettre à jour leur propre statut
        candidate_id = auth.uid()
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_bookings.project_id
            AND (p.owner_id = auth.uid() OR auth.uid() = ANY(p.team_members))
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
    RAISE NOTICE '✅ SYSTÈME DE SÉCURITÉ FLEXIBLE CONFIGURÉ !';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 ISOLATION DES CLIENTS:';
    RAISE NOTICE '   - Chaque client voit ses projets (owner_id)';
    RAISE NOTICE '   - Les membres d''équipe voient les projets (team_members)';
    RAISE NOTICE '';
    RAISE NOTICE '👥 ACCÈS RESSOURCES:';
    RAISE NOTICE '   - Ressources avec booking: voient le projet';
    RAISE NOTICE '   - Ressources assignées: accès complet';
    RAISE NOTICE '   - Ressources acceptées: accès Kanban, Drive, Messages';
    RAISE NOTICE '';
    RAISE NOTICE '📁 FICHIERS:';
    RAISE NOTICE '   - Pièces jointes visibles pour tous les bookings';
    RAISE NOTICE '   - Drive complet pour acceptés et assignés';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ ACTION REQUISE:';
    RAISE NOTICE '   1. Déconnectez-vous';
    RAISE NOTICE '   2. Reconnectez-vous';
    RAISE NOTICE '   3. Testez avec différents comptes';
    RAISE NOTICE '';
END $$;