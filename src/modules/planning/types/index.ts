/**
 * Types pour le module Planning modernisé
 * Système complet de gestion d'événements, calendriers et plannings
 */

// ========================
// TYPES PRINCIPAUX
// ========================

export interface ProjectEvent {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  start_at: string;
  end_at?: string;
  location?: string;
  video_url?: string;
  drive_url?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_recurring: boolean;
  recurrence_rule?: string;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  event_type: 'meeting' | 'kickoff' | 'review' | 'demo' | 'workshop' | 'planning' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  is_public: boolean;
  metadata?: EventMetadata;
}

export interface EventMetadata {
  agenda?: string[];
  objectives?: string[];
  deliverables?: string[];
  preparation_notes?: string;
  follow_up_tasks?: string[];
  zoom_meeting_id?: string;
  teams_meeting_id?: string;
  recording_url?: string;
  meeting_notes_url?: string;
  color_theme?: string;
  custom_fields?: Record<string, any>;
}

export interface EventAttendee {
  id: string;
  event_id: string;
  email: string;
  user_id?: string;
  display_name?: string;
  role?: string;
  required: boolean;
  response_status: 'pending' | 'accepted' | 'declined' | 'tentative';
  response_at?: string;
  check_in_at?: string;
  check_out_at?: string;
  notes?: string;
  permissions: AttendeePermissions;
}

export interface AttendeePermissions {
  can_edit_event: boolean;
  can_invite_others: boolean;
  can_access_recording: boolean;
  can_view_notes: boolean;
  is_organizer: boolean;
}

export interface EventNotification {
  id: string;
  event_id: string;
  candidate_id?: string;
  user_id?: string;
  notification_type: 'invitation' | 'reminder' | 'update' | 'cancellation' | 'rescheduled';
  title: string;
  message: string;
  event_date: string;
  location?: string;
  video_url?: string;
  project_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'viewed' | 'archived';
  sent_at: string;
  read_at?: string;
  response_at?: string;
  reminder_minutes_before?: number;
}

// ========================
// PLANNING & CALENDRIERS
// ========================

export interface Calendar {
  id: string;
  project_id?: string;
  user_id?: string;
  name: string;
  description?: string;
  color_theme: string;
  calendar_type: 'project' | 'personal' | 'shared' | 'external';
  timezone: string;
  settings: CalendarSettings;
  is_default: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface CalendarSettings {
  work_hours: {
    start_time: string;
    end_time: string;
    days: number[]; // 0-6, where 0 is Sunday
  };
  default_event_duration: number; // minutes
  auto_accept_invites: boolean;
  show_declined_events: boolean;
  reminder_defaults: {
    email_minutes_before: number[];
    notification_minutes_before: number[];
  };
  integration_settings: {
    google_calendar_sync: boolean;
    outlook_sync: boolean;
    calendar_id?: string;
  };
}

export interface TimeSlot {
  id: string;
  calendar_id?: string;
  project_id?: string;
  user_id: string;
  start_at: string;
  end_at: string;
  slot_type: 'available' | 'busy' | 'tentative' | 'out_of_office' | 'meeting' | 'focus_time';
  title?: string;
  description?: string;
  is_recurring: boolean;
  recurrence_rule?: string;
  created_at: string;
}

// ========================
// RÉCURRENCE & RÉPÉTITION
// ========================

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number; // Every X days/weeks/months/years
  by_weekday?: number[]; // 0-6, where 0 is Sunday
  by_monthday?: number[]; // 1-31
  by_month?: number[]; // 1-12
  count?: number; // Number of occurrences
  until?: string; // End date
  exceptions?: string[]; // Dates to skip (ISO strings)
}

export interface EventSeries {
  id: string;
  master_event_id: string;
  project_id: string;
  recurrence_rule: RecurrenceRule;
  created_at: string;
  updated_at: string;
  exceptions: EventException[];
}

export interface EventException {
  id: string;
  series_id: string;
  original_date: string;
  exception_type: 'cancelled' | 'moved' | 'modified';
  new_event_id?: string; // If moved/modified
  reason?: string;
}

// ========================
// RESOURCES & SALLES
// ========================

export interface Resource {
  id: string;
  name: string;
  resource_type: 'room' | 'equipment' | 'vehicle' | 'space' | 'service';
  description?: string;
  location?: string;
  capacity?: number;
  features: string[];
  booking_rules: ResourceBookingRules;
  availability_schedule: TimeSlot[];
  cost_per_hour?: number;
  metadata?: Record<string, any>;
  is_active: boolean;
  created_at: string;
}

