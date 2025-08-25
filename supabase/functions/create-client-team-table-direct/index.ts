import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // First check if table exists
    const { data: tables } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'client_team_members')
      .single()

    if (tables) {
      return new Response(
        JSON.stringify({ success: true, message: 'Table already exists' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create the table using raw SQL through a workaround
    // We'll create a temporary function to execute our SQL
    const createTableSQL = `
      CREATE OR REPLACE FUNCTION create_client_team_members_table()
      RETURNS void AS $$
      BEGIN
        -- Create table if not exists
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

        -- Create indexes if not exists
        CREATE INDEX IF NOT EXISTS idx_client_team_members_client_id 
          ON public.client_team_members(client_id);
        CREATE INDEX IF NOT EXISTS idx_client_team_members_email 
          ON public.client_team_members(email);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_client_team_members_client_email 
          ON public.client_team_members(client_id, email);

        -- Enable RLS
        ALTER TABLE public.client_team_members ENABLE ROW LEVEL SECURITY;

        -- Drop existing policies
        DROP POLICY IF EXISTS "Clients can manage their own team members" 
          ON public.client_team_members;
        DROP POLICY IF EXISTS "Admin can view all team members" 
          ON public.client_team_members;

        -- Create policies
        CREATE POLICY "Clients can manage their own team members" 
          ON public.client_team_members
          FOR ALL
          USING (client_id = auth.uid())
          WITH CHECK (client_id = auth.uid());

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

        -- Add to realtime
        ALTER PUBLICATION supabase_realtime ADD TABLE public.client_team_members;
      EXCEPTION
        WHEN duplicate_object THEN
          NULL; -- Ignore if already exists
      END;
      $$ LANGUAGE plpgsql;
    `

    // Since we can't execute raw SQL directly, we'll use a workaround
    // Try to insert into a system table to trigger an error with our SQL
    // This is a hack but works in some Supabase configurations
    
    // Alternative approach: Create the table structure using Supabase operations
    // This won't work directly but let's return instructions
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Table needs to be created manually',
        instructions: 'Please run the following SQL in your Supabase SQL editor:',
        sql: `
-- Create client_team_members table
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
CREATE INDEX IF NOT EXISTS idx_client_team_members_client_id ON public.client_team_members(client_id);
CREATE INDEX IF NOT EXISTS idx_client_team_members_email ON public.client_team_members(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_team_members_client_email ON public.client_team_members(client_id, email);

-- Enable RLS
ALTER TABLE public.client_team_members ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Clients can manage their own team members" 
  ON public.client_team_members
  FOR ALL
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

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
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_team_members;
        `
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})