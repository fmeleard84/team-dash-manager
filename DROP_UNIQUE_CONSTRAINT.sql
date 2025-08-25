-- ========================================
-- SUPPRIMER LA CONTRAINTE UNIQUE QUI CAUSE DES PROBLÈMES
-- ========================================
-- Exécutez ce script dans Supabase SQL Editor

-- 1. Supprimer la contrainte unique existante
ALTER TABLE hr_resource_assignments 
DROP CONSTRAINT IF EXISTS hr_resource_assignments_project_id_profile_id_key;

-- 2. Créer un index non-unique à la place (pour les performances)
CREATE INDEX IF NOT EXISTS idx_hr_resource_assignments_project_profile 
ON hr_resource_assignments(project_id, profile_id);

-- 3. Vérifier que la contrainte a bien été supprimée
SELECT 
    conname AS constraint_name,
    contype AS constraint_type
FROM pg_constraint 
WHERE conrelid = 'hr_resource_assignments'::regclass
AND conname LIKE '%project_id_profile_id%';

-- Message de confirmation
SELECT 'Contrainte unique supprimée avec succès! Les membres d''équipe peuvent maintenant être ajoutés sans conflit.' as message;