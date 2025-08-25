// Script pour ajouter directement les colonnes dans Supabase
// Exécutez ce SQL dans l'éditeur SQL de Supabase :

console.log(`
Veuillez exécuter ce SQL dans l'éditeur SQL de Supabase :

-- Ajouter les colonnes si elles n'existent pas
ALTER TABLE project_templates
ADD COLUMN IF NOT EXISTS team_size integer DEFAULT 4,
ADD COLUMN IF NOT EXISTS price_per_minute decimal(10,2) DEFAULT 1.5;

-- Mettre à jour les valeurs NULL
UPDATE project_templates 
SET team_size = 4 
WHERE team_size IS NULL;

UPDATE project_templates 
SET price_per_minute = 1.5 
WHERE price_per_minute IS NULL;

-- Vérifier les colonnes
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'project_templates' 
AND column_name IN ('team_size', 'price_per_minute');
`);