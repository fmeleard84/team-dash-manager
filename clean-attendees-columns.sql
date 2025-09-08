-- Script pour nettoyer les colonnes inutilisées de project_event_attendees

-- 1. Vérifier les valeurs actuelles dans les colonnes email et profile_id
SELECT 
    COUNT(*) as total_rows,
    COUNT(email) as rows_with_email,
    COUNT(profile_id) as rows_with_profile_id,
    COUNT(user_id) as rows_with_user_id
FROM project_event_attendees;

-- 2. Vérifier s'il y a des valeurs non-NULL dans email ou profile_id
SELECT id, event_id, user_id, email, profile_id, role
FROM project_event_attendees
WHERE email IS NOT NULL OR profile_id IS NOT NULL
LIMIT 10;

-- 3. Mettre à jour profile_id avec user_id si nécessaire (migration des anciennes données)
UPDATE project_event_attendees
SET profile_id = user_id
WHERE profile_id IS NULL AND user_id IS NOT NULL;

-- 4. Nettoyer les colonnes email (la mettre à NULL partout)
UPDATE project_event_attendees
SET email = NULL
WHERE email IS NOT NULL;

-- 5. Vérifier qu'on a bien user_id partout
SELECT COUNT(*) as rows_without_user_id
FROM project_event_attendees
WHERE user_id IS NULL;

-- Si le compte est 0, tout est bon !

-- 6. Optionnel : Supprimer les colonnes inutiles (à faire seulement si vous êtes sûr)
-- ALTER TABLE project_event_attendees DROP COLUMN IF EXISTS email;
-- ALTER TABLE project_event_attendees DROP COLUMN IF EXISTS profile_id;

-- 7. Afficher la structure finale
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'project_event_attendees'
AND table_schema = 'public'
ORDER BY ordinal_position;