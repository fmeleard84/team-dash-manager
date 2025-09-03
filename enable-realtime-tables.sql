-- 3. ACTIVER LE REALTIME POUR TOUTES LES TABLES MANQUANTES
-- Après avoir exécuté la requête de vérification ci-dessus,
-- utilisez cette requête pour activer le realtime sur les tables qui en ont besoin

-- OPTION A: Activer le realtime pour UNE table spécifique
-- Remplacez 'TABLE_NAME' par le nom de la table
ALTER PUBLICATION supabase_realtime ADD TABLE public.TABLE_NAME;

-- OPTION B: Activer le realtime pour TOUTES les tables critiques d'un coup
-- Cette requête active le realtime pour toutes les tables importantes du système
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
        'task_ratings',
        'invoices',
        'invoice_payments'
    ];
BEGIN
    FOREACH table_name IN ARRAY critical_tables
    LOOP
        -- Vérifier si la table existe
        IF EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename = table_name
        ) THEN
            -- Vérifier si elle n'est pas déjà en realtime
            IF NOT EXISTS (
                SELECT 1 FROM pg_publication_tables 
                WHERE pubname = 'supabase_realtime' 
                AND schemaname = 'public' 
                AND tablename = table_name
            ) THEN
                -- Activer le realtime pour cette table
                EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
                RAISE NOTICE 'Realtime activé pour: %', table_name;
            ELSE
                RAISE NOTICE 'Realtime déjà actif pour: %', table_name;
            END IF;
        ELSE
            RAISE NOTICE 'Table inexistante: %', table_name;
        END IF;
    END LOOP;
END $$;

-- 4. VÉRIFIER LE RÉSULTAT FINAL
-- Après avoir activé le realtime, vérifiez à nouveau l'état
SELECT 
    tablename as table_name,
    '✅ Realtime activé' as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
ORDER BY tablename;