-- Script pour identifier les triggers qui référencent la colonne 'email' sur project_event_attendees
-- IMPORTANT: On ne touche PAS aux triggers sur auth.users ou profiles où email est légitime

-- 1. Lister TOUS les triggers sur project_event_attendees avec leurs fonctions
SELECT 
    t.tgname as trigger_name,
    CASE t.tgtype::integer & 2 
        WHEN 2 THEN 'BEFORE' 
        ELSE 'AFTER' 
    END as trigger_timing,
    CASE 
        WHEN t.tgtype::integer & 4 = 4 THEN 'INSERT'
        WHEN t.tgtype::integer & 8 = 8 THEN 'DELETE'
        WHEN t.tgtype::integer & 16 = 16 THEN 'UPDATE'
        ELSE 'UNKNOWN'
    END as trigger_event,
    p.proname as function_name,
    n.nspname as function_schema
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE c.relname = 'project_event_attendees'
AND NOT t.tgisinternal
ORDER BY t.tgname;

-- 2. Voir le code source des fonctions trigger sur project_event_attendees
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'project_event_attendees'
AND NOT t.tgisinternal;

-- 3. Rechercher spécifiquement les fonctions qui mentionnent 'email' ET 'project_event_attendees'
SELECT 
    p.proname as function_name,
    n.nspname as schema_name,
    CASE 
        WHEN pg_get_functiondef(p.oid) LIKE '%NEW.email%' THEN 'Référence NEW.email'
        WHEN pg_get_functiondef(p.oid) LIKE '%OLD.email%' THEN 'Référence OLD.email'
        WHEN pg_get_functiondef(p.oid) LIKE '%.email%' THEN 'Référence .email'
        ELSE 'Autre référence email'
    END as type_reference,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE pg_get_functiondef(p.oid) LIKE '%project_event_attendees%'
AND pg_get_functiondef(p.oid) LIKE '%email%';

-- 4. Identifier les contraintes CHECK qui pourraient référencer email
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'project_event_attendees'::regclass
AND contype = 'c'
AND pg_get_constraintdef(oid) LIKE '%email%';

-- 5. Vérifier les politiques RLS qui pourraient référencer email
SELECT 
    polname as policy_name,
    CASE polcmd 
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        WHEN '*' THEN 'ALL'
    END as command,
    pg_get_expr(polqual, polrelid) as using_expression,
    pg_get_expr(polwithcheck, polrelid) as with_check_expression
FROM pg_policy
WHERE polrelid = 'project_event_attendees'::regclass
AND (
    pg_get_expr(polqual, polrelid) LIKE '%email%'
    OR pg_get_expr(polwithcheck, polrelid) LIKE '%email%'
);

-- 6. IMPORTANT: Vérifier aussi les vues qui pourraient utiliser project_event_attendees avec email
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views
WHERE definition LIKE '%project_event_attendees%'
AND definition LIKE '%email%';

-- 7. Script pour SUPPRIMER les triggers problématiques (À EXÉCUTER AVEC PRUDENCE)
-- Décommentez et modifiez selon les résultats ci-dessus
/*
-- Exemple: Si vous trouvez un trigger problématique nommé 'check_attendee_email'
DROP TRIGGER IF EXISTS check_attendee_email ON project_event_attendees;

-- Exemple: Si vous trouvez une fonction trigger problématique
DROP FUNCTION IF EXISTS check_attendee_email_func() CASCADE;

-- Pour supprimer TOUS les triggers sur project_event_attendees (DANGER!)
-- DO $$
-- DECLARE
--     r RECORD;
-- BEGIN
--     FOR r IN (
--         SELECT tgname
--         FROM pg_trigger
--         WHERE tgrelid = 'project_event_attendees'::regclass
--         AND NOT tgisinternal
--     ) LOOP
--         EXECUTE 'DROP TRIGGER IF EXISTS ' || r.tgname || ' ON project_event_attendees CASCADE';
--         RAISE NOTICE 'Trigger supprimé: %', r.tgname;
--     END LOOP;
-- END $$;
*/

-- 8. Vérifier quelle table/trigger utilise légitimement 'email'
-- (pour ne pas les supprimer par erreur)
SELECT DISTINCT
    c.relname as table_name,
    'Table contient colonne email' as info
FROM pg_class c
JOIN pg_attribute a ON c.oid = a.attrelid
WHERE a.attname = 'email'
AND c.relkind = 'r'
AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
UNION ALL
SELECT DISTINCT
    c.relname as table_name,
    'Table auth contient email' as info
FROM pg_class c
JOIN pg_attribute a ON c.oid = a.attrelid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE a.attname = 'email'
AND c.relkind = 'r'
AND n.nspname = 'auth'
ORDER BY table_name;

-- Message d'information
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'IMPORTANT: NE PAS supprimer les triggers/fonctions';
    RAISE NOTICE 'qui utilisent email sur:';
    RAISE NOTICE '- auth.users (nécessaire pour l''authentification)';
    RAISE NOTICE '- profiles (peut contenir email légitimement)';
    RAISE NOTICE '- Toute autre table métier qui a besoin d''email';
    RAISE NOTICE '';
    RAISE NOTICE 'SEULEMENT supprimer ceux sur project_event_attendees';
    RAISE NOTICE 'où email n''existe plus comme colonne';
    RAISE NOTICE '=================================================';
END $$;