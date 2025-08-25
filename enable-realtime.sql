-- Activer la réplication pour les tables nécessaires
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.kanban_cards;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.kanban_columns;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.kanban_boards;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.task_ratings;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.candidate_event_notifications;

-- Vérifier les tables avec réplication activée
SELECT tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND schemaname = 'public';