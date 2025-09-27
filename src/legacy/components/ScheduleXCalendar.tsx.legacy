import React, { useEffect, useRef } from 'react';
import { createCalendar, createViewWeek, createViewMonthGrid, createViewDay } from '@schedule-x/calendar';
import { createEventsServicePlugin } from '@schedule-x/events-service';
import '@schedule-x/theme-default/dist/index.css';
import { Calendar, Clock, Users, Video } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
  attendees?: Array<{
    email: string;
    name: string;
    role?: string;
  }>;
}

interface ScheduleXCalendarProps {
  projectName: string;
  events: CalendarEvent[];
  teamMembers?: Array<{
    email: string;
    name: string;
    role?: string;
  }>;
  calendarConfig?: any;
  onEventClick?: (event: CalendarEvent) => void;
}

export function ScheduleXCalendar({
  projectName,
  events,
  teamMembers = [],
  calendarConfig,
  onEventClick
}: ScheduleXCalendarProps) {
  const calendarContainerRef = useRef<HTMLDivElement>(null);
  const calendarInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!calendarContainerRef.current) return;

    // Create events service plugin
    const eventsService = createEventsServicePlugin();

    // Create calendar instance with views
    const calendar = createCalendar({
      el: calendarContainerRef.current,
      views: [createViewMonthGrid(), createViewWeek(), createViewDay()],
      defaultView: 'month-grid',
      firstDayOfWeek: 1, // Monday
      plugins: [eventsService],
      locale: 'fr-FR',
      events: events.map(event => ({
        id: event.id,
        title: event.title,
        start: event.start,
        end: event.end,
        calendarId: 'main',
        _customContent: {
          color: '#10b981', // Emerald color
          description: event.description
        }
      })),
      calendars: {
        main: {
          colorName: 'emerald',
          lightColors: {
            main: '#10b981',
            container: '#ecfdf5',
            onContainer: '#064e3b'
          }
        }
      },
      callbacks: {
        onEventClick: (event: any) => {
          const fullEvent = events.find(e => e.id === event.id);
          if (fullEvent && onEventClick) {
            onEventClick(fullEvent);
          }
        }
      }
    });

    calendar.render();
    calendarInstanceRef.current = calendar;

    return () => {
      if (calendarInstanceRef.current) {
        calendarInstanceRef.current.destroy();
      }
    };
  }, [events, onEventClick]);

  // Find kickoff event
  const kickoffEvent = events.find(e => e.title.includes('Kickoff'));

  return (
    <div className="space-y-4">
      {/* Header with project info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-emerald-600" />
              <CardTitle>Calendrier du projet {projectName}</CardTitle>
            </div>
            {teamMembers.length > 0 && (
              <Badge variant="secondary">
                <Users className="h-3 w-3 mr-1" />
                {teamMembers.length} membres
              </Badge>
            )}
          </div>
          <CardDescription>
            Planning partagé avec l'équipe du projet
          </CardDescription>
        </CardHeader>

        {kickoffEvent && (
          <CardContent>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-start gap-3">
                <div className="bg-emerald-100 dark:bg-emerald-900 rounded-full p-2">
                  <Video className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-sm mb-1">Prochaine réunion kickoff</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {new Date(kickoffEvent.start).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  {kickoffEvent.location && (
                    <a
                      href={kickoffEvent.location}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700"
                    >
                      <Video className="h-3 w-3" />
                      Rejoindre la réunion
                    </a>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Team members */}
      {teamMembers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Équipe du projet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {teamMembers.map((member, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                >
                  <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{member.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {member.role === 'client' ? 'Client' : member.role === 'resource' ? 'Ressource' : member.role}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar view */}
      <Card>
        <CardContent className="p-0">
          <div ref={calendarContainerRef} className="h-[600px] rounded-lg overflow-hidden" />
        </CardContent>
      </Card>
    </div>
  );
}