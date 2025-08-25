-- ============================================================================
-- SYSTÈME DE SÉCURITÉ FINAL - VERSION 7
-- ============================================================================
-- 1. CLIENTS: Voient uniquement leurs propres projets (isolation totale)
-- 2. CANDIDATS: Voient les projets où ils sont bookés
-- 3. CANDIDATS ACCEPTÉS: Accès complet au projet
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
-- 1. Le propriétaire (client)
-- 2. Les candidats qui ont un booking (peu importe le statut)
CREATE POLICY "Project visibility" ON projects
    FOR SELECT USING (
        -- Le client propriétaire voit son projet
        auth.uid() = owner_id
        OR
        -- Les candidats avec un booking voient le projet
        EXISTS (
            SELECT 1 FROM project_bookings pb
            WHERE pb.project_id = projects.id
            AND pb.candidate_id = auth.uid()
        )
    );

-- Seuls les clients peuvent créer/modifier/supprimer leurs projets
CREATE POLICY "Only owners can create projects" ON projects
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Only owners can update their projects" ON projects
    FOR UPDATE USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Only owners can delete their projects" ON projects
    FOR DELETE USING (auth.uid() = owner_id);

-- ============================================================================
-- KANBAN: ACCÈS UNIQUEMENT POUR PROPRIÉTAIRES ET CANDIDATS ACCEPTÉS
-- ============================================================================

-- KANBAN_BOARDS: Seulement pour owner et candidats acceptés
CREATE POLICY "Kanban boards access" ON kanban_boards
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = kanban_boards.project_id
            AND (
                -- Propriétaire
                p.owner_id = auth.uid()
                OR
                -- Candidat accepté seulement
                EXISTS (
                    SELECT 1 FROM project_bookings pb
                    WHERE pb.project_id = p.id
                    AND pb.candidate_id = auth.uid()
                    AND pb.status = 'accepted'
                )
            )
        )
    );

-- KANBAN_COLUMNS
CREATE POLICY "Kanban columns access" ON kanban_columns
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM kanban_boards kb
            JOIN projects p ON p.id = kb.project_id
            WHERE kb.id = kanban_columns.board_id
            AND (
                p.owner_id = auth.uid()
                OR
                EXISTS (
                    SELECT 1 FROM project_bookings pb
                    WHERE pb.project_id = p.id
                    AND pb.candidate_id = auth.uid()
                    AND pb.status = 'accepted'
                )
            )
        )
    );

-- KANBAN_CARDS
CREATE POLICY "Kanban cards access" ON kanban_cards
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM kanban_columns kc
            JOIN kanban_boards kb ON kb.id = kc.board_id
            JOIN projects p ON p.id = kb.project_id
            WHERE kc.id = kanban_cards.column_id
            AND (
                p.owner_id = auth.uid()
                OR
                EXISTS (
                    SELECT 1 FROM project_bookings pb
                    WHERE pb.project_id = p.id
                    AND pb.candidate_id = auth.uid()
                    AND pb.status = 'accepted'
                )
            )
        )
    );

-- ============================================================================
-- MESSAGES: UNIQUEMENT POUR PROPRIÉTAIRES ET CANDIDATS ACCEPTÉS
-- ============================================================================

