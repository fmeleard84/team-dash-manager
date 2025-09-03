-- Vérifier quelles tables ont le realtime activé
SELECT 
    tablename as "Table",
    '✅ Realtime activé' as "Statut"
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename IN (
        'candidate_notifications',
        'hr_resource_assignments',
        'projects'
    )
ORDER BY tablename;

-- Si candidate_notifications n'apparaît pas, l'activer avec :
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.candidate_notifications;