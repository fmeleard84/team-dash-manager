-- Add inputs and outputs columns to hr_profiles table
ALTER TABLE public.hr_profiles 
ADD COLUMN inputs text[] DEFAULT '{}',
ADD COLUMN outputs text[] DEFAULT '{}';

-- Update existing profiles with meaningful inputs and outputs
UPDATE public.hr_profiles 
SET 
  inputs = CASE 
    WHEN name ILIKE '%chef%projet%' OR name ILIKE '%project%manager%' THEN ARRAY['Cahier des charges', 'Budget', 'Délais']
    WHEN name ILIKE '%développeur%' OR name ILIKE '%developer%' THEN ARRAY['Spécifications techniques', 'Maquettes', 'API']
    WHEN name ILIKE '%designer%' OR name ILIKE '%design%' THEN ARRAY['Brief créatif', 'Charte graphique', 'Contenu']
    WHEN name ILIKE '%analyste%' OR name ILIKE '%analyst%' THEN ARRAY['Données brutes', 'Objectifs business', 'KPIs']
    WHEN name ILIKE '%testeur%' OR name ILIKE '%qa%' OR name ILIKE '%test%' THEN ARRAY['Code source', 'Spécifications', 'Scénarios']
    WHEN name ILIKE '%devops%' OR name ILIKE '%système%' THEN ARRAY['Code application', 'Infrastructure', 'Monitoring']
    ELSE ARRAY['Specifications', 'Requirements']
  END,
  outputs = CASE 
    WHEN name ILIKE '%chef%projet%' OR name ILIKE '%project%manager%' THEN ARRAY['Planning détaillé', 'Rapports de suivi', 'Validation livrables', 'Coordination équipe']
    WHEN name ILIKE '%développeur%' OR name ILIKE '%developer%' THEN ARRAY['Code source', 'Documentation technique', 'Tests unitaires', 'Déploiement']
    WHEN name ILIKE '%designer%' OR name ILIKE '%design%' THEN ARRAY['Maquettes', 'Design system', 'Assets graphiques', 'Prototypes']
    WHEN name ILIKE '%analyste%' OR name ILIKE '%analyst%' THEN ARRAY['Analyses détaillées', 'Recommandations', 'Tableaux de bord', 'Insights']
    WHEN name ILIKE '%testeur%' OR name ILIKE '%qa%' OR name ILIKE '%test%' THEN ARRAY['Plans de test', 'Rapports de bugs', 'Validation qualité', 'Automatisation']
    WHEN name ILIKE '%devops%' OR name ILIKE '%système%' THEN ARRAY['Infrastructure', 'CI/CD', 'Monitoring', 'Sécurité']
    ELSE ARRAY['Deliverables', 'Documentation']
  END;