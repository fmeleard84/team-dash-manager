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

    // 5. Create category-specific planning events (optional milestone events)
    const milestones = [
      {
        title: `${project.title} - Phase de découverte`,
        description: 'Analyse des besoins et définition des objectifs',
        days_offset: 3
      },
      {
        title: `${project.title} - Point d'étape`,
        description: 'Revue des premiers livrables et ajustements',
        days_offset: 7
      },
      {
        title: `${project.title} - Présentation finale`,
        description: 'Présentation des résultats et clôture du projet',
        days_offset: 14
      }
    ];

    const milestoneEvents = [];
    for (const milestone of milestones) {
      const milestoneDate = new Date(kickoffDateTime.getTime() + milestone.days_offset * 24 * 60 * 60 * 1000);
      const milestoneEndDate = new Date(milestoneDate.getTime() + 60 * 60 * 1000);

      const { data: milestoneEvent, error: milestoneError } = await supabase
        .from('project_events')
        .insert({
          project_id: projectId,
          title: milestone.title,
          description: milestone.description,
          start_at: milestoneDate.toISOString(),
          end_at: milestoneEndDate.toISOString(),
          created_by: teamMembers?.find(m => m.member_type === 'client')?.member_id || null,
        })
        .select('id')
        .single();

      if (!milestoneError && milestoneEvent) {
        milestoneEvents.push(milestoneEvent.id);
        console.log(`Created milestone event: ${milestone.title}`);
      }
    }

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