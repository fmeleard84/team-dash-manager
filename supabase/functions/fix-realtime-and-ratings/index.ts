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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    const results = []

    // 1. Activer le temps réel pour toutes les tables
    const realtimeTables = [
      'kanban_cards',
      'kanban_columns', 
      'kanban_boards',
      'task_ratings',
      'notifications',
      'candidate_event_notifications'
    ]

    for (const table of realtimeTables) {
      try {
        await supabaseClient.rpc('exec_sql', {
          sql: `ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.${table};`
        })
        results.push(`✅ Realtime enabled for ${table}`)
      } catch (e) {
        results.push(`❌ Error enabling realtime for ${table}: ${e.message}`)
      }
    }

    // 2. Vérifier et corriger la structure de task_ratings
    await supabaseClient.rpc('exec_sql', {
      sql: `
        -- Ajouter la colonne candidate_id si elle n'existe pas
        ALTER TABLE public.task_ratings 
        ADD COLUMN IF NOT EXISTS candidate_id UUID REFERENCES public.candidate_profiles(id);
      `
    })
    results.push('✅ task_ratings.candidate_id column ensured')

    // 3. Mettre à jour les ratings existants avec le candidate_id
    const { data: ratings } = await supabaseClient
      .from('task_ratings')
      .select('id, project_id')
      .is('candidate_id', null)

    if (ratings && ratings.length > 0) {
      for (const rating of ratings) {
        // Trouver le candidat via les assignments
        const { data: assignment } = await supabaseClient
          .from('hr_resource_assignments')
          .select('candidate_id')
          .eq('project_id', rating.project_id)
          .single()

        if (assignment?.candidate_id) {
          await supabaseClient
            .from('task_ratings')
            .update({ candidate_id: assignment.candidate_id })
            .eq('id', rating.id)
        }
      }
      results.push(`✅ Updated ${ratings.length} ratings with candidate_id`)
    }

    // 4. Vérifier les tables avec réplication activée
    const { data: replicationStatus } = await supabaseClient.rpc('exec_sql', {
      sql: `
        SELECT tablename 
        FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public';
      `
    })

    return new Response(
      JSON.stringify({
        success: true,
        results,
        realtime_tables: replicationStatus,
        message: 'Configuration fixed successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})