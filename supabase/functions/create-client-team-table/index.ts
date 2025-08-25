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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // SQL to create the table
    const sql = `
      -- Create client_team_members table if not exists
      CREATE TABLE IF NOT EXISTS public.client_team_members (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        job_title VARCHAR(255) NOT NULL,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        is_billable BOOLEAN DEFAULT true,
        daily_rate DECIMAL(10, 2),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Add index for client_id if not exists
      CREATE INDEX IF NOT EXISTS idx_client_team_members_client_id ON public.client_team_members(client_id);

      -- Add unique constraint for email per client if not exists
      CREATE UNIQUE INDEX IF NOT EXISTS idx_client_team_members_client_email ON public.client_team_members(client_id, email);

      -- Enable RLS
      ALTER TABLE public.client_team_members ENABLE ROW LEVEL SECURITY;

      -- Drop existing policies if they exist
      DROP POLICY IF EXISTS "Clients can manage their own team members" ON public.client_team_members;
      DROP POLICY IF EXISTS "Admin can view all team members" ON public.client_team_members;

      -- Policy for clients to manage their own team members
      CREATE POLICY "Clients can manage their own team members" ON public.client_team_members
        FOR ALL
        TO authenticated
        USING (auth.uid() = client_id)
        WITH CHECK (auth.uid() = client_id);

      -- Policy for admin/HR to view all team members
      CREATE POLICY "Admin can view all team members" ON public.client_team_members
        FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'hr')
          )
        );

      -- Enable realtime
      ALTER PUBLICATION supabase_realtime ADD TABLE public.client_team_members;
    `;

    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('Error creating table:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    return new Response(JSON.stringify({ success: true, message: 'Table client_team_members created successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})