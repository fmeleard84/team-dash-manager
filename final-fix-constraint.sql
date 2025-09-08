-- Script final pour corriger définitivement le problème de contrainte unique
-- À exécuter directement dans la base de données Supabase

-- 1. Nettoyer tous les doublons existants (méthode robuste)
DELETE FROM project_event_attendees a
WHERE a.ctid NOT IN (
  SELECT MIN(b.ctid)
  FROM project_event_attendees b
  GROUP BY b.event_id, b.user_id
);

-- 2. Supprimer TOUTES les contraintes qui pourraient interférer
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Supprimer toutes les contraintes UNIQUE sur la table
  FOR r IN (
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'project_event_attendees'::regclass
    AND contype = 'u'
  ) LOOP
    EXECUTE 'ALTER TABLE project_event_attendees DROP CONSTRAINT IF EXISTS ' || r.conname;
    RAISE NOTICE 'Contrainte supprimée: %', r.conname;
  END LOOP;
END $$;

-- 3. Créer la contrainte unique correcte
ALTER TABLE project_event_attendees 
ADD CONSTRAINT project_event_attendees_event_user_key 
UNIQUE(event_id, user_id);

-- 4. Créer les index nécessaires
CREATE INDEX IF NOT EXISTS idx_attendees_event_id ON project_event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_attendees_user_id ON project_event_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_attendees_event_user ON project_event_attendees(event_id, user_id);

-- 5. Vérification finale
SELECT 
    'Contraintes UNIQUE:' as info,
    conname as constraint_name,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'project_event_attendees'::regclass
AND contype = 'u'
UNION ALL
SELECT 
    'Colonnes de la table:' as info,
    column_name::text as constraint_name,
    data_type as definition
FROM information_schema.columns
WHERE table_name = 'project_event_attendees'
AND table_schema = 'public'
ORDER BY info, constraint_name;

-- 6. Test d'insertion (commenté, à décommenter pour tester)
/*
-- Test 1: Premier insert
INSERT INTO project_event_attendees (event_id, user_id, role, required, response_status)
VALUES ('fb3a412c-0dbd-4175-89e2-5fa9b11f485e', '6352b49b-6bb2-40f0-a9fd-e83ea430be32', 'participant', true, 'pending');

-- Test 2: Deuxième insert identique (devrait échouer avec erreur de duplication)
INSERT INTO project_event_attendees (event_id, user_id, role, required, response_status)
VALUES ('fb3a412c-0dbd-4175-89e2-5fa9b11f485e', '6352b49b-6bb2-40f0-a9fd-e83ea430be32', 'organizer', true, 'accepted');
*/

-- Message de succès
DO $$
BEGIN
  RAISE NOTICE '✅ Structure de project_event_attendees corrigée avec succès!';
  RAISE NOTICE '✅ Contrainte unique sur (event_id, user_id) active';
  RAISE NOTICE '✅ Vous pouvez maintenant créer des événements avec participants';
END $$;