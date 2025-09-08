-- Migration forcée pour corriger la contrainte unique sur project_event_attendees
-- Cette migration résout le problème "ON CONFLICT specification" 

-- 1. Supprimer tous les doublons existants
DELETE FROM project_event_attendees a
WHERE a.id > (
  SELECT MIN(b.id)
  FROM project_event_attendees b
  WHERE b.event_id = a.event_id 
  AND b.user_id = a.user_id
);

-- 2. Supprimer toutes les contraintes existantes qui pourraient interférer
ALTER TABLE project_event_attendees 
DROP CONSTRAINT IF EXISTS project_event_attendees_event_user_unique;

ALTER TABLE project_event_attendees 
DROP CONSTRAINT IF EXISTS project_event_attendees_event_email_unique;

ALTER TABLE project_event_attendees 
DROP CONSTRAINT IF EXISTS project_event_attendees_event_profile_unique;

ALTER TABLE project_event_attendees 
DROP CONSTRAINT IF EXISTS project_event_attendees_pkey CASCADE;

-- 3. Recréer la clé primaire
ALTER TABLE project_event_attendees 
ADD CONSTRAINT project_event_attendees_pkey PRIMARY KEY (id);

-- 4. Créer la contrainte unique nécessaire pour ON CONFLICT
ALTER TABLE project_event_attendees 
ADD CONSTRAINT project_event_attendees_event_user_unique 
UNIQUE(event_id, user_id);

-- 5. Créer les index pour les performances
CREATE INDEX IF NOT EXISTS idx_event_attendees_event_user 
ON project_event_attendees(event_id, user_id);

CREATE INDEX IF NOT EXISTS idx_event_attendees_event 
ON project_event_attendees(event_id);

CREATE INDEX IF NOT EXISTS idx_event_attendees_user 
ON project_event_attendees(user_id);

-- 6. Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Contrainte unique project_event_attendees_event_user_unique créée avec succès';
  RAISE NOTICE '✅ La table project_event_attendees est maintenant prête pour les opérations UPSERT';
END $$;