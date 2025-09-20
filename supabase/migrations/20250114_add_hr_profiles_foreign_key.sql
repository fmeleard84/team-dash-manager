-- Migration: Ajout clé étrangère hr_resource_assignments.profile_id → hr_profiles.id
-- Date: 2025-01-14
-- Description: Corrige le problème de jointure entre hr_resource_assignments et hr_profiles

-- Supprimer la contrainte si elle existe déjà (évite les erreurs)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_hr_resource_assignments_profile_id'
    AND conrelid = 'hr_resource_assignments'::regclass
  ) THEN
    ALTER TABLE hr_resource_assignments
    DROP CONSTRAINT fk_hr_resource_assignments_profile_id;
  END IF;
END $$;

-- Ajouter la nouvelle contrainte de clé étrangère
ALTER TABLE hr_resource_assignments
ADD CONSTRAINT fk_hr_resource_assignments_profile_id
FOREIGN KEY (profile_id) REFERENCES hr_profiles(id)
ON DELETE SET NULL ON UPDATE CASCADE;