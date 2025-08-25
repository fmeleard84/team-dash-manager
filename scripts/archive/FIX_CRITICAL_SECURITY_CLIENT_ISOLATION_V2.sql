-- ============================================================================
-- CORRECTION CRITIQUE DE SÉCURITÉ : ISOLATION DES DONNÉES CLIENTS - VERSION 2
-- ============================================================================
-- Ce script corrige le problème où les clients peuvent voir les projets des autres
-- EXÉCUTEZ CE SCRIPT DANS LE SQL EDITOR DE SUPABASE
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

-- Supprimer toutes les politiques sur projects
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'projects'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON projects', pol.policyname);
    END LOOP;
END $$;

-- Supprimer toutes les politiques sur kanban_boards
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'kanban_boards'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON kanban_boards', pol.policyname);
    END LOOP;
END $$;

-- Supprimer toutes les politiques sur kanban_columns
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'kanban_columns'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON kanban_columns', pol.policyname);
    END LOOP;
END $$;

-- Supprimer toutes les politiques sur kanban_cards
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'kanban_cards'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON kanban_cards', pol.policyname);
    END LOOP;
END $$;

-- Supprimer toutes les politiques sur message_threads
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'message_threads'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON message_threads', pol.policyname);
    END LOOP;
END $$;

-- Supprimer toutes les politiques sur messages
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'messages'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON messages', pol.policyname);
    END LOOP;
END $$;

-- Supprimer toutes les politiques sur message_participants
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'message_participants'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON message_participants', pol.policyname);
    END LOOP;
END $$;

-- Supprimer toutes les politiques sur message_attachments
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'message_attachments'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON message_attachments', pol.policyname);
    END LOOP;
END $$;

-- Supprimer toutes les politiques sur project_files
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'project_files'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON project_files', pol.policyname);
    END LOOP;
END $$;

-- Supprimer toutes les politiques sur hr_resource_assignments
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'hr_resource_assignments'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON hr_resource_assignments', pol.policyname);
    END LOOP;
END $$;

-- Supprimer toutes les politiques sur project_bookings
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'project_bookings'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON project_bookings', pol.policyname);
    END LOOP;
END $$;

-- ============================================================================
-- ÉTAPE 3: CRÉER LES NOUVELLES POLITIQUES SÉCURISÉES
-- ============================================================================

-- PROJECTS: Seuls les propriétaires voient leurs projets
CREATE POLICY "Client sees only own projects - SELECT" ON projects
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Client creates own projects - INSERT" ON projects
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Client updates own projects - UPDATE" ON projects
    FOR UPDATE USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Client deletes own projects - DELETE" ON projects
    FOR DELETE USING (auth.uid() = owner_id);

-- KANBAN_BOARDS: Accès uniquement aux boards des projets possédés
CREATE POLICY "Client sees only own kanban boards" ON kanban_boards
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = kanban_boards.project_id 
            AND projects.owner_id = auth.uid()
        )
    );

-- KANBAN_COLUMNS: Accès via kanban_boards (pas de project_id direct)
CREATE POLICY "Client sees only own kanban columns" ON kanban_columns
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM kanban_boards kb
            JOIN projects p ON p.id = kb.project_id
            WHERE kb.id = kanban_columns.board_id 
            AND p.owner_id = auth.uid()
        )
    );

-- KANBAN_CARDS: Accès via kanban_columns et kanban_boards
CREATE POLICY "Client sees only own kanban cards" ON kanban_cards
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM kanban_columns kc
            JOIN kanban_boards kb ON kb.id = kc.board_id
            JOIN projects p ON p.id = kb.project_id
            WHERE kc.id = kanban_cards.column_id 
            AND p.owner_id = auth.uid()
        )
    );

-- MESSAGE_THREADS: Accès uniquement aux threads des projets possédés
CREATE POLICY "Client sees only own message threads" ON message_threads
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = message_threads.project_id 
            AND projects.owner_id = auth.uid()
        )
    );

-- MESSAGES: Accès uniquement aux messages des projets possédés
CREATE POLICY "Client sees only own messages" ON messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM message_threads mt
            JOIN projects p ON p.id = mt.project_id
            WHERE mt.id = messages.thread_id 
            AND p.owner_id = auth.uid()
        )
    );

-- MESSAGE_PARTICIPANTS: Accès uniquement aux participants des projets possédés
CREATE POLICY "Client sees only own message participants" ON message_participants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM message_threads mt
            JOIN projects p ON p.id = mt.project_id
            WHERE mt.id = message_participants.thread_id 
            AND p.owner_id = auth.uid()
        )
    );

-- MESSAGE_ATTACHMENTS: Accès uniquement aux pièces jointes des projets possédés
CREATE POLICY "Client sees only own message attachments" ON message_attachments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM messages m
            JOIN message_threads mt ON mt.id = m.thread_id
            JOIN projects p ON p.id = mt.project_id
            WHERE m.id = message_attachments.message_id 
            AND p.owner_id = auth.uid()
        )
    );

-- PROJECT_FILES: Accès uniquement aux fichiers des projets possédés
CREATE POLICY "Client sees only own project files" ON project_files
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = project_files.project_id 
            AND projects.owner_id = auth.uid()
        )
    );

-- HR_RESOURCE_ASSIGNMENTS: Accès uniquement aux assignations des projets possédés (lecture seule)
CREATE POLICY "Client sees only own resource assignments" ON hr_resource_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = hr_resource_assignments.project_id 
            AND projects.owner_id = auth.uid()
        )
    );

-- PROJECT_BOOKINGS: Accès uniquement aux bookings des projets possédés (lecture seule)
CREATE POLICY "Client sees only own project bookings" ON project_bookings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = project_bookings.project_id 
            AND projects.owner_id = auth.uid()
        )
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
    RAISE NOTICE '✅ SÉCURITÉ CORRIGÉE: Les clients ne peuvent maintenant voir QUE leurs propres projets!';
    RAISE NOTICE '🔒 Chaque client est maintenant isolé et ne peut accéder qu''à ses propres données.';
    RAISE NOTICE '📝 Testez avec différents comptes clients pour vérifier l''isolation.';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ IMPORTANT: Déconnectez-vous et reconnectez-vous pour que les changements prennent effet!';
END $$;