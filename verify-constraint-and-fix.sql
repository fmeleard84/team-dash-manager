-- Script de vérification et correction de la structure de project_event_attendees

-- 1. Vérifier la structure actuelle de la table
\d project_event_attendees

-- 2. Lister toutes les contraintes existantes
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    tc.table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.table_name = 'project_event_attendees'
    AND tc.table_schema = 'public'
ORDER BY tc.constraint_type, tc.constraint_name;

-- 3. Vérifier spécifiquement les contraintes UNIQUE
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'project_event_attendees'::regclass
    AND contype = 'u';

-- 4. Vérifier s'il y a des doublons actuellement
SELECT event_id, user_id, COUNT(*) as count
FROM project_event_attendees
GROUP BY event_id, user_id
HAVING COUNT(*) > 1;

-- 5. Si vous voyez des problèmes, exécutez ces commandes pour corriger :

-- Supprimer TOUS les doublons (garder une seule ligne par paire event_id/user_id)
DELETE FROM project_event_attendees a
WHERE EXISTS (
    SELECT 1
    FROM project_event_attendees b
    WHERE a.event_id = b.event_id
    AND a.user_id = b.user_id
    AND a.ctid > b.ctid
);

-- Supprimer et recréer la contrainte unique
ALTER TABLE project_event_attendees 
DROP CONSTRAINT IF EXISTS project_event_attendees_event_user_unique;

ALTER TABLE project_event_attendees 
ADD CONSTRAINT project_event_attendees_event_user_unique 
UNIQUE(event_id, user_id);

-- 6. Vérifier le résultat final
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'project_event_attendees'::regclass
    AND contype = 'u';

-- 7. Test d'insertion pour vérifier
-- Remplacez les IDs par des valeurs réelles de votre base
/*
INSERT INTO project_event_attendees (event_id, user_id, role, required, response_status)
VALUES ('fb3a412c-0dbd-4175-89e2-5fa9b11f485e', '6352b49b-6bb2-40f0-a9fd-e83ea430be32', 'participant', true, 'pending')
ON CONFLICT (event_id, user_id) 
DO UPDATE SET 
    role = EXCLUDED.role,
    required = EXCLUDED.required,
    response_status = EXCLUDED.response_status;
*/