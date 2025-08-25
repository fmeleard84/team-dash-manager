import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Connect directly to the database
    const dbUrl = Deno.env.get('SUPABASE_DB_URL')!.replace('6543', '5432')
    
    // Import pg client
    const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts")
    
    const client = new Client(dbUrl)
    await client.connect()

    try {
      // Check if table exists
      const checkResult = await client.queryObject`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'task_ratings'
        ) as exists
      `
      
      if (checkResult.rows[0].exists) {
        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'Table task_ratings already exists'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Create the table
      await client.queryObject`
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
        )
      `

      // Create indexes
      await client.queryObject`CREATE INDEX idx_task_ratings_task_id ON task_ratings(task_id)`
      await client.queryObject`CREATE INDEX idx_task_ratings_candidate_id ON task_ratings(candidate_id)`
      await client.queryObject`CREATE INDEX idx_task_ratings_project_id ON task_ratings(project_id)`
      await client.queryObject`CREATE INDEX idx_task_ratings_client_id ON task_ratings(client_id)`

      // Enable RLS
      await client.queryObject`ALTER TABLE task_ratings ENABLE ROW LEVEL SECURITY`

      // Create policies
      await client.queryObject`
        CREATE POLICY "task_ratings_select_policy"
          ON task_ratings FOR SELECT
          USING (true)
      `

      await client.queryObject`
        CREATE POLICY "task_ratings_insert_policy"
          ON task_ratings FOR INSERT
          WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = client_id)
      `

      await client.queryObject`
        CREATE POLICY "task_ratings_update_policy"
          ON task_ratings FOR UPDATE
          USING (auth.uid() = client_id)
          WITH CHECK (auth.uid() = client_id)
      `

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Table task_ratings created successfully'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } finally {
      await client.end()
    }

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})