-- Activer la réplication temps réel pour toutes les tables nécessaires
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.kanban_cards;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.kanban_columns;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.kanban_boards;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.task_ratings;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.candidate_event_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.hr_resource_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.projects;