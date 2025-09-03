-- Enable realtime for critical tables
-- This ensures that all changes to these tables are broadcast to subscribed clients

-- Projects table
ALTER TABLE public.projects REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.projects;

-- Resource assignments table (critical for candidate-client sync)
ALTER TABLE public.hr_resource_assignments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.hr_resource_assignments;

-- Candidate profiles
ALTER TABLE public.candidate_profiles REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.candidate_profiles;

-- Profiles table
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.profiles;

-- Notifications tables
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.notifications;

ALTER TABLE public.candidate_notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.candidate_notifications;

-- Kanban tables
ALTER TABLE public.kanban_cards REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.kanban_cards;

ALTER TABLE public.kanban_columns REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.kanban_columns;

-- Messages table
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.messages;

-- Project bookings
ALTER TABLE public.project_bookings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.project_bookings;