-- Migration pour ajouter la contrainte UNIQUE attendue par Supabase
-- Cela permettra au comportement UPSERT automatique de fonctionner correctement

-- 1. D'abord, supprimer les doublons existants s'il y en a
-- (on garde seulement la première occurrence de chaque paire event_id/user_id)
DELETE FROM project_event_attendees a
WHERE a.id > (
  SELECT MIN(b.id)
  FROM project_event_attendees b
  WHERE b.event_id = a.event_id 
  AND b.user_id = a.user_id
);

-- 2. Supprimer les anciennes contraintes si elles existent
ALTER TABLE project_event_attendees 
DROP CONSTRAINT IF EXISTS project_event_attendees_event_user_unique;

ALTER TABLE project_event_attendees 
DROP CONSTRAINT IF EXISTS project_event_attendees_event_email_unique;

ALTER TABLE project_event_attendees 
DROP CONSTRAINT IF EXISTS project_event_attendees_event_profile_unique;

-- 3. Créer la contrainte UNIQUE sur (event_id, user_id)
-- C'est cette contrainte que Supabase/PostgREST cherche pour faire l'UPSERT
ALTER TABLE project_event_attendees 
ADD CONSTRAINT project_event_attendees_event_user_unique 
UNIQUE(event_id, user_id);

-- 4. Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_event_attendees_event_user 
ON project_event_attendees(event_id, user_id);

-- 5. Ajouter un commentaire pour documenter
COMMENT ON CONSTRAINT project_event_attendees_event_user_unique 
ON project_event_attendees 
IS 'Assure qu''un utilisateur ne peut être qu''une fois participant à un événement donné. Permet l''UPSERT automatique de Supabase.';

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE 'Contrainte UNIQUE créée avec succès sur project_event_attendees(event_id, user_id)';
END $$;