import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the first candidate and project for testing
    const { data: projects } = await supabase
      .from('projects')
      .select('id, title, owner_id')
      .eq('title', 'Comptable junior client_2')
      .single();

    if (!projects) {
      throw new Error('Project "Comptable junior client_2" not found');
    }

    const { data: candidates } = await supabase
      .from('candidate_profiles')
      .select('id, first_name, last_name')
      .limit(1)
      .single();

    if (!candidates) {
      throw new Error('No candidates found');
    }

    // Create test tracking sessions for today
    const today = new Date();
    const sessions = [];

    // Morning session (9h - 12h)
    const morningStart = new Date(today);
    morningStart.setHours(9, 0, 0, 0);
    
    sessions.push({
      candidate_id: candidates.id,
      project_id: projects.id,
      activity_description: 'Développement de la fonctionnalité de facturation',
      start_time: morningStart.toISOString(),
      end_time: new Date(morningStart.getTime() + 3 * 60 * 60 * 1000).toISOString(), // +3 hours
      duration_minutes: 180,
      hourly_rate: 0.75, // 45€/hour = 0.75€/min
      total_cost: 135, // 180 * 0.75
      status: 'completed'
    });

    // Afternoon session (14h - 17h30)
    const afternoonStart = new Date(today);
    afternoonStart.setHours(14, 0, 0, 0);
    
    sessions.push({
      candidate_id: candidates.id,
      project_id: projects.id,
      activity_description: 'Tests et débogage du système de tracking',
      start_time: afternoonStart.toISOString(),
      end_time: new Date(afternoonStart.getTime() + 3.5 * 60 * 60 * 1000).toISOString(), // +3.5 hours
      duration_minutes: 210,
      hourly_rate: 0.75,
      total_cost: 157.5, // 210 * 0.75
      status: 'completed'
    });

    // Insert sessions
    const { data: insertedSessions, error: insertError } = await supabase
      .from('time_tracking_sessions')
      .insert(sessions)
      .select();

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Created ${insertedSessions.length} test tracking sessions`,
        project: projects.title,
        candidate: `${candidates.first_name} ${candidates.last_name}`,
        total_minutes: 390,
        total_cost: 292.5,
        sessions: insertedSessions
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});