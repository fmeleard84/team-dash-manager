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

    // Enable realtime for all critical tables
    const realtimeQueries = [
      `ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.task_ratings`,
      `ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.messages`,
      `ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.projects`,
      `ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.kanban_cards`,
      `ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.kanban_columns`,
      `ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.notifications`,
      `ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.candidate_event_notifications`,
      `ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.project_files`
    ];

    const results = [];
    for (const query of realtimeQueries) {
      const { error } = await supabaseClient.rpc('exec_sql', { query });
      if (error) {
        console.error(`Error executing: ${query}`, error);
        results.push({ query, error: error.message });
      } else {
        results.push({ query, success: true });
      }
    }

    // Create trigger function for task ratings
    const taskRatingTrigger = `
      CREATE OR REPLACE FUNCTION notify_on_task_rating() 
      RETURNS TRIGGER AS $$
      DECLARE
        card_data RECORD;
        project_data RECORD;
        candidate_data RECORD;
      BEGIN
        SELECT * INTO card_data FROM kanban_cards WHERE id = NEW.task_id;
        
        IF card_data.kanban_board_id IS NOT NULL THEN
          SELECT p.* INTO project_data 
          FROM projects p
          JOIN kanban_boards kb ON kb.project_id = p.id
          WHERE kb.id = card_data.kanban_board_id;
        END IF;
        
        SELECT * INTO candidate_data FROM candidate_profiles WHERE id = NEW.candidate_id;
        
        IF candidate_data.email IS NOT NULL THEN
          INSERT INTO notifications (
            user_id,
            type,
            title,
            description,
            data,
            priority,
            created_at
          ) 
          SELECT 
            au.id,
            'task_rating',
            'Nouvelle note sur votre tâche',
            'La tâche "' || COALESCE(card_data.title, 'Sans titre') || '" a reçu une note de ' || NEW.rating || ' étoiles',
            jsonb_build_object(
              'task_id', NEW.task_id,
              'rating', NEW.rating,
              'project_id', project_data.id,
              'project_name', project_data.name
            ),
            'medium',
            NOW()
          FROM auth.users au
          WHERE au.email = candidate_data.email;
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    const { error: triggerError } = await supabaseClient.rpc('exec_sql', { query: taskRatingTrigger });
    if (triggerError) {
      console.error('Error creating trigger function:', triggerError);
      results.push({ query: 'notify_on_task_rating function', error: triggerError.message });
    } else {
      results.push({ query: 'notify_on_task_rating function', success: true });
    }

    // Create trigger
    const createTrigger = `
      DROP TRIGGER IF EXISTS trigger_notify_on_task_rating ON task_ratings;
      CREATE TRIGGER trigger_notify_on_task_rating
        AFTER INSERT ON task_ratings
        FOR EACH ROW
        EXECUTE FUNCTION notify_on_task_rating();
    `;

    const { error: createTriggerError } = await supabaseClient.rpc('exec_sql', { query: createTrigger });
    if (createTriggerError) {
      console.error('Error creating trigger:', createTriggerError);
      results.push({ query: 'trigger_notify_on_task_rating', error: createTriggerError.message });
    } else {
      results.push({ query: 'trigger_notify_on_task_rating', success: true });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Realtime enabled for all tables and triggers created',
        results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: error.message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})