-- Script alternatif si le realtime semble activé mais ne fonctionne pas

-- 1. D'abord, retirer la table de la publication (si elle existe)
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.hr_resource_assignments;

-- 2. Attendre un moment puis la rajouter
ALTER PUBLICATION supabase_realtime ADD TABLE public.hr_resource_assignments;

-- 3. Vérifier l'état final
SELECT 
    'hr_resource_assignments' as table_name,
    EXISTS (
        SELECT 1 
        FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public'
        AND tablename = 'hr_resource_assignments'
    ) as realtime_enabled;

-- 4. Forcer un refresh de la publication (optionnel)
-- Note: Cette commande peut nécessiter des privilèges admin
-- SELECT pg_reload_conf();