export interface ResourceBookingRules {
  advance_booking_hours: number;
  max_booking_duration_hours: number;
  min_booking_duration_hours: number;
  requires_approval: boolean;
  allowed_user_types: string[];
  blackout_periods?: Array<{
    start_date: string;
    end_date: string;
    reason: string;
  }>;
}

export interface ResourceBooking {
  id: string;
  resource_id: string;
  event_id?: string;
  booked_by_user_id: string;
  start_at: string;
  end_at: string;
  booking_status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  purpose: string;
  setup_requirements?: string;
  notes?: string;
  cost_total?: number;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
}

// ========================
// INTÉGRATIONS EXTERNES
// ========================

export interface ExternalCalendarSync {
  id: string;
  user_id: string;
  calendar_id: string;
  provider: 'google' | 'outlook' | 'apple' | 'caldav';
  provider_calendar_id: string;
  sync_direction: 'import' | 'export' | 'bidirectional';
  last_sync_at?: string;
  next_sync_at?: string;
  sync_status: 'active' | 'paused' | 'error' | 'pending_auth';
  access_token?: string; // Encrypted
  refresh_token?: string; // Encrypted
  sync_settings: {
    sync_frequency_minutes: number;
    sync_past_days: number;
    sync_future_days: number;
    import_filter_keywords?: string[];
    export_prefix?: string;
  };
  error_log?: Array<{
    timestamp: string;
    error_type: string;
    error_message: string;
  }>;
}

export interface MeetingPlatformIntegration {
  id: string;
  project_id?: string;
  user_id?: string;
  platform: 'zoom' | 'teams' | 'meet' | 'jitsi' | 'webex' | 'discord';
  platform_config: {
    api_key?: string;
    client_id?: string;
    webhook_url?: string;
    default_settings?: Record<string, any>;
  };
  auto_create_meetings: boolean;
  default_meeting_settings: {
    waiting_room: boolean;
    require_password: boolean;
    allow_recording: boolean;
    participant_limit?: number;
  };
  is_active: boolean;
  created_at: string;
}

// ========================
// ANALYTICS & STATISTIQUES
// ========================

export interface PlanningStats {
  project_id?: string;
  user_id?: string;
  period_start: string;
  period_end: string;
  total_events: number;
  completed_events: number;
  cancelled_events: number;
  total_meeting_hours: number;
  average_event_duration: number;
  events_by_type: Record<string, number>;
  events_by_status: Record<string, number>;
  attendance_rate: number;
  most_active_day: string;
  most_active_hour: number;
  resource_utilization: Record<string, number>;
  top_attendees: Array<{
    user_id: string;
    email: string;
    attendance_count: number;
    attendance_rate: number;
  }>;
}

export interface PlanningAnalytics {
  project_id: string;
  period: 'week' | 'month' | 'quarter' | 'year';
  events_timeline: Array<{
    date: string;
    events_count: number;
    total_duration_minutes: number;
  }>;
  team_availability: Array<{
    user_id: string;
    email: string;
    available_hours: number;
    busy_hours: number;
    utilization_rate: number;
  }>;
  meeting_patterns: {
    peak_hours: Array<{ hour: number; event_count: number }>;
    peak_days: Array<{ day: string; event_count: number }>;
    average_meeting_length: number;
    most_common_durations: Array<{ duration_minutes: number; count: number }>;
  };
  resource_insights: Array<{
    resource_id: string;
    resource_name: string;
    booking_count: number;
    utilization_hours: number;
    revenue_generated?: number;
  }>;
}

// ========================
// TYPES POUR LES ACTIONS CRUD
// ========================

export interface CreateEventData {
  project_id: string;
  title: string;
  description?: string;
  start_at: string;
  end_at?: string;
  location?: string;
  event_type: ProjectEvent['event_type'];
  priority?: ProjectEvent['priority'];
  attendees_emails?: string[];
  resource_ids?: string[];
  is_recurring?: boolean;
  recurrence_rule?: RecurrenceRule;
  video_platform?: 'jitsi' | 'zoom' | 'teams' | 'meet';
  auto_create_video_room?: boolean;
  drive_folder_id?: string;
  reminder_settings?: {
    email_reminders: number[];
    push_reminders: number[];
  };
  metadata?: Partial<EventMetadata>;
}

export interface UpdateEventData extends Partial<CreateEventData> {
  status?: ProjectEvent['status'];
  notify_attendees?: boolean;
  update_series?: boolean; // For recurring events
}

