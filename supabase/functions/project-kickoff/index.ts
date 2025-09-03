import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const body = await req.text();
    let projectId, kickoffDate;
    
    try {
      const parsed = JSON.parse(body);
      projectId = parsed.projectId;
      kickoffDate = parsed.kickoffDate;
    } catch (e) {
      console.error('Error parsing request body:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    if (!projectId) {
      return new Response(
        JSON.stringify({ error: 'Project ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Starting project kickoff process for project: ${projectId}`);

    // 1. Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, title, description')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.error('Project not found:', projectError);
      return new Response(
        JSON.stringify({ error: 'Project not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 2. Get all team members for this project
    const { data: teamMembers, error: teamError } = await supabase
      .from('project_teams')
      .select('member_id, email, first_name, last_name, member_type')
      .eq('project_id', projectId);

    if (teamError) {
      console.error('Error fetching team members:', teamError);
      return new Response(
        JSON.stringify({ error: 'Error fetching team members' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Found ${teamMembers?.length || 0} team members`);

    // 3. Create kickoff event
    const kickoffDateTime = kickoffDate ? new Date(kickoffDate) : new Date(Date.now() + 24 * 60 * 60 * 1000); // Default to tomorrow
    const kickoffEndTime = new Date(kickoffDateTime.getTime() + 60 * 60 * 1000); // 1 hour duration

    const { data: kickoffEvent, error: eventError } = await supabase
      .from('project_events')
      .insert({
        project_id: projectId,
        title: `Kickoff - ${project.title}`,
        description: `Réunion de lancement du projet ${project.title}`,
        start_at: kickoffDateTime.toISOString(),
        end_at: kickoffEndTime.toISOString(),
        video_url: `https://meet.jit.si/${projectId}-kickoff`,
        created_by: teamMembers?.find(m => m.member_type === 'client')?.member_id || null,
      })
      .select('id')
      .single();

    if (eventError || !kickoffEvent) {
      console.error('Error creating kickoff event:', eventError);
      return new Response(
        JSON.stringify({ error: 'Error creating kickoff event' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Created kickoff event with ID: ${kickoffEvent.id}`);

    // 4. Add all team members as attendees to the kickoff event
    if (teamMembers && teamMembers.length > 0) {
      const attendees = teamMembers.map(member => ({
        event_id: kickoffEvent.id,
        email: member.email,
        required: true,
        response_status: 'pending'
      }));

      const { error: attendeesError } = await supabase
        .from('project_event_attendees')
        .insert(attendees);

      if (attendeesError) {
        console.error('Error adding attendees:', attendeesError);
        // Don't fail the whole process for attendee errors
      } else {
        console.log(`Added ${attendees.length} attendees to kickoff event`);
      }
    }

    // 5. Create notifications for candidates
    if (teamMembers && teamMembers.length > 0) {
      const candidateNotifications = teamMembers
        .filter(member => member.member_type === 'resource')
        .map(member => ({
          candidate_id: member.member_id,
          project_id: projectId,
          event_id: kickoffEvent.id,
          title: `Invitation Kickoff - ${project.title}`,
          description: `Vous êtes invité à la réunion de lancement du projet "${project.title}"`,
          event_date: kickoffDateTime.toISOString(),
          location: null,
          video_url: `https://meet.jit.si/${projectId}-kickoff`,
          status: 'pending'
        }));

      if (candidateNotifications.length > 0) {
        const { error: notifError } = await supabase
          .from('candidate_event_notifications')
          .insert(candidateNotifications);

        if (notifError) {
          console.error('Error creating candidate notifications:', notifError);
        } else {
          console.log(`Created ${candidateNotifications.length} candidate event notifications`);
        }
      }
    }

    // 6. Milestone events are disabled - only create kickoff
    // Les événements milestone seront créés plus tard par le client s'il le souhaite
    const milestoneEvents = [];

    console.log(`Project kickoff process completed successfully for project: ${projectId}`);

    return new Response(
      JSON.stringify({
        success: true,
        kickoffEventId: kickoffEvent.id,
        milestoneEventIds: milestoneEvents,
        teamMembersCount: teamMembers?.length || 0,
        message: 'Project kickoff created successfully with team synchronization'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in project-kickoff function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});