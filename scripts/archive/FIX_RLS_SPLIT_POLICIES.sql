-- ============================================================================
-- SYSTÈME RLS AVEC POLITIQUES SÉPARÉES (SANS RÉCURSION)
-- ============================================================================
-- Sépare complètement les politiques pour éviter toute récursion
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

-- ÉTAPE 3: CRÉER UNE FONCTION POUR VÉRIFIER L'ACCÈS AU PROJET (SANS RÉCURSION)
-- ============================================================================
CREATE OR REPLACE FUNCTION can_access_project(project_uuid uuid)
RETURNS boolean AS $$
BEGIN
    -- Propriétaire direct
    IF EXISTS (SELECT 1 FROM projects WHERE id = project_uuid AND owner_id = auth.uid()) THEN
        RETURN true;
    END IF;
    
    -- Candidat avec booking
    IF EXISTS (SELECT 1 FROM project_bookings WHERE project_id = project_uuid AND candidate_id = auth.uid()) THEN
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ÉTAPE 4: RÉACTIVER RLS
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
-- POLITIQUE POUR PROJECTS (SIMPLE, SANS JOINTURE)
-- ============================================================================

-- Politique séparée pour SELECT
CREATE POLICY "Projects owner select" ON projects
    FOR SELECT USING (owner_id = auth.uid());

-- Politique séparée pour les candidats avec booking (utilise la fonction)
CREATE POLICY "Projects booking select" ON projects
    FOR SELECT USING (can_access_project(id));

-- Politique pour INSERT/UPDATE/DELETE (propriétaire uniquement)
CREATE POLICY "Projects owner modify" ON projects
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Projects owner update" ON projects
    FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Projects owner delete" ON projects
    FOR DELETE USING (owner_id = auth.uid());

-- ============================================================================
-- POLITIQUE POUR PROJECT_BOOKINGS (INDÉPENDANTE)
-- ============================================================================

CREATE POLICY "Bookings candidate access" ON project_bookings
    FOR ALL USING (candidate_id = auth.uid());

CREATE POLICY "Bookings owner access" ON project_bookings
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM projects WHERE id = project_bookings.project_id AND owner_id = auth.uid())
    );

-- ============================================================================
-- KANBAN: UTILISE LA FONCTION
-- ============================================================================

CREATE POLICY "Kanban boards access" ON kanban_boards
    FOR ALL USING (can_access_project(project_id));

CREATE POLICY "Kanban columns access" ON kanban_columns
    FOR ALL USING (
        EXISTS (SELECT 1 FROM kanban_boards WHERE id = kanban_columns.board_id AND can_access_project(project_id))
    );

CREATE POLICY "Kanban cards access" ON kanban_cards
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM kanban_columns kc
            JOIN kanban_boards kb ON kb.id = kc.board_id
            WHERE kc.id = kanban_cards.column_id
            AND can_access_project(kb.project_id)
        )
    );

-- ============================================================================
-- MESSAGES: UTILISE LA FONCTION
-- ============================================================================

CREATE POLICY "Message threads access" ON message_threads
    FOR ALL USING (can_access_project(project_id));

CREATE POLICY "Messages access" ON messages
    FOR ALL USING (
        EXISTS (SELECT 1 FROM message_threads WHERE id = messages.thread_id AND can_access_project(project_id))
    );

CREATE POLICY "Message participants access" ON message_participants
    FOR ALL USING (
        EXISTS (SELECT 1 FROM message_threads WHERE id = message_participants.thread_id AND can_access_project(project_id))
    );

CREATE POLICY "Message attachments access" ON message_attachments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM messages m
            JOIN message_threads mt ON mt.id = m.thread_id
            WHERE m.id = message_attachments.message_id
            AND can_access_project(mt.project_id)
        )
    );

-- ============================================================================
-- PROJECT FILES: UTILISE LA FONCTION
-- ============================================================================

CREATE POLICY "Project files access" ON project_files
    FOR ALL USING (can_access_project(project_id));

-- ============================================================================
-- HR RESOURCE ASSIGNMENTS: OUVERT
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
    RAISE NOTICE '✅ SYSTÈME RLS AVEC FONCTION CONFIGURÉ !';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 SOLUTION:';
    RAISE NOTICE '   - Fonction can_access_project() centralise la logique';
    RAISE NOTICE '   - Pas de récursion entre projects et project_bookings';
    RAISE NOTICE '   - Politiques séparées pour éviter les conflits';
    RAISE NOTICE '';
    RAISE NOTICE '📋 ACCÈS:';
    RAISE NOTICE '   - Propriétaires: accès direct via owner_id';
    RAISE NOTICE '   - Candidats: accès via la fonction si booking existe';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ TEST:';
    RAISE NOTICE '   - Déconnectez-vous et reconnectez-vous';
    RAISE NOTICE '   - Les projets devraient s''afficher correctement';
    RAISE NOTICE '';
END $$;