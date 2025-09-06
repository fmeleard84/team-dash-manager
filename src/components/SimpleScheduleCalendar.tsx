import React, { useState, useMemo } from 'react';
import { Calendar, Clock, Users, Video, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';

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

interface SimpleScheduleCalendarProps {
  projectName: string;
  events: CalendarEvent[];
  teamMembers?: Array<{
    email: string;
    name: string;
    role?: string;
  }>;
  calendarConfig?: any;
  onEventClick?: (event: CalendarEvent) => void;
  onAddEvent?: () => void;
}

export function SimpleScheduleCalendar({
  projectName,
  events,
  teamMembers = [],
  calendarConfig,
  onEventClick,
  onAddEvent
}: SimpleScheduleCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<'month' | 'list'>('month');

  // Obtenir les jours du mois avec padding des semaines
  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { locale: fr });
    const end = endOfWeek(endOfMonth(currentDate), { locale: fr });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  // Filtrer les événements du mois en cours
  const monthEvents = useMemo(() => {
    return events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate.getMonth() === currentDate.getMonth() && 
             eventDate.getFullYear() === currentDate.getFullYear();
    });
  }, [events, currentDate]);

  // Obtenir les événements d'un jour spécifique
  const getEventsForDay = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start);
      return isSameDay(eventDate, date);
    });
  };

  // Navigation du calendrier
  const previousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Trouver le prochain événement kickoff
  const nextKickoffEvent = events.find(e => 
    e.title.toLowerCase().includes('kickoff') && 
    new Date(e.start) > new Date()
  );

  return (
    <div className="space-y-4">
      {/* Header avec infos projet */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-emerald-600" />
              <CardTitle>Calendrier du projet {projectName}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {teamMembers.length > 0 && (
                <Badge variant="secondary">
                  <Users className="h-3 w-3 mr-1" />
                  {teamMembers.length} membres
                </Badge>
              )}
              <Button
                size="sm"
                variant={view === 'month' ? 'default' : 'outline'}
                onClick={() => setView('month')}
              >
                Mois
              </Button>
              <Button
                size="sm"
                variant={view === 'list' ? 'default' : 'outline'}
                onClick={() => setView('list')}
              >
                Liste
              </Button>
            </div>
          </div>
          <CardDescription>
            Planning partagé avec l'équipe du projet
          </CardDescription>
        </CardHeader>

        {/* Prochain kickoff */}
        {nextKickoffEvent && (
          <CardContent>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-start gap-3">
                <div className="bg-emerald-100 dark:bg-emerald-900 rounded-full p-2">
                  <Video className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-sm mb-1">Prochaine réunion kickoff</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {format(new Date(nextKickoffEvent.start), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
                  </p>
                  {nextKickoffEvent.location && (
                    <a
                      href={nextKickoffEvent.location}
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

      {/* Équipe du projet */}
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

      {/* Vue calendrier ou liste */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={previousMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold">
                {format(currentDate, 'MMMM yyyy', { locale: fr })}
              </h2>
              <Button
                size="icon"
                variant="ghost"
                onClick={nextMonth}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={goToToday}
              >
                Aujourd'hui
              </Button>
              {onAddEvent && (
                <Button
                  size="sm"
                  onClick={onAddEvent}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {view === 'month' ? (
            /* Vue Mois */
            <div className="border-t">
              {/* En-têtes des jours */}
              <div className="grid grid-cols-7 border-b">
                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>

              {/* Grille du calendrier */}
              <div className="grid grid-cols-7">
                {monthDays.map((day, index) => {
                  const dayEvents = getEventsForDay(day);
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isToday = isSameDay(day, new Date());
                  const isSelected = selectedDate && isSameDay(day, selectedDate);

                  return (
                    <div
                      key={index}
                      className={`
                        min-h-[80px] p-2 border-b border-r cursor-pointer hover:bg-muted/50 transition-colors
                        ${!isCurrentMonth ? 'bg-muted/20 text-muted-foreground' : ''}
                        ${isToday ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''}
                        ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                      `}
                      onClick={() => {
                        setSelectedDate(day);
                        if (dayEvents.length > 0 && onEventClick) {
                          onEventClick(dayEvents[0]);
                        }
                      }}
                    >
                      <div className={`text-sm font-medium mb-1 ${isToday ? 'text-emerald-600' : ''}`}>
                        {format(day, 'd')}
                      </div>
                      {dayEvents.map((event, idx) => (
                        <div
                          key={idx}
                          className="text-xs p-1 mb-1 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded truncate"
                          title={event.title}
                        >
                          {format(new Date(event.start), 'HH:mm')} {event.title}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Vue Liste */
            <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
              {events.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucun événement prévu
                </p>
              ) : (
                events
                  .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                  .map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => onEventClick && onEventClick(event)}
                    >
                      <div className="text-center min-w-[60px]">
                        <div className="text-2xl font-bold text-emerald-600">
                          {format(new Date(event.start), 'd')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(event.start), 'MMM', { locale: fr })}
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{event.title}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(event.start), 'HH:mm')} - {format(new Date(event.end), 'HH:mm')}
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-1 mt-1">
                            <Video className="h-3 w-3 text-emerald-600" />
                            <a
                              href={event.location}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-emerald-600 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Lien visio
                            </a>
                          </div>
                        )}
                      </div>
                      {event.attendees && event.attendees.length > 0 && (
                        <Badge variant="secondary">
                          <Users className="h-3 w-3 mr-1" />
                          {event.attendees.length}
                        </Badge>
                      )}
                    </div>
                  ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}