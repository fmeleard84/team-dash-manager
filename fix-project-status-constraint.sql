-- Correction de la contrainte de statut projet pour inclure 'attente-team'
-- Selon la documentation, les statuts valides sont : 'pause', 'attente-team', 'play', 'completed'

BEGIN;

-- 1. Supprimer l'ancienne contrainte
ALTER TABLE projects 
DROP CONSTRAINT IF EXISTS projects_status_check;

-- 2. Ajouter la nouvelle contrainte avec tous les statuts valides
ALTER TABLE projects 
ADD CONSTRAINT projects_status_check 
CHECK (status IN ('pause', 'attente-team', 'play', 'completed'));

-- 3. Vérifier les projets existants
SELECT id, name, status, created_at 
FROM projects 
WHERE status NOT IN ('pause', 'attente-team', 'play', 'completed')
LIMIT 10;

-- 4. Afficher la distribution des statuts
SELECT status, COUNT(*) as count 
FROM projects 
GROUP BY status 
ORDER BY count DESC;

COMMIT;

-- Note: Si des projets ont des statuts invalides, ils devront être mis à jour avant d'appliquer cette contrainte