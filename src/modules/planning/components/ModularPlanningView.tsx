/**
 * Composant Planning modernisé et modulaire
 * Interface complète de gestion d'événements avec calendrier, recherche et statistiques
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  CalendarDays, Plus, List, Calendar as CalendarIcon, Search, Filter,
  Clock, MapPin, Users, Video, FolderOpen, Edit3, Trash2, Copy,
  CheckCircle, XCircle, AlertCircle, MoreHorizontal, ChevronLeft, ChevronRight
} from 'lucide-react';
import { usePlanning, usePlanningActions, usePlanningSearch, usePlanningStats, useResourceBooking } from '../hooks';
import { Calendar } from '@/ui/components/calendar';
import { Button } from '@/ui/components/button';
import { Badge } from '@/ui/components/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/card';
import { Input } from '@/ui/components/input';
import { Textarea } from '@/ui/components/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/components/select';
import { FullScreenModal, ModalActions } from '@/ui/components/fullscreen-modal';
import type { CreateEventData, UpdateEventData, EventFilters, ProjectEvent } from '../types';

interface ModularPlanningViewProps {
  projectId: string;
  mode?: 'client' | 'candidate';
  className?: string;
  compact?: boolean;
}

type ViewMode = 'calendar' | 'list' | 'timeline';

export function ModularPlanningView({
  projectId,
  mode = 'client',
  className = '',
  compact = false
}: ModularPlanningViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showFilters, setShowFilters] = useState(false);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ProjectEvent | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ProjectEvent | null>(null);

  // Form state
  const [eventForm, setEventForm] = useState<Partial<CreateEventData>>({
    project_id: projectId,
    event_type: 'meeting',
    priority: 'medium',
    auto_create_video_room: true,
    video_platform: 'jitsi'
  });

  // Hooks du module PLANNING
  const {
    events,
    calendarEvents,
    loading: planningLoading,
    viewPeriod,
    setViewPeriod,
    goToToday,
    goToNextPeriod,
    goToPreviousPeriod,
    upcomingEventsCount,
    todayEventsCount,
    thisWeekEventsCount,
    refresh
  } = usePlanning({
    projectId,
    autoRefresh: true
  });

  const {
    createEvent,
    updateEvent,
    deleteEvent,
    duplicateEvent,
    generateVideoRoomUrl,
    exportToGoogleCalendar,
    loading: actionLoading,
    error: actionError
  } = usePlanningActions({
    onSuccess: (action) => {
      console.log(`✅ [ModularPlanningView] ${action} completed successfully`);
      refresh();
      if (action === 'createEvent' || action === 'updateEvent') {
        setIsCreatingEvent(false);
        setEditingEvent(null);
        resetEventForm();
      }
    },
    onError: (action, error) => {
      console.error(`❌ [ModularPlanningView] ${action} failed:`, error);
    }
  });

  const {
    query: searchQuery,
    results: searchResults,
    loading: searchLoading,
    setQuery: setSearchQuery,
    filters: searchFilters,
    setFilters: setSearchFilters,
    searchHistory,
    totalResults
  } = usePlanningSearch({
    projectIds: [projectId],
    enableHistory: true,
    enableSuggestions: true
  });

  const {
    stats,
    totalEvents,
    completionRate,
    averageDuration,
    attendanceRate,
    mostProductiveDay,
    upcomingEventsThisWeek,
    loading: statsLoading
  } = usePlanningStats({
    projectId,
    period: 'month',
    includeAnalytics: true
  });

  const {
    resources,
    getAvailableResources,
    bookResource,
    loading: resourcesLoading
  } = useResourceBooking({
    autoRefresh: true
  });

  // Réinitialiser le formulaire
  const resetEventForm = useCallback(() => {
    setEventForm({
      project_id: projectId,
      event_type: 'meeting',
      priority: 'medium',
      auto_create_video_room: true,
      video_platform: 'jitsi'
    });
  }, [projectId]);

  // Gérer la soumission du formulaire
  const handleSubmitEvent = useCallback(async () => {
    if (!eventForm.title || !eventForm.start_at) {
      console.warn('[ModularPlanningView] Missing required fields');
      return;
    }

    if (editingEvent) {
      const updateData: UpdateEventData = {
        ...eventForm,
        notify_attendees: true
      };
      await updateEvent(editingEvent.id, updateData);
    } else {
      const createData: CreateEventData = eventForm as CreateEventData;
      await createEvent(createData);
    }
  }, [eventForm, editingEvent, createEvent, updateEvent]);

  // Gérer la sélection d'événement
  const handleEventClick = useCallback((event: ProjectEvent) => {
    setSelectedEvent(event);
  }, []);

  // Gérer l'édition d'événement
  const handleEditEvent = useCallback((event: ProjectEvent) => {
    setEditingEvent(event);
    setEventForm({
      project_id: event.project_id,
      title: event.title,
      description: event.description,
      start_at: event.start_at,
      end_at: event.end_at,
      location: event.location,
      event_type: event.event_type,
      priority: event.priority
    });
    setIsCreatingEvent(true);
  }, []);

  // Gérer la suppression d'événement
  const handleDeleteEvent = useCallback(async (eventId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) {
      await deleteEvent(eventId);
    }
  }, [deleteEvent]);

  // Gérer la duplication d'événement
  const handleDuplicateEvent = useCallback(async (event: ProjectEvent) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const newDate = tomorrow.toISOString();

    await duplicateEvent(event.id, newDate);
  }, [duplicateEvent]);

  // Événements filtrés pour l'affichage
  const displayEvents = useMemo(() => {
    if (searchQuery && searchResults.length > 0) {
      return searchResults.map(result => result.event);
    }
    return events;
  }, [searchQuery, searchResults, events]);

  // Événements du jour sélectionné
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return displayEvents;

    const selectedDateString = selectedDate.toISOString().split('T')[0];
    return displayEvents.filter(event =>
      event.start_at.startsWith(selectedDateString)
    );
  }, [displayEvents, selectedDate]);

  if (planningLoading && events.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-700 ${className}`}>
      {/* Header avec design unifié */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-t-2xl p-6 border-b border-purple-200/50 dark:border-purple-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
              <CalendarDays className="w-6 h-6 text-white" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                Planning du projet
              </h2>
              {!compact && (
                <div className="flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                  <span>{totalEvents} événements</span>
                  <span>•</span>
                  <span>{todayEventsCount} aujourd'hui</span>
                  <span>•</span>
                  <span>{upcomingEventsCount} à venir</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Navigation temporelle */}
            <div className="flex items-center gap-1 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPreviousPeriod}
                className="px-2"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={goToToday}
                className="px-3 text-sm"
              >
                Aujourd'hui
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={goToNextPeriod}
                className="px-2"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Basculeur de vue */}
            <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800">
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('calendar')}
                className={`px-3 ${viewMode === 'calendar' ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white' : ''}`}
              >
                <CalendarIcon className="w-4 h-4 mr-1" />
                {!compact && 'Calendrier'}
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={`px-3 ${viewMode === 'list' ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white' : ''}`}
              >
                <List className="w-4 h-4 mr-1" />
                {!compact && 'Liste'}
              </Button>
            </div>

            {/* Nouveau événement */}
            <Button
              onClick={() => setIsCreatingEvent(true)}
              className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              {compact ? 'Nouveau' : 'Nouvel événement'}
            </Button>
          </div>
        </div>

        {/* Statistiques rapides */}
        {!compact && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/60 dark:bg-neutral-800/60 rounded-lg p-3">
              <div className="text-2xl font-bold text-purple-600">{totalEvents}</div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">Total événements</div>
            </div>
            <div className="bg-white/60 dark:bg-neutral-800/60 rounded-lg p-3">
              <div className="text-2xl font-bold text-indigo-600">{Math.round(completionRate)}%</div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">Taux completion</div>
            </div>
            <div className="bg-white/60 dark:bg-neutral-800/60 rounded-lg p-3">
              <div className="text-2xl font-bold text-cyan-600">{Math.round(averageDuration)}min</div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">Durée moyenne</div>
            </div>
            <div className="bg-white/60 dark:bg-neutral-800/60 rounded-lg p-3">
              <div className="text-2xl font-bold text-emerald-600">{Math.round(attendanceRate)}%</div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">Taux présence</div>
            </div>
          </div>
        )}
      </div>

      {/* Barre de recherche et filtres */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher des événements..."
              className="pl-10 pr-4"
            />
            {searchLoading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtres
          </Button>
        </div>

        {/* Historique de recherche */}
        {searchHistory.length > 0 && searchQuery.length === 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="text-xs text-neutral-500">Récent:</span>
            {searchHistory.slice(0, 3).map((historyItem, index) => (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery(historyItem)}
                className="text-xs h-6 px-2"
              >
                {historyItem}
              </Button>
            ))}
          </div>
        )}

        {/* Résultats de recherche */}
        {searchQuery && (
          <div className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            {totalResults} résultat{totalResults !== 1 ? 's' : ''} trouvé{totalResults !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Contenu principal */}
      <div className="p-6">
        {viewMode === 'calendar' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendrier */}
            <div className="lg:col-span-2">
              <Calendar
                selected={selectedDate}
                onSelect={setSelectedDate}
                mode="single"
                className="rounded-md border w-full"
                modifiers={{
                  eventDay: (date) => {
                    const dateStr = date.toISOString().split('T')[0];
                    return displayEvents.some(event => event.start_at.startsWith(dateStr));
                  }
                }}
                modifiersClassNames={{
                  eventDay: "bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 font-semibold"
                }}
              />
            </div>

            {/* Événements du jour sélectionné */}
            <div className="space-y-4">
              <h3 className="font-semibold text-neutral-900 dark:text-white">
                Événements du {selectedDate?.toLocaleDateString() || 'jour sélectionné'}
              </h3>

              {selectedDateEvents.length === 0 ? (
                <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                  Aucun événement ce jour.
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {selectedDateEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onClick={() => handleEventClick(event)}
                      onEdit={() => handleEditEvent(event)}
                      onDelete={() => handleDeleteEvent(event.id)}
                      onDuplicate={() => handleDuplicateEvent(event)}
                      onExportToGoogle={() => exportToGoogleCalendar(event.id)}
                      compact
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {displayEvents.length === 0 ? (
              <div className="text-center py-12">
                <CalendarDays className="w-12 h-12 mx-auto text-neutral-400 mb-4" />
                <p className="text-neutral-500 dark:text-neutral-400">
                  {searchQuery ? `Aucun résultat pour "${searchQuery}"` : 'Aucun événement trouvé.'}
                </p>
              </div>
            ) : (
              displayEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onClick={() => handleEventClick(event)}
                  onEdit={() => handleEditEvent(event)}
                  onDelete={() => handleDeleteEvent(event.id)}
                  onDuplicate={() => handleDuplicateEvent(event)}
                  onExportToGoogle={() => exportToGoogleCalendar(event.id)}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Modal création/édition d'événement */}
      <FullScreenModal
        isOpen={isCreatingEvent}
        onClose={() => {
          setIsCreatingEvent(false);
          setEditingEvent(null);
          resetEventForm();
        }}
        title={editingEvent ? 'Modifier l\'événement' : 'Nouvel événement'}
        description="Planifiez un événement pour votre équipe projet"
        actions={
          <ModalActions
            onSave={handleSubmitEvent}
            onCancel={() => {
              setIsCreatingEvent(false);
              setEditingEvent(null);
              resetEventForm();
            }}
            saveText={editingEvent ? 'Enregistrer' : 'Créer l\'événement'}
            cancelText="Annuler"
            saveDisabled={!eventForm.title || !eventForm.start_at || actionLoading}
          />
        }
      >
        <EventForm
          eventData={eventForm}
          onChange={setEventForm}
          resources={resources}
        />
      </FullScreenModal>

      {/* Modal détails d'événement */}
      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onEdit={() => {
            handleEditEvent(selectedEvent);
            setSelectedEvent(null);
          }}
          onDelete={() => {
            handleDeleteEvent(selectedEvent.id);
            setSelectedEvent(null);
          }}
        />
      )}

      {/* Erreur */}
      {actionError && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
          {actionError}
        </div>
      )}
    </div>
  );
}

// Composant EventCard
interface EventCardProps {
  event: ProjectEvent;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onExportToGoogle: () => void;
  compact?: boolean;
}

function EventCard({
  event,
  onClick,
  onEdit,
  onDelete,
  onDuplicate,
  onExportToGoogle,
  compact = false
}: EventCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      case 'ongoing': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-l-red-500';
      case 'high': return 'border-l-orange-500';
      case 'medium': return 'border-l-blue-500';
      case 'low': return 'border-l-gray-500';
      default: return 'border-l-gray-300';
    }
  };

  return (
    <div
      className={`bg-white dark:bg-neutral-800 border-l-4 ${getPriorityColor(event.priority)} rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-medium text-neutral-900 dark:text-white">
              {event.title}
            </h4>
            <Badge className={`text-xs ${getStatusColor(event.status)}`}>
              {event.status}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {event.event_type}
            </Badge>
          </div>

          <div className="flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(event.start_at).toLocaleDateString()} à{' '}
              {new Date(event.start_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </div>

            {event.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {event.location}
              </div>
            )}

            {event.video_url && (
              <div className="flex items-center gap-1">
                <Video className="w-3 h-3" />
                Visio
              </div>
            )}
          </div>

          {event.description && !compact && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2 line-clamp-2">
              {event.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 ml-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Edit3 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Composant EventForm
interface EventFormProps {
  eventData: Partial<CreateEventData>;
  onChange: (data: Partial<CreateEventData>) => void;
  resources: any[];
}

function EventForm({ eventData, onChange, resources }: EventFormProps) {
  return (
    <div className="space-y-6">
      {/* Titre */}
      <div>
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 block">
          Titre de l'événement
        </label>
        <Input
          value={eventData.title || ''}
          onChange={(e) => onChange({ ...eventData, title: e.target.value })}
          placeholder="Ex: Réunion kickoff, Point hebdo..."
        />
      </div>

      {/* Date et heures */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 block">
            Date et heure de début
          </label>
          <Input
            type="datetime-local"
            value={eventData.start_at?.slice(0, 16) || ''}
            onChange={(e) => onChange({
              ...eventData,
              start_at: e.target.value ? new Date(e.target.value).toISOString() : ''
            })}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 block">
            Date et heure de fin (optionnel)
          </label>
          <Input
            type="datetime-local"
            value={eventData.end_at?.slice(0, 16) || ''}
            onChange={(e) => onChange({
              ...eventData,
              end_at: e.target.value ? new Date(e.target.value).toISOString() : undefined
            })}
          />
        </div>
      </div>

      {/* Type et priorité */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 block">
            Type d'événement
          </label>
          <Select
            value={eventData.event_type}
            onValueChange={(value: any) => onChange({ ...eventData, event_type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="meeting">Réunion</SelectItem>
              <SelectItem value="kickoff">Kickoff</SelectItem>
              <SelectItem value="review">Revue</SelectItem>
              <SelectItem value="demo">Démo</SelectItem>
              <SelectItem value="workshop">Atelier</SelectItem>
              <SelectItem value="planning">Planification</SelectItem>
              <SelectItem value="other">Autre</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 block">
            Priorité
          </label>
          <Select
            value={eventData.priority}
            onValueChange={(value: any) => onChange({ ...eventData, priority: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Basse</SelectItem>
              <SelectItem value="medium">Moyenne</SelectItem>
              <SelectItem value="high">Élevée</SelectItem>
              <SelectItem value="urgent">Urgente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lieu */}
      <div>
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 block">
          Lieu (optionnel)
        </label>
        <Input
          value={eventData.location || ''}
          onChange={(e) => onChange({ ...eventData, location: e.target.value })}
          placeholder="Salle de réunion, adresse..."
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 block">
          Description (optionnel)
        </label>
        <Textarea
          value={eventData.description || ''}
          onChange={(e) => onChange({ ...eventData, description: e.target.value })}
          placeholder="Détails de l'événement, ordre du jour..."
          rows={3}
        />
      </div>

      {/* Visioconférence */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Video className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
            Visioconférence automatique
          </span>
        </div>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Une salle de visioconférence sera automatiquement créée sur visio.vaya.rip
        </p>
      </div>
    </div>
  );
}

// Composant EventDetailsModal
interface EventDetailsModalProps {
  event: ProjectEvent;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function EventDetailsModal({ event, onClose, onEdit, onDelete }: EventDetailsModalProps) {
  return (
    <FullScreenModal
      isOpen={true}
      onClose={onClose}
      title={event.title}
      description={`Événement du ${new Date(event.start_at).toLocaleDateString()}`}
      actions={
        <ModalActions
          onSave={onEdit}
          onDelete={onDelete}
          onCancel={onClose}
          saveText="Modifier"
          deleteText="Supprimer"
          cancelText="Fermer"
        />
      }
    >
      <div className="space-y-6">
        {/* Informations principales */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Date et heure
            </label>
            <p className="text-neutral-900 dark:text-white">
              {new Date(event.start_at).toLocaleDateString()} à{' '}
              {new Date(event.start_at).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Type
            </label>
            <p className="text-neutral-900 dark:text-white capitalize">
              {event.event_type}
            </p>
          </div>
        </div>

        {event.location && (
          <div>
            <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Lieu
            </label>
            <p className="text-neutral-900 dark:text-white">{event.location}</p>
          </div>
        )}

        {event.description && (
          <div>
            <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Description
            </label>
            <p className="text-neutral-900 dark:text-white whitespace-pre-wrap">
              {event.description}
            </p>
          </div>
        )}

        {event.video_url && (
          <div>
            <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Visioconférence
            </label>
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-blue-500" />
              <span className="text-blue-600">Salle disponible sur visio.vaya.rip</span>
            </div>
          </div>
        )}
      </div>
    </FullScreenModal>
  );
}