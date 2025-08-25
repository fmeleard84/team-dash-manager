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

    const { userId } = await req.json();
    console.log('Debugging active tracking for user:', userId);

    // 1. Get user's projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .or(`user_id.eq.${userId},owner_id.eq.${userId}`);

    console.log('Projects found:', projects?.length, projectsError);

    // 2. Get all active tracking sessions
    const { data: allTracking, error: trackingError } = await supabase
      .from('active_time_tracking')
      .select('*')
      .in('status', ['active', 'paused']);

    console.log('All active tracking:', allTracking?.length, trackingError);

    // 3. Get tracking for user's projects
    let userTracking = [];
    if (projects && projects.length > 0) {
      const projectIds = projects.map(p => p.id);
      const { data: tracking } = await supabase
        .from('active_time_tracking')
        .select('*')
        .in('project_id', projectIds)
        .in('status', ['active', 'paused']);
      
      userTracking = tracking || [];
    }

    console.log('User tracking:', userTracking.length);

    return new Response(
      JSON.stringify({
        userId,
        projects: projects || [],
        allActiveTracking: allTracking || [],
        userActiveTracking: userTracking,
        summary: {
          totalProjects: projects?.length || 0,
          totalActiveTracking: allTracking?.length || 0,
          userActiveTracking: userTracking.length
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});