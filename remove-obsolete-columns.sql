-- Script pour supprimer les colonnes obsolètes après migration vers IDs universels
-- Selon CLAUDE.md : auth.users.id = candidate_profiles.id = client_profiles.id

-- 1. Vérifier qu'on ne perd pas de données importantes
SELECT 
    COUNT(*) as total_rows,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(email) as rows_with_email,
    COUNT(profile_id) as rows_with_profile_id
FROM project_event_attendees;

-- 2. S'assurer que user_id est bien rempli partout
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM project_event_attendees WHERE user_id IS NULL) THEN
        RAISE EXCEPTION 'Des lignes ont user_id NULL - migration nécessaire avant suppression';
    END IF;
    RAISE NOTICE '✅ Tous les enregistrements ont un user_id valide';
END $$;

-- 3. Supprimer les colonnes obsolètes
ALTER TABLE project_event_attendees 
DROP COLUMN IF EXISTS email CASCADE;

ALTER TABLE project_event_attendees 
DROP COLUMN IF EXISTS profile_id CASCADE;

-- 4. Vérifier et recréer la contrainte unique si nécessaire
ALTER TABLE project_event_attendees 
DROP CONSTRAINT IF EXISTS project_event_attendees_event_user_key;

ALTER TABLE project_event_attendees 
DROP CONSTRAINT IF EXISTS project_event_attendees_event_user_unique;

-- Créer la contrainte avec un nom standard
ALTER TABLE project_event_attendees 
ADD CONSTRAINT project_event_attendees_event_user_key 
UNIQUE(event_id, user_id);

-- 5. Ajouter les contraintes de clé étrangère si manquantes
ALTER TABLE project_event_attendees
DROP CONSTRAINT IF EXISTS project_event_attendees_event_id_fkey;

ALTER TABLE project_event_attendees
ADD CONSTRAINT project_event_attendees_event_id_fkey 
FOREIGN KEY (event_id) REFERENCES project_events(id) ON DELETE CASCADE;

ALTER TABLE project_event_attendees
DROP CONSTRAINT IF EXISTS project_event_attendees_user_id_fkey;

ALTER TABLE project_event_attendees
ADD CONSTRAINT project_event_attendees_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 6. Créer les index pour les performances
CREATE INDEX IF NOT EXISTS idx_event_attendees_event_id ON project_event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user_id ON project_event_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_event_user ON project_event_attendees(event_id, user_id);

-- 7. Vérifier la structure finale
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'project_event_attendees'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 8. Vérifier les contraintes
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    pg_get_constraintdef(pgc.oid) as definition
FROM information_schema.table_constraints tc
JOIN pg_constraint pgc ON pgc.conname = tc.constraint_name
WHERE tc.table_name = 'project_event_attendees'
AND tc.table_schema = 'public'
ORDER BY tc.constraint_type, tc.constraint_name;

-- Message de succès
DO $$
BEGIN
    RAISE NOTICE '🎉 Migration complète !';
    RAISE NOTICE '✅ Colonnes obsolètes supprimées (email, profile_id)';
    RAISE NOTICE '✅ Contrainte unique sur (event_id, user_id) active';
    RAISE NOTICE '✅ Clés étrangères correctement configurées';
    RAISE NOTICE '✅ Index de performance créés';
END $$;