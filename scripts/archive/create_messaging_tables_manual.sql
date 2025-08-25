-- ============================================
-- MANUEL SETUP: Créer les tables de messagerie
-- ============================================
-- Copier et coller ce script dans l'éditeur SQL de Supabase

-- Table des threads de messages
CREATE TABLE IF NOT EXISTS message_threads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Table des participants aux threads
CREATE TABLE IF NOT EXISTS message_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID REFERENCES message_threads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT CHECK (role IN ('client', 'candidate')) NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- Table des messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id),
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  parent_message_id UUID REFERENCES messages(id),
  is_edited BOOLEAN DEFAULT false
);

-- Table des pièces jointes
CREATE TABLE IF NOT EXISTS message_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des statuts de lecture
CREATE TABLE IF NOT EXISTS message_read_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_email)
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_message_threads_project_id ON message_threads(project_id);
CREATE INDEX IF NOT EXISTS idx_message_participants_thread_id ON message_participants(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_message_read_status_message_id ON message_read_status(message_id);

-- Activer Row Level Security
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_status ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "message_threads_select_policy" ON message_threads;
DROP POLICY IF EXISTS "message_threads_insert_policy" ON message_threads;
DROP POLICY IF EXISTS "message_threads_update_policy" ON message_threads;

DROP POLICY IF EXISTS "message_participants_select_policy" ON message_participants;
DROP POLICY IF EXISTS "message_participants_insert_policy" ON message_participants;
DROP POLICY IF EXISTS "message_participants_update_policy" ON message_participants;
DROP POLICY IF EXISTS "message_participants_delete_policy" ON message_participants;

DROP POLICY IF EXISTS "messages_select_policy" ON messages;
DROP POLICY IF EXISTS "messages_insert_policy" ON messages;
DROP POLICY IF EXISTS "messages_update_policy" ON messages;

DROP POLICY IF EXISTS "message_attachments_select_policy" ON message_attachments;
DROP POLICY IF EXISTS "message_attachments_insert_policy" ON message_attachments;

DROP POLICY IF EXISTS "message_read_status_select_policy" ON message_read_status;
DROP POLICY IF EXISTS "message_read_status_insert_policy" ON message_read_status;

-- Créer les nouvelles politiques
CREATE POLICY "message_threads_select_policy" ON message_threads FOR SELECT TO authenticated USING (true);
CREATE POLICY "message_threads_insert_policy" ON message_threads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "message_threads_update_policy" ON message_threads FOR UPDATE TO authenticated USING (true);

CREATE POLICY "message_participants_select_policy" ON message_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "message_participants_insert_policy" ON message_participants FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "message_participants_update_policy" ON message_participants FOR UPDATE TO authenticated USING (true);
CREATE POLICY "message_participants_delete_policy" ON message_participants FOR DELETE TO authenticated USING (true);

CREATE POLICY "messages_select_policy" ON messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "messages_insert_policy" ON messages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "messages_update_policy" ON messages FOR UPDATE TO authenticated USING (true);

CREATE POLICY "message_attachments_select_policy" ON message_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "message_attachments_insert_policy" ON message_attachments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "message_read_status_select_policy" ON message_read_status FOR SELECT TO authenticated USING (true);
CREATE POLICY "message_read_status_insert_policy" ON message_read_status FOR INSERT TO authenticated WITH CHECK (true);

-- Vérifier que les tables ont été créées
SELECT 'message_threads' as table_name, count(*) as row_count FROM message_threads
UNION ALL
SELECT 'message_participants', count(*) FROM message_participants
UNION ALL
SELECT 'messages', count(*) FROM messages
UNION ALL
SELECT 'message_attachments', count(*) FROM message_attachments
UNION ALL
SELECT 'message_read_status', count(*) FROM message_read_status;