CREATE POLICY "Message threads access" ON message_threads
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = message_threads.project_id
            AND (
                p.owner_id = auth.uid()
                OR
                EXISTS (
                    SELECT 1 FROM project_bookings pb
                    WHERE pb.project_id = p.id
                    AND pb.candidate_id = auth.uid()
                    AND pb.status = 'accepted'
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
                OR
                EXISTS (
                    SELECT 1 FROM project_bookings pb
                    WHERE pb.project_id = p.id
                    AND pb.candidate_id = auth.uid()
                    AND pb.status = 'accepted'
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
                OR
                EXISTS (
                    SELECT 1 FROM project_bookings pb
                    WHERE pb.project_id = p.id
                    AND pb.candidate_id = auth.uid()
                    AND pb.status = 'accepted'
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
                OR
                EXISTS (
                    SELECT 1 FROM project_bookings pb
                    WHERE pb.project_id = p.id
                    AND pb.candidate_id = auth.uid()
                    AND pb.status = 'accepted'
                )
            )
        )
    );

-- ============================================================================
-- PROJECT FILES: ACCÈS SELON LE STATUT
-- ============================================================================

-- Lecture: propriétaire, candidats acceptés, ou candidats avec booking pour pièces jointes
CREATE POLICY "Project files read access" ON project_files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_files.project_id
            AND (
                -- Propriétaire: accès total
                p.owner_id = auth.uid()
                OR
                -- Candidat accepté: accès total
                EXISTS (
                    SELECT 1 FROM project_bookings pb
                    WHERE pb.project_id = p.id
                    AND pb.candidate_id = auth.uid()
                    AND pb.status = 'accepted'
                )
                OR
                -- Candidat avec booking: accès limité aux pièces jointes
                (
                    EXISTS (
                        SELECT 1 FROM project_bookings pb
                        WHERE pb.project_id = p.id
                        AND pb.candidate_id = auth.uid()
                        AND pb.status IN ('pending', 'interested')
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

-- Écriture: seulement propriétaires et candidats acceptés
CREATE POLICY "Project files write access" ON project_files
    FOR INSERT USING (
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
                    AND pb.status = 'accepted'
                )
            )
        )
    );

CREATE POLICY "Project files delete access" ON project_files
    FOR DELETE USING (
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

-- ============================================================================
-- HR RESOURCE ASSIGNMENTS & PROJECT BOOKINGS
-- ============================================================================

-- Resource assignments: visibles pour propriétaires seulement
CREATE POLICY "Resource assignments for owners" ON hr_resource_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = hr_resource_assignments.project_id
            AND p.owner_id = auth.uid()
        )
    );

-- Bookings: visibles pour propriétaires et candidats concernés
CREATE POLICY "Bookings visibility" ON project_bookings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_bookings.project_id
            AND p.owner_id = auth.uid()
        )
        OR
        project_bookings.candidate_id = auth.uid()
    );

-- Les candidats peuvent créer leur propre booking
CREATE POLICY "Candidates can create bookings" ON project_bookings
    FOR INSERT WITH CHECK (
        candidate_id = auth.uid()
    );

-- Les propriétaires peuvent mettre à jour les bookings
CREATE POLICY "Owners can update bookings" ON project_bookings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_bookings.project_id
            AND p.owner_id = auth.uid()
        )
    );

-- Les candidats peuvent mettre à jour leur propre statut (accepter/refuser)
CREATE POLICY "Candidates can update own booking status" ON project_bookings
    FOR UPDATE USING (
        candidate_id = auth.uid()
    )
    WITH CHECK (
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
    RAISE NOTICE '✅ SYSTÈME DE SÉCURITÉ CONFIGURÉ AVEC SUCCÈS !';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 ISOLATION DES CLIENTS:';
    RAISE NOTICE '   - Chaque client voit UNIQUEMENT ses propres projets';
    RAISE NOTICE '   - Aucun accès aux projets des autres clients';
    RAISE NOTICE '';
    RAISE NOTICE '👥 ACCÈS ÉQUIPE:';
    RAISE NOTICE '   - Candidats avec booking (pending/interested): voient projet + pièces jointes';
    RAISE NOTICE '   - Candidats acceptés: accès complet (Kanban, Drive, Messages)';
    RAISE NOTICE '';
    RAISE NOTICE '📁 FICHIERS:';
    RAISE NOTICE '   - Pièces jointes visibles pour tous les candidats bookés';
    RAISE NOTICE '   - Drive complet réservé aux candidats acceptés';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ ACTION REQUISE:';
    RAISE NOTICE '   1. Déconnectez-vous';
    RAISE NOTICE '   2. Reconnectez-vous';
    RAISE NOTICE '   3. Testez avec différents comptes';
    RAISE NOTICE '';
END $$;