export interface CreateCalendarData {
  project_id?: string;
  name: string;
  description?: string;
  color_theme: string;
  calendar_type: Calendar['calendar_type'];
  timezone?: string;
  is_default?: boolean;
  is_public?: boolean;
  settings?: Partial<CalendarSettings>;
}

export interface UpdateCalendarData extends Partial<CreateCalendarData> {}

export interface BookResourceData {
  resource_id: string;
  event_id?: string;
  start_at: string;
  end_at: string;
  purpose: string;
  setup_requirements?: string;
  notes?: string;
}

// ========================
// TYPES POUR LES FILTRES ET RECHERCHE
// ========================

export interface EventFilters {
  project_ids?: string[];
  calendar_ids?: string[];
  event_types?: ProjectEvent['event_type'][];
  statuses?: ProjectEvent['status'][];
  priorities?: ProjectEvent['priority'][];
  date_from?: string;
  date_to?: string;
  attendee_email?: string;
  location?: string;
  has_video_url?: boolean;
  created_by?: string;
  search_query?: string;
}

export interface PlanningSearchResult {
  event: ProjectEvent;
  attendees: EventAttendee[];
  resources: ResourceBooking[];
  relevance_score: number;
  matched_fields: string[];
  preview_snippet?: string;
}

// ========================
// TYPES POUR LES VUES CALENDRIER
// ========================

export interface CalendarViewEvent {
  id: string;
  title: string;
  start: Date;
  end?: Date;
  allDay: boolean;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  description?: string;
  location?: string;
  attendees?: EventAttendee[];
  resources?: ResourceBooking[];
  event_type: ProjectEvent['event_type'];
  status: ProjectEvent['status'];
  priority: ProjectEvent['priority'];
  video_url?: string;
  drive_url?: string;
  is_recurring: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface CalendarViewConfig {
  default_view: 'month' | 'week' | 'day' | 'agenda';
  first_day_of_week: 0 | 1; // 0 = Sunday, 1 = Monday
  time_format: '12h' | '24h';
  show_weekends: boolean;
  work_hours: {
    start: string;
    end: string;
  };
  slot_duration: number; // minutes
  snap_to_slot: boolean;
  allow_overlap: boolean;
  event_color_by: 'type' | 'priority' | 'status' | 'project' | 'custom';
  show_attendee_count: boolean;
  show_location_in_title: boolean;
  compact_event_display: boolean;
}

// ========================
// TYPES POUR LES NOTIFICATIONS
// ========================

export interface NotificationTemplate {
  id: string;
  name: string;
  template_type: 'email' | 'push' | 'sms' | 'webhook';
  trigger_event: 'invitation' | 'reminder' | 'update' | 'cancellation' | 'follow_up';
  language: string;
  subject_template: string;
  body_template: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
}

export interface NotificationRule {
  id: string;
  project_id?: string;
  user_id?: string;
  rule_name: string;
  conditions: {
    event_types?: ProjectEvent['event_type'][];
    priorities?: ProjectEvent['priority'][];
    time_before_event?: number; // minutes
    user_roles?: string[];
    weekdays?: number[];
  };
  actions: {
    send_email: boolean;
    send_push: boolean;
    send_sms: boolean;
    webhook_url?: string;
    template_id: string;
  };
  is_active: boolean;
  created_at: string;
}

// ========================
// TYPES UTILITAIRES
// ========================

export type EventType = ProjectEvent['event_type'];
export type EventStatus = ProjectEvent['status'];
export type EventPriority = ProjectEvent['priority'];
export type ResponseStatus = EventAttendee['response_status'];
export type CalendarType = Calendar['calendar_type'];
export type ResourceType = Resource['resource_type'];
export type NotificationType = EventNotification['notification_type'];
export type MeetingPlatform = MeetingPlatformIntegration['platform'];
export type RecurrenceFrequency = RecurrenceRule['frequency'];

// ========================
// EXPORT PAR DÉFAUT
// ========================

export default {
  ProjectEvent,
  EventMetadata,
  EventAttendee,
  AttendeePermissions,
  EventNotification,
  Calendar,
  CalendarSettings,
  TimeSlot,
  RecurrenceRule,
  EventSeries,
  EventException,
  Resource,
  ResourceBooking,
  ExternalCalendarSync,
  MeetingPlatformIntegration,
  PlanningStats,
  PlanningAnalytics,
  CreateEventData,
  UpdateEventData,
  CreateCalendarData,
  BookResourceData,
  EventFilters,
  PlanningSearchResult,
  CalendarViewEvent,
  CalendarViewConfig,
  NotificationTemplate,
  NotificationRule
};