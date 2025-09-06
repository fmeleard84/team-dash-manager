import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Schedule-X helper functions embedded directly
interface TeamMember {
  email: string;
  name: string;
  role?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
  attendees?: TeamMember[];
}

async function createTeamCalendar(
  projectName: string, 
  teamMembers: TeamMember[]
): Promise<{ success: boolean; calendarConfig?: any; calendarUrl?: string; error?: string }> {
  try {
    console.log(`[Schedule-X] Creating team calendar for project: ${projectName}`);
    
    // Generate a unique calendar ID
    const calendarId = `team-${projectName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
    
    // Create calendar configuration for Schedule-X
    const calendarConfig = {
      id: calendarId,
      name: `Team Calendar - ${projectName}`,
      color: '#10b981',
      members: teamMembers.map(member => ({
        id: member.email,
        name: member.name,
        role: member.role || 'member',
        email: member.email
      }))
    };
    
    // Generate shareable URL
    const calendarUrl = `/calendar/shared/${calendarId}`;
    
    console.log(`[Schedule-X] Calendar configuration created: ${calendarId}`);
    return { success: true, calendarConfig, calendarUrl };
  } catch (error) {
    console.error('[Schedule-X] Error creating team calendar:', error);
    return { success: false, error: error.message };
  }
}

async function createKickoffEvent(
  projectName: string,
  kickoffDate: Date,
  teamMembers: TeamMember[],
  duration: number = 60
): Promise<{ success: boolean; event?: CalendarEvent; eventUrl?: string; meetingUrl?: string; error?: string }> {
  try {
    console.log(`[Schedule-X] Creating kickoff event for: ${projectName}`);
    
    // Generate unique event ID
    const eventId = `kickoff-${Date.now()}`;
    
    // Generate Jitsi meeting room
    const meetingRoom = `TeamDash-${projectName.replace(/[^a-z0-9]/gi, '-')}-Kickoff-${Date.now()}`;
    const meetingUrl = `https://meet.jit.si/${meetingRoom}`;
    
    // Calculate end time
    const endDate = new Date(kickoffDate.getTime() + duration * 60 * 1000);
    
    // Create event object
    const event: CalendarEvent = {
      id: eventId,
      title: `Kickoff - ${projectName}`,
      start: kickoffDate,
      end: endDate,
      description: `Réunion de lancement du projet ${projectName}.\nLien de la réunion: ${meetingUrl}`,
      location: meetingUrl,
      attendees: teamMembers
    };
    
    const eventUrl = `/calendar/event/${eventId}`;
    
    console.log(`[Schedule-X] Kickoff event created with meeting URL: ${meetingUrl}`);
    return { success: true, event, eventUrl, meetingUrl };
  } catch (error) {
    console.error('[Schedule-X] Error creating kickoff event:', error);
    return { success: false, error: error.message };
  }
}

