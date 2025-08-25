import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMTM4OTE3NywiZXhwIjoyMDM2OTY1MTc3fQ.oJdlKwpzxvIXUr2jQwScjMZHRj0sOzAzrE6R8g5Bimo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTaskRatingsTable() {
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Table pour stocker les notations des tâches
        CREATE TABLE IF NOT EXISTS task_ratings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          task_id UUID NOT NULL,
          project_id UUID NOT NULL,
          candidate_id UUID,
          client_id UUID NOT NULL,
          rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
          comment TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          
          -- Un client ne peut noter qu'une fois par tâche
          UNIQUE(task_id, client_id)
        );

        -- Indexes pour améliorer les performances
        CREATE INDEX IF NOT EXISTS idx_task_ratings_task_id ON task_ratings(task_id);
        CREATE INDEX IF NOT EXISTS idx_task_ratings_candidate_id ON task_ratings(candidate_id);
        CREATE INDEX IF NOT EXISTS idx_task_ratings_project_id ON task_ratings(project_id);
        CREATE INDEX IF NOT EXISTS idx_task_ratings_client_id ON task_ratings(client_id);

        -- Enable RLS
        ALTER TABLE task_ratings ENABLE ROW LEVEL SECURITY;

        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Clients can view their own ratings" ON task_ratings;
        DROP POLICY IF EXISTS "Clients can create ratings for their projects" ON task_ratings;
        DROP POLICY IF EXISTS "Candidates can view their ratings" ON task_ratings;
        DROP POLICY IF EXISTS "Public can view task ratings" ON task_ratings;
        DROP POLICY IF EXISTS "Authenticated users can create ratings" ON task_ratings;

        -- Policy simple pour permettre tout accès aux utilisateurs authentifiés (temporaire)
        CREATE POLICY "Public can view task ratings"
          ON task_ratings FOR SELECT
          USING (true);

        CREATE POLICY "Authenticated users can create ratings"
          ON task_ratings FOR INSERT
          WITH CHECK (auth.uid() IS NOT NULL);

        -- Notification si la table n'existait pas
        SELECT 'Task ratings table created successfully' as message;
      `
    });

    if (error) {
      console.error('Error:', error);
    } else {
      console.log('✅ Task ratings table created successfully!');
    }
  } catch (err) {
    console.error('Exception:', err);
  }
}

createTaskRatingsTable();