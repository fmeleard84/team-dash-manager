import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMTM4OTE3NywiZXhwIjoyMDM2OTY1MTc3fQ.oJdlKwpzxvIXUr2jQwScjMZHRj0sOzAzrE6R8g5Bimo';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTable() {
  try {
    // First try to check if table exists
    const { data: existingTable, error: checkError } = await supabase
      .from('task_ratings')
      .select('id')
      .limit(1);
    
    if (!checkError) {
      console.log('✅ Table task_ratings already exists!');
      return;
    }
    
    if (checkError.code === '42P01') {
      console.log('Table does not exist. Attempting to create...');
      
      // Create via migration-like approach
      const sql = `
        CREATE TABLE task_ratings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          task_id UUID NOT NULL,
          project_id UUID NOT NULL,
          candidate_id UUID,
          client_id UUID NOT NULL,
          rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
          comment TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(task_id, client_id)
        );

        CREATE INDEX idx_task_ratings_task_id ON task_ratings(task_id);
        CREATE INDEX idx_task_ratings_candidate_id ON task_ratings(candidate_id);
        CREATE INDEX idx_task_ratings_project_id ON task_ratings(project_id);
        CREATE INDEX idx_task_ratings_client_id ON task_ratings(client_id);

        ALTER TABLE task_ratings ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "task_ratings_select_policy"
          ON task_ratings FOR SELECT
          USING (true);

        CREATE POLICY "task_ratings_insert_policy"
          ON task_ratings FOR INSERT
          WITH CHECK (auth.uid() IS NOT NULL);
      `;
      
      console.log('SQL to execute:');
      console.log(sql);
      console.log('\n⚠️  Please execute this SQL directly in the Supabase dashboard:');
      console.log('1. Go to https://supabase.com/dashboard/project/egdelmcijszuapcpglsy/sql');
      console.log('2. Paste the SQL above');
      console.log('3. Click "Run"');
    } else {
      console.error('Unexpected error:', checkError);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

createTable();