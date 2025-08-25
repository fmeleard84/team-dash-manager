-- Ajouter les nouveaux champs aux templates de projets
ALTER TABLE project_templates
ADD COLUMN IF NOT EXISTS team_size integer DEFAULT 4,
ADD COLUMN IF NOT EXISTS price_per_minute decimal(10,2) DEFAULT 1.5;

-- Commentaires pour documenter les champs
COMMENT ON COLUMN project_templates.team_size IS 'Nombre de personnes dans l''équipe recommandée';
COMMENT ON COLUMN project_templates.price_per_minute IS 'Prix par minute en euros pour ce template';

-- Mettre à jour les templates existants avec des valeurs par défaut
UPDATE project_templates 
SET team_size = 4, price_per_minute = 1.5 
WHERE team_size IS NULL OR price_per_minute IS NULL;