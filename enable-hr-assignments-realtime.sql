-- Script pour activer le realtime sur hr_resource_assignments
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Activer le realtime pour la table hr_resource_assignments
ALTER PUBLICATION supabase_realtime ADD TABLE public.hr_resource_assignments;

-- 2. Vérifier que le realtime est bien activé
SELECT 
    schemaname,
    tablename,
    pubname
FROM 
    pg_publication_tables
WHERE 
    pubname = 'supabase_realtime'
    AND schemaname = 'public'
ORDER BY tablename;

-- 3. Si vous voulez aussi activer le realtime pour d'autres tables importantes
-- (décommentez les lignes nécessaires)

-- ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.candidate_notifications;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.kanban_cards;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.project_files;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.project_planning;

-- 4. Pour voir toutes les tables avec realtime activé
SELECT 
    tablename,
    COUNT(*) as is_enabled
FROM 
    pg_publication_tables
WHERE 
    pubname = 'supabase_realtime'
    AND schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Note: Si vous obtenez une erreur "relation already exists in publication"
-- cela signifie que le realtime est déjà activé pour cette table