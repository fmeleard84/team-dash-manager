-- Script pour identifier les triggers qui référencent la colonne 'email' sur project_event_attendees
-- Version corrigée sans fonctions d'agrégation problématiques

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
-- (Requête simplifiée)
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'project_event_attendees'
AND NOT t.tgisinternal;

-- 3. Rechercher TOUTES les fonctions qui contiennent 'project_event_attendees' et 'email'
SELECT 
    proname as function_name,
    nspname as schema_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE prosrc LIKE '%project_event_attendees%'
AND prosrc LIKE '%email%';

-- 4. Version simplifiée : voir le source des fonctions
SELECT 
    proname as function_name,
    prosrc as function_source
FROM pg_proc
WHERE prosrc LIKE '%project_event_attendees%'
AND prosrc LIKE '%NEW.email%';

-- 5. Identifier les contraintes CHECK sur project_event_attendees
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'project_event_attendees'::regclass
AND contype = 'c';

-- 6. Vérifier les politiques RLS
SELECT 
    polname as policy_name,
    CASE polcmd 
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        WHEN '*' THEN 'ALL'
    END as command,
    polqual::text as using_clause,
    polwithcheck::text as with_check_clause
FROM pg_policy
WHERE polrelid = 'project_event_attendees'::regclass;

-- 7. Tables qui ont une colonne email (pour contexte)
SELECT 
    schemaname,
    tablename,
    'Has email column' as info
FROM pg_tables t
WHERE EXISTS (
    SELECT 1 
    FROM information_schema.columns c
    WHERE c.table_schema = t.schemaname
    AND c.table_name = t.tablename
    AND c.column_name = 'email'
)
ORDER BY schemaname, tablename;

-- 8. RECHERCHE DIRECTE du problème NEW.email
-- Chercher dans toutes les fonctions
SELECT 
    n.nspname AS schema_name,
    p.proname AS function_name,
    'Found NEW.email reference' as issue
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.prosrc LIKE '%NEW.email%'
AND p.prosrc LIKE '%project_event_attendees%';

-- 9. Si on trouve le trigger problématique, voici comment le supprimer
-- (À DÉCOMMENTER et ADAPTER selon les résultats)
/*
-- Supprimer un trigger spécifique
DROP TRIGGER IF EXISTS [nom_du_trigger] ON project_event_attendees CASCADE;

-- Supprimer une fonction trigger spécifique
DROP FUNCTION IF EXISTS [nom_de_la_fonction]() CASCADE;
*/

-- 10. SOLUTION RADICALE : Supprimer TOUS les triggers sur project_event_attendees
-- ⚠️ ATTENTION: À utiliser en dernier recours
/*
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tgname
        FROM pg_trigger
        WHERE tgrelid = 'project_event_attendees'::regclass
        AND NOT tgisinternal
    ) LOOP
        EXECUTE 'DROP TRIGGER ' || quote_ident(r.tgname) || ' ON project_event_attendees CASCADE';
        RAISE NOTICE 'Trigger supprimé: %', r.tgname;
    END LOOP;
END $$;
*/