async function generateCalendarInvites(
  event: CalendarEvent,
  organizer: TeamMember
): Promise<{ success: boolean; inviteData?: any; error?: string }> {
  try {
    console.log(`[Schedule-X] Generating invites for ${event.attendees?.length || 0} team members`);
    
    // In a real implementation, this would generate ICS files or send emails
    // For now, we store the invite data for later use
    const inviteData = {
      eventId: event.id,
      organizer,
      attendees: event.attendees || [],
      sentAt: new Date().toISOString()
    };
    
    console.log(`[Schedule-X] Invite data prepared for ${event.attendees?.length || 0} attendees`);
    return { success: true, inviteData };
  } catch (error) {
    console.error('[Schedule-X] Error generating invites:', error);
    return { success: false, error: error.message };
  }
}

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

    // 1. Get project details first (without join)
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.error('Project not found:', projectError);
      console.error('Project ID:', projectId);
      return new Response(
        JSON.stringify({ 
          error: 'Project not found',
          details: projectError?.message || 'No project with this ID',
          projectId: projectId
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    console.log(`Project found: ${project.title}, owner: ${project.owner_id}`);
    
    // 2. Get client profile separately
    let clientProfile = null;
    if (project.owner_id) {
      const { data: profile, error: profileError } = await supabase
        .from('client_profiles')
        .select('id, email, first_name, last_name')
        .eq('id', project.owner_id)
        .single();
      
      if (!profileError && profile) {
        clientProfile = profile;
        console.log(`Client profile found: ${profile.email}`);
      } else {
        console.warn('Client profile not found for owner_id:', project.owner_id);
      }
    }

    // 3. Get all accepted candidates for this project (without join first)
    const { data: acceptedAssignments, error: assignmentError } = await supabase
      .from('hr_resource_assignments')
      .select('*')
      .eq('project_id', projectId)
      .eq('booking_status', 'accepted');

    if (assignmentError) {
      console.error('Error fetching assignments:', assignmentError);
      console.error('Assignment error details:', assignmentError.message);
    }
    
    console.log(`Found ${acceptedAssignments?.length || 0} accepted assignments`);

    // 3. Build team members list (client + candidates)
    const teamMembers = [];
    
    // Add project owner (client)
    if (clientProfile) {
      teamMembers.push({
        member_id: project.owner_id,
        email: clientProfile.email,
        first_name: clientProfile.first_name,
        last_name: clientProfile.last_name,
        member_type: 'client'
      });
    } else {
      console.warn('Warning: No client profile found for project owner');
    }
    
    // Add accepted candidates
    if (acceptedAssignments && acceptedAssignments.length > 0) {
      for (const assignment of acceptedAssignments) {
        if (assignment.candidate_id) {
          // Get candidate profile separately
          const { data: candidateProfile, error: candidateError } = await supabase
            .from('candidate_profiles')
            .select('id, email, first_name, last_name')
            .eq('id', assignment.candidate_id)
            .single();
          
          if (!candidateError && candidateProfile) {
            teamMembers.push({
              member_id: assignment.candidate_id,
              email: candidateProfile.email,
              first_name: candidateProfile.first_name,
              last_name: candidateProfile.last_name,
              member_type: 'resource'
            });
            console.log(`Added candidate: ${candidateProfile.email}`);
          } else {
            console.warn(`Warning: No candidate profile found for candidate_id: ${assignment.candidate_id}`);
          }
        }
      }
    } else {
      console.log('No accepted assignments found - creating kickoff with client only');
    }

    console.log(`Found ${teamMembers.length} team members (${teamMembers.filter(m => m.member_type === 'client').length} client, ${teamMembers.filter(m => m.member_type === 'resource').length} resources)`);
    
    // Check if we have at least one team member (client)
    if (teamMembers.length === 0) {
      console.error('No team members found - cannot create kickoff event');
      return new Response(
        JSON.stringify({ error: 'Impossible de créer le kickoff : aucun membre de l\'équipe trouvé' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 4. Create kickoff event with REAL Cal.com integration
    const kickoffDateTime = kickoffDate ? new Date(kickoffDate) : new Date(Date.now() + 24 * 60 * 60 * 1000); // Default to tomorrow
    const kickoffEndTime = new Date(kickoffDateTime.getTime() + 60 * 60 * 1000); // 1 hour duration

    // 4a. Create Schedule-X team calendar for the project
    console.log(`[Schedule-X Integration] Creating team calendar for project: ${project.title}`);
    
    // Prepare team members for Schedule-X
    const scheduleXTeamMembers = teamMembers.map(m => ({
      email: m.email,
      name: `${m.first_name} ${m.last_name}`,
      role: m.member_type
    }));
    
    // Create team calendar configuration
    const calendarResult = await createTeamCalendar(project.title, scheduleXTeamMembers);
    
    if (!calendarResult.success) {
      console.error('[Schedule-X Integration] Failed to create team calendar:', calendarResult.error);
      // Continue anyway - calendar creation is not critical
    }
    
    // 4b. Create kickoff event in Schedule-X
    const kickoffResult = await createKickoffEvent(
      project.title,
      kickoffDateTime,
      scheduleXTeamMembers,
      60 // 1 hour duration
    );
    
    if (!kickoffResult.success) {
      console.error('[Schedule-X Integration] Failed to create kickoff event:', kickoffResult.error);
      // Continue anyway - event creation is not critical
    }
    
    // 4c. Generate calendar invitations
    let inviteData = null;
    if (kickoffResult.event && clientProfile) {
      const organizer = {
        email: clientProfile.email,
        name: `${clientProfile.first_name} ${clientProfile.last_name}`,
        role: 'organizer'
      };
      const inviteResult = await generateCalendarInvites(kickoffResult.event, organizer);
      if (inviteResult.success) {
        inviteData = inviteResult.inviteData;
        console.log(`[Schedule-X Integration] Generated invites for ${kickoffResult.event.attendees?.length || 0} attendees`);
      }
    }
    
    // Store Schedule-X metadata in project
    const scheduleXMetadata = {
      calendar_created: calendarResult.success,
      calendar_config: calendarResult.calendarConfig || null,
      calendar_url: calendarResult.calendarUrl || null,
      kickoff_date: kickoffDateTime.toISOString(),
      kickoff_event: kickoffResult.event ? {
        id: kickoffResult.event.id,
        title: kickoffResult.event.title,
        start: kickoffResult.event.start.toISOString(),
        end: kickoffResult.event.end.toISOString(),
        description: kickoffResult.event.description,
        location: kickoffResult.event.location
      } : null,
      kickoff_event_url: kickoffResult.eventUrl || null,
      kickoff_meeting_url: kickoffResult.meetingUrl || null,
      team_members: scheduleXTeamMembers,
      invite_data: inviteData,
      integration_date: new Date().toISOString(),
      integration_type: 'schedule-x'
    };
    
    // Update project with Schedule-X metadata
    const { error: updateError } = await supabase
      .from('projects')
      .update({ 
        metadata: { 
          ...(project.metadata || {}), 
          scheduleX: scheduleXMetadata 
        },
        planning_shared: calendarResult.calendarUrl // Store calendar URL for quick access
      })
      .eq('id', projectId);
    
    if (updateError) {
      console.error('[Schedule-X Integration] Error updating project metadata:', updateError);
    } else {
      console.log('[Schedule-X Integration] Schedule-X integration complete and saved');
    }

    const { data: kickoffEvent, error: eventError } = await supabase
      .from('project_events')
      .insert({
        project_id: projectId,
        title: `Kickoff - ${project.title}`,
        description: `Réunion de lancement du projet ${project.title}`,
        start_at: kickoffDateTime.toISOString(),
        end_at: kickoffEndTime.toISOString(),
        video_url: kickoffResult.meetingUrl || `https://meet.jit.si/${projectId}-kickoff`,
        created_by: project.owner_id,
        metadata: {
          scheduleX_calendar_url: calendarResult.calendarUrl,
          scheduleX_calendar_config: calendarResult.calendarConfig,
          scheduleX_event: kickoffResult.event ? {
            id: kickoffResult.event.id,
            title: kickoffResult.event.title,
            start: kickoffResult.event.start.toISOString(),
            end: kickoffResult.event.end.toISOString()
          } : null,
          scheduleX_event_url: kickoffResult.eventUrl,
          scheduleX_meeting_url: kickoffResult.meetingUrl,
          integration_complete: true,
          integration_type: 'schedule-x'
        }
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

    // 5. Add all team members as attendees to the main kickoff event
    let attendeesCount = 0;
    if (teamMembers.length > 0) {
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
        console.error('Attendees data:', attendees);
        // Don't fail the whole process for attendee errors
      } else {
        attendeesCount = attendees.length;
        console.log(`Added ${attendeesCount} attendees to kickoff event`);
      }
    }

    // 6. Create notifications for ALL team members (including client)
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
        console.error('Notifications data:', candidateNotifications);
      } else {
        console.log(`Created ${candidateNotifications.length} candidate event notifications`);
      }
    } else {
      console.log('No candidates to notify (only client in the team)');
    }

    // 7. Milestone events are disabled - only create kickoff
    // Les événements milestone seront créés plus tard par le client s'il le souhaite
    const milestoneEvents = [];

    console.log(`Project kickoff process completed successfully for project: ${projectId}`);
    console.log(`Summary: Created 1 kickoff event, ${attendeesCount} attendees, ${candidateNotifications.length} candidate notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        kickoffEventId: kickoffEvent.id,
        milestoneEventIds: milestoneEvents,
        teamMembersCount: teamMembers.length,
        clientsCount: teamMembers.filter(m => m.member_type === 'client').length,
        candidatesCount: teamMembers.filter(m => m.member_type === 'resource').length,
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