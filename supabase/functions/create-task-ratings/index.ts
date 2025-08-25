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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Execute raw SQL to create the table
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
        DROP POLICY IF EXISTS "task_ratings_select_policy" ON task_ratings;
        DROP POLICY IF EXISTS "task_ratings_insert_policy" ON task_ratings;

        -- Policy simple pour permettre tout accès aux utilisateurs authentifiés
        CREATE POLICY "task_ratings_select_policy"
          ON task_ratings FOR SELECT
          USING (true);

        CREATE POLICY "task_ratings_insert_policy"
          ON task_ratings FOR INSERT
          WITH CHECK (auth.uid() IS NOT NULL);
      `
    });

    if (error) {
      console.error('Error creating table:', error);
      
      // Try alternative approach without exec_sql
      const { error: directError } = await supabase.from('task_ratings').select('id').limit(1);
      
      if (directError && directError.code === '42P01') {
        // Table doesn't exist, we need to create it
        return new Response(
          JSON.stringify({ 
            error: 'Table does not exist. Please create it manually in Supabase dashboard.',
            sql: `
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
            `
          }),
          { 
            status: 400,
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            }
          }
        );
      }
    }

    // Verify table exists
    const { error: verifyError } = await supabase.from('task_ratings').select('id').limit(1);
    
    if (verifyError && verifyError.code === '42P01') {
      return new Response(
        JSON.stringify({ 
          error: 'Table creation failed',
          details: 'Unable to create task_ratings table'
        }),
        { 
          status: 500,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          }
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Task ratings table created or already exists'
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }
      }
    )
  }
})