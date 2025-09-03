-- ACTIVER LE REALTIME IMMÉDIATEMENT POUR TOUTES LES TABLES CRITIQUES
-- Exécutez cette requête dans le SQL Editor de Supabase

DO $$
DECLARE
    table_name text;
    critical_tables text[] := ARRAY[
        'hr_resource_assignments',
        'candidate_notifications',
        'resource_transitions',
        'project_access_rights',
        'resource_change_history',
        'projects',
        'project_members',
        'project_files',
        'kanban_cards',
        'kanban_columns',
        'messages',
        'message_read_status',
        'candidate_profiles',
        'candidate_event_notifications',
        'notifications',
        'task_ratings'
    ];
BEGIN
    RAISE NOTICE '🚀 Activation du realtime pour les tables critiques...';
    
    FOREACH table_name IN ARRAY critical_tables
    LOOP
        -- Vérifier si la table existe
        IF EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename = table_name
        ) THEN
            -- Essayer d'ajouter la table au realtime
            BEGIN
                EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
                RAISE NOTICE '✅ Realtime activé pour: %', table_name;
            EXCEPTION 
                WHEN duplicate_object THEN
                    RAISE NOTICE '⚠️ Realtime déjà actif pour: %', table_name;
                WHEN OTHERS THEN
                    RAISE NOTICE '❌ Erreur pour %: %', table_name, SQLERRM;
            END;
        ELSE
            RAISE NOTICE '⏭️ Table inexistante (ignorée): %', table_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✨ Activation du realtime terminée!';
END $$;

-- Vérifier le résultat
SELECT 
    tablename as "Table",
    '✅ Activé' as "Statut Realtime"
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename IN (
        'hr_resource_assignments',
        'candidate_notifications',
        'resource_transitions',
        'projects',
        'messages',
        'kanban_cards'
    )
ORDER BY tablename;