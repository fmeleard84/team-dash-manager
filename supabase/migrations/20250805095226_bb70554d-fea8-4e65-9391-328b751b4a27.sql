-- Phase 1: Modifier la table candidate_profiles pour stocker profile_id au lieu de category_id
-- Ajouter la nouvelle colonne profile_id
ALTER TABLE candidate_profiles ADD COLUMN profile_id UUID REFERENCES hr_profiles(id);

-- Migrer les données existantes (mapper category_id vers un profile par défaut dans cette catégorie)
UPDATE candidate_profiles 
SET profile_id = (
  SELECT hp.id 
  FROM hr_profiles hp 
  WHERE hp.category_id = candidate_profiles.category_id 
  LIMIT 1
)
WHERE category_id IS NOT NULL;

-- Rendre profile_id obligatoire
ALTER TABLE candidate_profiles ALTER COLUMN profile_id SET NOT NULL;

-- Supprimer l'ancienne colonne category_id
ALTER TABLE candidate_profiles DROP COLUMN category_id;