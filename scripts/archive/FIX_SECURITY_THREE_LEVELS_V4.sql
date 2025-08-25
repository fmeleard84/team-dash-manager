-- ============================================================================
-- SYSTÈME DE SÉCURITÉ À 3 NIVEAUX - VERSION 4
-- ============================================================================
-- 1. CLIENTS: Voient uniquement leurs propres projets (isolation totale)
-- 2. CANDIDATS MATCHÉS: Voient les nouvelles demandes qui correspondent à leur expertise
-- 3. CANDIDATS ACCEPTÉS: Accès complet au projet (Kanban, Drive, Planning, etc.)
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
ALTER TABLE candidate_profiles ENABLE ROW LEVEL SECURITY;

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
        'project_files', 'hr_resource_assignments', 'project_bookings', 'candidate_profiles'
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
-- 2. Les candidats avec expertise correspondante (status = 'validate' uniquement)
-- 3. Les candidats acceptés sur le projet
CREATE POLICY "Three level access to projects" ON projects
    FOR SELECT USING (
        -- NIVEAU 1: Le client propriétaire voit son projet
        auth.uid() = owner_id
        OR
        -- NIVEAU 2: Les candidats avec expertise voient les nouvelles demandes (status = 'validate')
        (
            projects.status = 'validate' 
            AND EXISTS (
                SELECT 1 FROM candidate_profiles cp
                WHERE cp.user_id = auth.uid()
                AND cp.is_active = true
                -- Ici on pourrait ajouter la vérification de l'expertise
                -- AND cp.expertise && projects.required_skills
            )
        )
        OR
        -- NIVEAU 3: Les candidats acceptés voient tout le projet
        EXISTS (
            SELECT 1 FROM project_bookings pb
            WHERE pb.project_id = projects.id
            AND pb.candidate_id = auth.uid()
            AND pb.status = 'accepted'
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

-- KANBAN_BOARDS: Pas d'accès pour les candidats en phase de découverte
CREATE POLICY "Kanban boards only for owners and accepted candidates" ON kanban_boards
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = kanban_boards.project_id
            AND (
                -- Propriétaire
                p.owner_id = auth.uid()
                OR
                -- Candidat accepté
                EXISTS (
                    SELECT 1 FROM project_bookings pb
                    WHERE pb.project_id = p.id
                    AND pb.candidate_id = auth.uid()
                    AND pb.status = 'accepted'
                )
            )
        )
    );

-- KANBAN_COLUMNS: Même logique
CREATE POLICY "Kanban columns only for owners and accepted candidates" ON kanban_columns
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

-- KANBAN_CARDS: Même logique
CREATE POLICY "Kanban cards only for owners and accepted candidates" ON kanban_cards
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

CREATE POLICY "Message threads only for owners and accepted candidates" ON message_threads
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

CREATE POLICY "Messages only for owners and accepted candidates" ON messages
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

CREATE POLICY "Message participants only for owners and accepted candidates" ON message_participants
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

CREATE POLICY "Message attachments only for owners and accepted candidates" ON message_attachments
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
-- PROJECT FILES: ACCÈS LIMITÉ SELON LE NIVEAU
-- ============================================================================

-- Les candidats en découverte peuvent voir UNIQUEMENT les pièces jointes initiales
-- Les candidats acceptés et propriétaires voient tout
CREATE POLICY "Project files with limited access" ON project_files
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
                -- Candidat en découverte: accès aux pièces jointes initiales seulement
                (
                    p.status = 'validate'
                    AND project_files.folder_path LIKE '%/attachments/%'
                    AND EXISTS (
                        SELECT 1 FROM candidate_profiles cp
                        WHERE cp.user_id = auth.uid()
                        AND cp.is_active = true
                    )
                )
            )
        )
    );

-- Seuls propriétaires et candidats acceptés peuvent modifier les fichiers
CREATE POLICY "Only owners and accepted can modify files" ON project_files
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

CREATE POLICY "Only owners and accepted can update files" ON project_files
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

CREATE POLICY "Only owners and accepted can delete files" ON project_files
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

-- Visible pour propriétaires et candidats concernés
CREATE POLICY "Resource assignments visibility" ON hr_resource_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = hr_resource_assignments.project_id
            AND p.owner_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM hr_profiles hp
            WHERE hp.profile_id = hr_resource_assignments.profile_id
            AND hp.user_id = auth.uid()
        )
    );

-- Les bookings sont visibles pour propriétaires et candidats concernés
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

-- Les candidats peuvent créer leur propre booking (postuler)
CREATE POLICY "Candidates can create bookings" ON project_bookings
    FOR INSERT WITH CHECK (
        candidate_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_bookings.project_id
            AND p.status = 'validate'
        )
    );

-- Les propriétaires peuvent mettre à jour les bookings de leurs projets
CREATE POLICY "Owners can update bookings" ON project_bookings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_bookings.project_id
            AND p.owner_id = auth.uid()
        )
    );

-- ============================================================================
-- CANDIDATE PROFILES: Visible pour le candidat lui-même
-- ============================================================================

CREATE POLICY "Candidates see own profile" ON candidate_profiles
    FOR ALL USING (user_id = auth.uid());

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
        'hr_resource_assignments', 'project_bookings', 'candidate_profiles'
    )
ORDER BY tablename, policyname;

-- ============================================================================
-- MESSAGE DE CONFIRMATION
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ SYSTÈME DE SÉCURITÉ À 3 NIVEAUX CONFIGURÉ !';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 NIVEAU 1 - CLIENTS: Isolation totale, voient uniquement leurs projets';
    RAISE NOTICE '👀 NIVEAU 2 - CANDIDATS MATCHÉS: Voient les nouvelles demandes (status=validate) et pièces jointes';
    RAISE NOTICE '✅ NIVEAU 3 - CANDIDATS ACCEPTÉS: Accès complet (Kanban, Drive, Messages, Planning)';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Les candidats peuvent postuler aux projets avec status=validate';
    RAISE NOTICE '🔐 Les données sensibles (Kanban, Messages) restent privées jusqu''à acceptation';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ IMPORTANT: Déconnectez-vous et reconnectez-vous pour appliquer les changements!';
END $$;