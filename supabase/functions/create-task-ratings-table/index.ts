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

    // Create task_ratings table
    const { error: createTableError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Table pour stocker les notations des tâches
        CREATE TABLE IF NOT EXISTS task_ratings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          task_id UUID NOT NULL REFERENCES kanban_cards(id) ON DELETE CASCADE,
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE SET NULL,
          client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
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

        -- Les clients peuvent voir et créer leurs propres notations
        CREATE POLICY "Clients can view their own ratings"
          ON task_ratings FOR SELECT
          USING (
            auth.uid() = client_id OR
            auth.uid() = candidate_id OR
            auth.uid() IN (
              SELECT created_by FROM projects WHERE id = project_id
            )
          );

        CREATE POLICY "Clients can create ratings for their projects"
          ON task_ratings FOR INSERT
          WITH CHECK (
            auth.uid() = client_id AND
            auth.uid() IN (
              SELECT created_by FROM projects WHERE id = project_id
            )
          );

        -- Les candidats peuvent voir leurs notations mais pas les modifier
        CREATE POLICY "Candidates can view their ratings"
          ON task_ratings FOR SELECT
          USING (
            auth.uid() = candidate_id
          );

        -- Add columns to candidate_profiles if they don't exist
        ALTER TABLE candidate_profiles 
        ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2) DEFAULT 50.00,
        ADD COLUMN IF NOT EXISTS rating_average DECIMAL(3,2),
        ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;
      `
    });

    if (createTableError) {
      console.error('Error creating table:', createTableError);
      throw createTableError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Task ratings table created successfully'
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