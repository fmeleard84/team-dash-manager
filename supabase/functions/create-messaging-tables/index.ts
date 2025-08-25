import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Create messaging tables
    const createTablesSQL = `
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

      -- Enable RLS
      ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
      ALTER TABLE message_participants ENABLE ROW LEVEL SECURITY;
      ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
      ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
      ALTER TABLE message_read_status ENABLE ROW LEVEL SECURITY;

      -- Policies
      CREATE POLICY IF NOT EXISTS "message_threads_select_policy" ON message_threads FOR SELECT TO authenticated USING (true);
      CREATE POLICY IF NOT EXISTS "message_threads_insert_policy" ON message_threads FOR INSERT TO authenticated WITH CHECK (true);
      CREATE POLICY IF NOT EXISTS "message_threads_update_policy" ON message_threads FOR UPDATE TO authenticated USING (true);

      CREATE POLICY IF NOT EXISTS "message_participants_select_policy" ON message_participants FOR SELECT TO authenticated USING (true);
      CREATE POLICY IF NOT EXISTS "message_participants_insert_policy" ON message_participants FOR INSERT TO authenticated WITH CHECK (true);
      CREATE POLICY IF NOT EXISTS "message_participants_update_policy" ON message_participants FOR UPDATE TO authenticated USING (true);
      CREATE POLICY IF NOT EXISTS "message_participants_delete_policy" ON message_participants FOR DELETE TO authenticated USING (true);

      CREATE POLICY IF NOT EXISTS "messages_select_policy" ON messages FOR SELECT TO authenticated USING (true);
      CREATE POLICY IF NOT EXISTS "messages_insert_policy" ON messages FOR INSERT TO authenticated WITH CHECK (true);
      CREATE POLICY IF NOT EXISTS "messages_update_policy" ON messages FOR UPDATE TO authenticated USING (true);

      CREATE POLICY IF NOT EXISTS "message_attachments_select_policy" ON message_attachments FOR SELECT TO authenticated USING (true);
      CREATE POLICY IF NOT EXISTS "message_attachments_insert_policy" ON message_attachments FOR INSERT TO authenticated WITH CHECK (true);

      CREATE POLICY IF NOT EXISTS "message_read_status_select_policy" ON message_read_status FOR SELECT TO authenticated USING (true);
      CREATE POLICY IF NOT EXISTS "message_read_status_insert_policy" ON message_read_status FOR INSERT TO authenticated WITH CHECK (true);
    `;

    // Test if tables exist by trying to select from them
    const { data: existingThreads, error: threadsError } = await supabaseClient
      .from('message_threads')
      .select('count')
      .limit(1);

    if (threadsError && threadsError.code === '42P01') {
      // Table doesn't exist, return instructions
      return new Response(
        JSON.stringify({ 
          error: 'Tables do not exist. Please run the migration manually.',
          instructions: 'Run the SQL from the migration file in the Supabase SQL editor.'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Messaging tables created successfully' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});