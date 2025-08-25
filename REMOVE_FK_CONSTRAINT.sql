-- ========================================
-- SUPPRIMER LES CONTRAINTES QUI POSENT PROBLÈME
-- ========================================
-- Exécutez ce script dans Supabase SQL Editor

-- 1. Supprimer la contrainte de clé étrangère sur profile_id
ALTER TABLE hr_resource_assignments 
DROP CONSTRAINT IF EXISTS hr_resource_assignments_profile_id_fkey;

-- 2. Supprimer la contrainte unique sur (project_id, profile_id)
ALTER TABLE hr_resource_assignments 
DROP CONSTRAINT IF EXISTS hr_resource_assignments_project_id_profile_id_key;

-- 3. Créer un index non-unique pour les performances
CREATE INDEX IF NOT EXISTS idx_hr_resource_assignments_project_profile 
ON hr_resource_assignments(project_id, profile_id);

-- 4. Vérifier que les contraintes ont été supprimées
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    CASE contype
        WHEN 'f' THEN 'FOREIGN KEY'
        WHEN 'u' THEN 'UNIQUE'
        WHEN 'p' THEN 'PRIMARY KEY'
        WHEN 'c' THEN 'CHECK'
        ELSE contype::text
    END AS type_label
FROM pg_constraint 
WHERE conrelid = 'hr_resource_assignments'::regclass
ORDER BY conname;

-- Message de confirmation
SELECT '✅ Contraintes supprimées! Les membres d''équipe peuvent maintenant être ajoutés librement.' as message;