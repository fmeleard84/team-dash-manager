-- SOLUTION : Nettoyer l'architecture et revenir à un système cohérent

-- 1. Supprimer les colonnes problématiques ajoutées
ALTER TABLE hr_resource_assignments 
DROP COLUMN IF EXISTS current_candidate_id,
DROP COLUMN IF EXISTS modification_in_progress,
DROP COLUMN IF EXISTS last_modified_at;

-- 2. Le tracking des candidats assignés existe DÉJÀ via candidate_notifications
-- Pas besoin de dupliquer cette info dans hr_resource_assignments
-- La relation est :
-- hr_resource_assignments.id ← candidate_notifications.resource_assignment_id → candidate_profiles.id

-- 3. Pour savoir quel candidat est assigné à une ressource, on fait :
-- SELECT * FROM candidate_notifications 
-- WHERE resource_assignment_id = ? 
-- AND status = 'accepted'
-- ORDER BY created_at DESC LIMIT 1

-- 4. Vérifier que les tables de base sont correctes
SELECT 
    'hr_resource_assignments' as table_name,
    COUNT(*) as count
FROM hr_resource_assignments
UNION ALL
SELECT 
    'candidate_notifications' as table_name,
    COUNT(*) as count  
FROM candidate_notifications
UNION ALL
SELECT 
    'candidate_profiles' as table_name,
    COUNT(*) as count
FROM candidate_profiles;