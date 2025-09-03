import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get all active projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, title, project_date')
      .in('status', ['play', 'attente-team']);

    if (projectsError) {
      throw projectsError;
    }

    console.log(`Found ${projects?.length || 0} active projects`);
    let fixedCount = 0;

    for (const project of projects || []) {
      // Check if kickoff event exists
      const { data: kickoffEvent } = await supabase
        .from('project_events')
        .select('id, start_at')
        .eq('project_id', project.id)
        .like('title', '%Kickoff%')
        .single();

      if (kickoffEvent) {
        console.log(`Project ${project.id} has kickoff event ${kickoffEvent.id}`);
        
        // Get team members from hr_resource_assignments
        const { data: assignments } = await supabase
          .from('hr_resource_assignments')
          .select('candidate_id')
          .eq('project_id', project.id)
          .eq('booking_status', 'accepted')
          .not('candidate_id', 'is', null);

        if (assignments && assignments.length > 0) {
          // Check if notifications exist for these candidates
          for (const assignment of assignments) {
            const { data: existingNotif } = await supabase
              .from('candidate_event_notifications')
              .select('id')
              .eq('candidate_id', assignment.candidate_id)
              .eq('event_id', kickoffEvent.id)
              .single();

            if (!existingNotif) {
              // Create missing notification
              const { error: notifError } = await supabase
                .from('candidate_event_notifications')
                .insert({
                  candidate_id: assignment.candidate_id,
                  project_id: project.id,
                  event_id: kickoffEvent.id,
                  title: `Invitation Kickoff - ${project.title}`,
                  description: `Vous êtes invité à la réunion de lancement du projet "${project.title}"`,
                  event_date: kickoffEvent.start_at,
                  video_url: `https://meet.jit.si/${project.id}-kickoff`,
                  status: 'pending'
                });

              if (!notifError) {
                fixedCount++;
                console.log(`Created kickoff notification for candidate ${assignment.candidate_id}`);
              } else {
                console.error(`Error creating notification:`, notifError);
              }
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Fixed ${fixedCount} missing kickoff invitations`,
        projectsChecked: projects?.length || 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in fix-kickoff-invitations:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});