import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check and add missing description column to client_team_members table
    const checkAndFixTable = `
      -- First check if table exists
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

      -- Add description column if it doesn't exist
      ALTER TABLE public.client_team_members 
      ADD COLUMN IF NOT EXISTS description TEXT;

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_client_team_members_client_id 
        ON public.client_team_members(client_id);
      CREATE INDEX IF NOT EXISTS idx_client_team_members_email 
        ON public.client_team_members(email);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_client_team_members_client_email 
        ON public.client_team_members(client_id, email);

      -- Enable RLS
      ALTER TABLE public.client_team_members ENABLE ROW LEVEL SECURITY;

      -- Drop existing policies if they exist
      DROP POLICY IF EXISTS "Clients can manage their own team members" 
        ON public.client_team_members;
      DROP POLICY IF EXISTS "Admin can view all team members" 
        ON public.client_team_members;

      -- Create policy for clients to manage their own team members
      CREATE POLICY "Clients can manage their own team members" 
        ON public.client_team_members
        FOR ALL
        USING (client_id = auth.uid())
        WITH CHECK (client_id = auth.uid());

      -- Create policy for admins to view all team members
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

      -- Create or replace trigger function
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      -- Create trigger
      DROP TRIGGER IF EXISTS update_client_team_members_updated_at 
        ON public.client_team_members;
      CREATE TRIGGER update_client_team_members_updated_at
        BEFORE UPDATE ON public.client_team_members
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

      -- Enable realtime
      DO $$
      BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.client_team_members;
      EXCEPTION
        WHEN duplicate_object THEN
          NULL; -- Ignore if already added
      END $$;
    `;

    // Execute the SQL to fix the table
    const { error: execError } = await supabase.rpc('exec_sql', {
      sql: checkAndFixTable
    }).single()

    if (execError) {
      // If exec_sql doesn't exist, try direct execution (shouldn't work but worth trying)
      console.error('exec_sql error:', execError)
      
      // Return instructions for manual execution
      return new Response(JSON.stringify({
        success: false,
        message: 'Could not execute automatically. Please run the following SQL manually in Supabase SQL Editor:',
        sql: checkAndFixTable,
        error: execError.message
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // Check if the column was added successfully
    const { data: columns, error: checkError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'client_team_members')
      .eq('column_name', 'description')

    if (checkError) {
      console.error('Check error:', checkError)
    }

    const descriptionExists = columns && columns.length > 0

    return new Response(JSON.stringify({
      success: true,
      message: descriptionExists 
        ? 'Table fixed successfully! Description column is now present.' 
        : 'Table updated but please verify the description column manually.',
      descriptionExists,
      columnsChecked: columns
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      details: 'An unexpected error occurred while fixing the table'
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    })
  }
})