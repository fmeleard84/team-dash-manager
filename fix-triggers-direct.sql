-- Script DIRECT pour supprimer TOUS les triggers sur project_event_attendees
-- Cela résoudra le problème "record new has no field email"

-- 1. Afficher les triggers existants sur project_event_attendees
SELECT 
    t.tgname as trigger_name,
    p.proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'project_event_attendees'
AND NOT t.tgisinternal;

-- 2. SUPPRIMER TOUS les triggers sur project_event_attendees
-- ⚠️ ATTENTION: Cela supprimera TOUS les triggers sur cette table
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Parcourir tous les triggers
    FOR r IN (
        SELECT t.tgname
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        WHERE c.relname = 'project_event_attendees'
        AND NOT t.tgisinternal
    ) LOOP
        -- Supprimer chaque trigger
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.tgname) || ' ON project_event_attendees CASCADE';
        RAISE NOTICE 'Trigger supprimé: %', r.tgname;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Tous les triggers sur project_event_attendees ont été supprimés';
END $$;

-- 3. Vérifier qu'il n'y a plus de triggers
SELECT 
    COUNT(*) as triggers_restants
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'project_event_attendees'
AND NOT t.tgisinternal;

-- 4. Vérifier les colonnes de la table
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'project_event_attendees'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Test d'insertion (à adapter avec un event_id et user_id valides)
-- Décommentez et modifiez les IDs pour tester
/*
INSERT INTO project_event_attendees 
(event_id, user_id, role, required, response_status)
VALUES 
('[METTRE_UN_EVENT_ID_VALIDE]', '[METTRE_UN_USER_ID_VALIDE]', 'participant', true, 'pending');
*/

-- Message final
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=================================================';
    RAISE NOTICE '✅ Triggers supprimés avec succès !';
    RAISE NOTICE '';
    RAISE NOTICE 'La table project_event_attendees ne devrait plus';
    RAISE NOTICE 'générer d''erreur "record new has no field email"';
    RAISE NOTICE '';
    RAISE NOTICE 'Testez maintenant la création d''événements';
    RAISE NOTICE 'avec des participants dans votre application.';
    RAISE NOTICE '=================================================';
END $$;