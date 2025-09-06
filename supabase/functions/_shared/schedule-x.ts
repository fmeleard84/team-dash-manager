// Schedule-X Helper Functions for Project Kickoff
// This replaces the Cal.com integration with a free, open-source alternative

export interface TeamMember {
  email: string;
  name: string;
  role?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
  attendees?: TeamMember[];
}

// Create a team calendar configuration for Schedule-X
export async function createTeamCalendar(
  projectName: string,
  teamMembers: TeamMember[]
): Promise<{ success: boolean; calendarConfig?: any; error?: string }> {
  try {
    console.log(`[Schedule-X] Creating team calendar for project: ${projectName}`);
    
    // Generate a unique calendar ID
    const calendarId = `team-${projectName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
    
    // Create calendar configuration for Schedule-X
    const calendarConfig = {
      id: calendarId,
      name: `Team Calendar - ${projectName}`,
      color: '#10b981', // Emerald color for team projects
      members: teamMembers.map(member => ({
        id: member.email,
        name: member.name,
        role: member.role || 'member',
        email: member.email
      }))
    };
    
    console.log(`[Schedule-X] Calendar configuration created: ${calendarId}`);
    return { success: true, calendarConfig };
  } catch (error) {
    console.error('[Schedule-X] Error creating team calendar:', error);
    return { success: false, error: error.message };
  }
}

// Create a kickoff event in Schedule-X format
export async function createKickoffEvent(
  projectName: string,
  kickoffDate: Date,
  teamMembers: TeamMember[],
  duration: number = 60
): Promise<{ success: boolean; event?: CalendarEvent; meetingUrl?: string; error?: string }> {
  try {
    console.log(`[Schedule-X] Creating kickoff event for: ${projectName}`);
    
    // Generate unique event ID
    const eventId = `kickoff-${Date.now()}`;
    
    // Generate Jitsi meeting room
    const meetingRoom = `TeamDash-${projectName.replace(/[^a-z0-9]/gi, '-')}-Kickoff-${Date.now()}`;
    const meetingUrl = `https://meet.jit.si/${meetingRoom}`;
    
    // Calculate end time
    const endDate = new Date(kickoffDate.getTime() + duration * 60 * 1000);
    
    // Create event object in Schedule-X format
    const event: CalendarEvent = {
      id: eventId,
      title: `Kickoff - ${projectName}`,
      start: kickoffDate,
      end: endDate,
      description: `Réunion de lancement du projet ${projectName}.\nLien de la réunion: ${meetingUrl}`,
      location: meetingUrl,
      attendees: teamMembers
    };
    
    console.log(`[Schedule-X] Kickoff event created with meeting URL: ${meetingUrl}`);
    return { success: true, event, meetingUrl };
  } catch (error) {
    console.error('[Schedule-X] Error creating kickoff event:', error);
    return { success: false, error: error.message };
  }
}

// Generate calendar invites in iCalendar format for email sending
export async function generateCalendarInvite(
  event: CalendarEvent,
  organizer: TeamMember
): Promise<{ success: boolean; icsContent?: string; error?: string }> {
  try {
    console.log(`[Schedule-X] Generating calendar invite for: ${event.title}`);
    
    // Format date to iCalendar format (YYYYMMDDTHHMMSSZ)
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };
    
    // Generate UID for the event
    const uid = `${event.id}@teamdash.com`;
    
    // Build attendees list
    const attendees = event.attendees?.map(attendee => 
      `ATTENDEE;CN="${attendee.name}";RSVP=TRUE:mailto:${attendee.email}`
    ).join('\r\n') || '';
    
    // Create iCalendar content
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//TeamDash//Schedule-X//EN
METHOD:REQUEST
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(event.start)}
DTEND:${formatDate(event.end)}
SUMMARY:${event.title}
DESCRIPTION:${event.description?.replace(/\n/g, '\\n') || ''}
LOCATION:${event.location || ''}
ORGANIZER;CN="${organizer.name}":mailto:${organizer.email}
${attendees}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`;
    
    console.log(`[Schedule-X] Calendar invite generated for ${event.attendees?.length || 0} attendees`);
    return { success: true, icsContent };
  } catch (error) {
    console.error('[Schedule-X] Error generating calendar invite:', error);
    return { success: false, error: error.message };
  }
}

// Create a shareable calendar view configuration
export function createShareableCalendarUrl(calendarId: string): string {
  // This would be the URL where the calendar is hosted in your app
  // For now, return a local route that will display the Schedule-X calendar
  return `/calendar/shared/${calendarId}`;
}

// Create milestone events for project phases
export async function createMilestoneEvents(
  projectName: string,
  milestones: Array<{ name: string; date: Date; duration?: number }>,
  teamMembers: TeamMember[]
): Promise<{ success: boolean; events?: CalendarEvent[]; error?: string }> {
  try {
    console.log(`[Schedule-X] Creating ${milestones.length} milestone events`);
    
    const events: CalendarEvent[] = [];
    
    for (const milestone of milestones) {
      const eventId = `milestone-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const duration = milestone.duration || 30; // Default 30 minutes
      
      events.push({
        id: eventId,
        title: `${projectName} - ${milestone.name}`,
        start: milestone.date,
        end: new Date(milestone.date.getTime() + duration * 60 * 1000),
        description: `Point d'étape: ${milestone.name}`,
        attendees: teamMembers
      });
    }
    
    console.log(`[Schedule-X] Created ${events.length} milestone events`);
    return { success: true, events };
  } catch (error) {
    console.error('[Schedule-X] Error creating milestone events:', error);
    return { success: false, error: error.message };
  }
}

// Export calendar data in JSON format for persistence
export function exportCalendarData(
  calendarConfig: any,
  events: CalendarEvent[]
): { calendar: any; events: any[] } {
  return {
    calendar: calendarConfig,
    events: events.map(event => ({
      ...event,
      start: event.start.toISOString(),
      end: event.end.toISOString()
    }))
  };
}