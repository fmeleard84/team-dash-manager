import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTable() {
  console.log('🚀 Création de la table client_team_members...');
  
  try {
    // Test if exec_sql exists first
    const { data: execTest, error: execError } = await supabase.rpc('exec_sql', {
      sql_query: 'SELECT 1'
    });
    
    if (execError) {
      console.log('exec_sql not available, creating table via migration...');
      // Create a simple test to see if table exists
      const { error: tableError } = await supabase
        .from('client_team_members')
        .select('id')
        .limit(1);
      
      if (tableError?.code === '42P01') {
        console.log('❌ Table does not exist and cannot be created via this method');
        console.log('Please run the migration manually or contact an admin');
      } else if (!tableError) {
        console.log('✅ Table already exists!');
      }
      return;
    }
    
    // Create table using exec_sql
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: `
        -- Create client_team_members table if not exists
        CREATE TABLE IF NOT EXISTS public.client_team_members (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          first_name VARCHAR(255) NOT NULL,
          last_name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          job_title VARCHAR(255),
          department VARCHAR(255),
          is_billable BOOLEAN DEFAULT false,
          daily_rate DECIMAL(10, 2),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Create indexes
        DO $$ 
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_client_team_members_client_id') THEN
            CREATE INDEX idx_client_team_members_client_id ON public.client_team_members(client_id);
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_client_team_members_email') THEN
            CREATE INDEX idx_client_team_members_email ON public.client_team_members(email);
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_client_team_members_client_email') THEN
            CREATE UNIQUE INDEX idx_client_team_members_client_email ON public.client_team_members(client_id, email);
          END IF;
        END $$;

        -- Enable RLS
        ALTER TABLE public.client_team_members ENABLE ROW LEVEL SECURITY;

        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Clients can manage their own team members" ON public.client_team_members;
        DROP POLICY IF EXISTS "Admin can view all team members" ON public.client_team_members;

        -- Create policy for clients to manage their own team members
        CREATE POLICY "Clients can manage their own team members" 
          ON public.client_team_members
          FOR ALL
          USING (client_id = auth.uid())
          WITH CHECK (client_id = auth.uid());

        -- Create policy for admin/HR to view all team members
        CREATE POLICY "Admin can view all team members" 
          ON public.client_team_members
          FOR SELECT
          USING (
            EXISTS (
              SELECT 1 FROM profiles 
              WHERE profiles.id = auth.uid() 
              AND profiles.role IN ('admin', 'hr')
            )
          );

        -- Enable realtime
        DO $$
        BEGIN
          ALTER PUBLICATION supabase_realtime ADD TABLE public.client_team_members;
        EXCEPTION
          WHEN duplicate_object THEN
            NULL;
        END $$;
      `
    });

    if (error) {
      console.error('❌ Error creating table:', error);
    } else {
      console.log('✅ Table created successfully!');
      
      // Test if table is accessible
      const { error: testError } = await supabase
        .from('client_team_members')
        .select('id')
        .limit(1);
      
      if (!testError) {
        console.log('✅ Table is accessible and ready to use!');
      }
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
  
  process.exit(0);
}

createTable().catch(console.error);