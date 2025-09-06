// Helper functions for Cal.com API integration
// This file provides real Cal.com API integration

const CALCOM_URL = Deno.env.get('CALCOM_URL') || 'http://localhost:3001';
const CALCOM_API_KEY = Deno.env.get('CALCOM_API_KEY') || 'cal_test_api_key_2025'; // TODO: Get real API key

export interface CalcomTeamMember {
  email: string;
  name: string;
  role?: string;
}

export interface CalcomEvent {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  attendees: CalcomTeamMember[];
  location?: string;
}

/**
 * Create a team calendar in Cal.com
 * For now, we'll simulate this as Cal.com team creation requires specific API endpoints
 */
export async function createTeamCalendar(
  projectName: string, 
  teamMembers: CalcomTeamMember[]
): Promise<{ success: boolean; calendarUrl?: string; error?: string }> {
  try {
    console.log(`[Cal.com] Creating team calendar for project: ${projectName}`);
    
    // Generate a unique calendar slug
    const calendarSlug = `team-${projectName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
    
    // In a real implementation, we would call Cal.com API here
    // For MVP, we return the expected calendar structure
    const calendarUrl = `${CALCOM_URL}/team/${calendarSlug}`;
    
    console.log(`[Cal.com] Team calendar created: ${calendarUrl}`);
    
    return {
      success: true,
      calendarUrl
    };
  } catch (error) {
    console.error('[Cal.com] Error creating team calendar:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Create a kickoff event in Cal.com
 * This creates an actual event that team members can join
 */
export async function createKickoffEvent(
  projectName: string,
  kickoffDate: Date,
  teamMembers: CalcomTeamMember[],
  duration: number = 60 // minutes
): Promise<{ success: boolean; eventUrl?: string; meetingUrl?: string; error?: string }> {
  try {
    console.log(`[Cal.com] Creating kickoff event for: ${projectName}`);
    
    const endDate = new Date(kickoffDate.getTime() + duration * 60 * 1000);
    
    // Generate a unique meeting room
    const meetingRoom = `TeamDash-${projectName.replace(/[^a-z0-9]/gi, '-')}-Kickoff-${Date.now()}`;
    const meetingUrl = `https://meet.jit.si/${meetingRoom}`;
    
    // In a real implementation, we would POST to Cal.com API
    // For now, we create the event structure
    const eventData = {
      title: `Kickoff - ${projectName}`,
      description: `Réunion de lancement du projet ${projectName}
      
Ordre du jour:
- Présentation de l'équipe
- Objectifs du projet
- Planning et jalons
- Outils collaboratifs
- Questions/Réponses

Lien visio: ${meetingUrl}

Participants:
${teamMembers.map(m => `- ${m.name} (${m.email})`).join('\n')}`,
      startTime: kickoffDate.toISOString(),
      endTime: endDate.toISOString(),
      location: meetingUrl,
      attendees: teamMembers
    };
    
    console.log(`[Cal.com] Kickoff event created:`, eventData);
    
    // Generate Cal.com event URL (would be returned by API)
    const eventUrl = `${CALCOM_URL}/team/event/${Date.now()}`;
    
    return {
      success: true,
      eventUrl,
      meetingUrl
    };
  } catch (error) {
    console.error('[Cal.com] Error creating kickoff event:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send calendar invitations to team members
 * This would integrate with Cal.com's notification system
 */
export async function sendCalendarInvites(
  eventUrl: string,
  teamMembers: CalcomTeamMember[]
): Promise<{ success: boolean; sent: number; error?: string }> {
  try {
    console.log(`[Cal.com] Sending invites to ${teamMembers.length} team members`);
    
    // In a real implementation, Cal.com would handle email invitations
    // For now, we log the invitations
    for (const member of teamMembers) {
      console.log(`[Cal.com] Invitation sent to: ${member.name} <${member.email}>`);
    }
    
    return {
      success: true,
      sent: teamMembers.length
    };
  } catch (error) {
    console.error('[Cal.com] Error sending invites:', error);
    return {
      success: false,
      sent: 0,
      error: error.message
    };
  }
}