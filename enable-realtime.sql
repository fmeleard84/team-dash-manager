-- SCRIPT SQL POUR ACTIVER LE REALTIME - TABLES CRITIQUES EN PREMIER
-- Copiez et exécutez ce script dans: https://supabase.com/dashboard/project/egdelmcijszuapcpglsy/sql/new

-- 1. Tables CRITIQUES pour la synchronisation client-candidat (À FAIRE EN PREMIER)
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.hr_resource_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.candidate_profiles;

-- 2. Tables de notifications
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.candidate_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.candidate_event_notifications;

-- 3. Tables kanban et autres
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.kanban_cards;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.kanban_columns;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.kanban_boards;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.task_ratings;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.messages;

-- Vérifier les tables avec réplication activée
SELECT tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND schemaname = 'public';