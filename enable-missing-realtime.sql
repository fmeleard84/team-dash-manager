-- Activer le realtime pour les 2 tables manquantes
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_read_status;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_files;

-- Vérifier que tout est bien activé
SELECT 
    tablename as "Table",
    '✅ Realtime activé' as "Statut"
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename IN ('message_read_status', 'project_files')
ORDER BY tablename;