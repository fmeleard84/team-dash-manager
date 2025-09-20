-- Migration: Ajout clé étrangère hr_resource_assignments.profile_id → hr_profiles.id
-- Date: 2025-01-14
-- Description: Corrige le problème de jointure entre hr_resource_assignments et hr_profiles

-- 1. Vérifier l'état actuel
SELECT
  'État actuel des contraintes:' as info,
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'hr_resource_assignments'::regclass;

-- 2. Vérifier l'intégrité des données avant migration
SELECT
  'Vérification intégrité des données:' as info,
  COUNT(*) as total_assignments,
  COUNT(DISTINCT profile_id) as unique_profile_ids,
  COUNT(hra.profile_id) as assignments_with_profile_id
FROM hr_resource_assignments hra;

-- 3. Vérifier s'il y a des références orphelines
SELECT
  'Références orphelines (doivent être 0):' as info,
  COUNT(*) as orphaned_assignments
FROM hr_resource_assignments hra
LEFT JOIN hr_profiles hp ON hra.profile_id = hp.id
WHERE hra.profile_id IS NOT NULL AND hp.id IS NULL;

-- 4. Supprimer la contrainte si elle existe déjà (évite les erreurs)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_hr_resource_assignments_profile_id'
    AND conrelid = 'hr_resource_assignments'::regclass
  ) THEN
    ALTER TABLE hr_resource_assignments
    DROP CONSTRAINT fk_hr_resource_assignments_profile_id;
    RAISE NOTICE 'Contrainte existante supprimée';
  END IF;
END $$;

-- 5. Ajouter la nouvelle contrainte de clé étrangère
ALTER TABLE hr_resource_assignments
ADD CONSTRAINT fk_hr_resource_assignments_profile_id
FOREIGN KEY (profile_id) REFERENCES hr_profiles(id)
ON DELETE SET NULL ON UPDATE CASCADE;

-- 6. Vérifier que la contrainte a bien été ajoutée
SELECT
  'Contraintes après migration:' as info,
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'hr_resource_assignments'::regclass
AND contype = 'f';

-- 7. Test de performance de la jointure
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  hra.id,
  hra.profile_id,
  hra.booking_status,
  hp.name,
  hp.is_ai,
  hp.prompt_id
FROM hr_resource_assignments hra
LEFT JOIN hr_profiles hp ON hra.profile_id = hp.id
LIMIT 10;

SELECT 'Migration terminée avec succès!' as status;