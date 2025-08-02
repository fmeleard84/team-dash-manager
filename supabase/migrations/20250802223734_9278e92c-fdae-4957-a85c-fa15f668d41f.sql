-- Update hr_profiles with realistic inputs and outputs for better team connections

-- Chef de projet
UPDATE hr_profiles 
SET 
  inputs = ARRAY['Cahier des charges', 'Objectifs business', 'Budget', 'Deadline'],
  outputs = ARRAY['Spécifications', 'Planning', 'Validation livrables', 'Coordination équipe']
WHERE name = 'Chef de projet';

-- Développeur Frontend
UPDATE hr_profiles 
SET 
  inputs = ARRAY['Spécifications', 'Maquettes', 'Wireframes', 'Guidelines design'],
  outputs = ARRAY['Interface utilisateur', 'Code frontend', 'Tests unitaires', 'Documentation technique']
WHERE name = 'Développeur Frontend';

-- Développeur Backend
UPDATE hr_profiles 
SET 
  inputs = ARRAY['Spécifications', 'Architecture données', 'Requirements API'],
  outputs = ARRAY['API', 'Base de données', 'Services backend', 'Documentation API']
WHERE name = 'Développeur Backend';

-- Designer UX/UI
UPDATE hr_profiles 
SET 
  inputs = ARRAY['Recherche utilisateur', 'Objectifs business', 'Contraintes techniques'],
  outputs = ARRAY['Maquettes', 'Wireframes', 'Prototypes', 'Guidelines design', 'Système design']
WHERE name = 'Designer UX/UI';

-- Responsable Marketing
UPDATE hr_profiles 
SET 
  inputs = ARRAY['Objectifs business', 'Cible utilisateur', 'Budget marketing'],
  outputs = ARRAY['Stratégie marketing', 'Plan communication', 'Campagnes', 'Analyse performance']
WHERE name = 'Responsable Marketing';

-- Product Owner
UPDATE hr_profiles 
SET 
  inputs = ARRAY['Vision produit', 'Feedback utilisateurs', 'Objectifs business'],
  outputs = ARRAY['User stories', 'Backlog produit', 'Roadmap', 'Validation fonctionnalités']
WHERE name = 'Product Owner';

-- Scrum Master
UPDATE hr_profiles 
SET 
  inputs = ARRAY['Équipe développement', 'Processus agile', 'Blocages équipe'],
  outputs = ARRAY['Facilitation réunions', 'Amélioration continue', 'Coordination équipe', 'Résolution blocages']
WHERE name = 'Scrum Master';

-- DevOps Engineer
UPDATE hr_profiles 
SET 
  inputs = ARRAY['Code application', 'Requirements infrastructure', 'Contraintes sécurité'],
  outputs = ARRAY['Infrastructure', 'Pipeline CI/CD', 'Monitoring', 'Déploiement automatisé']
WHERE name = 'DevOps Engineer';

-- QA Tester
UPDATE hr_profiles 
SET 
  inputs = ARRAY['Spécifications', 'Code application', 'User stories'],
  outputs = ARRAY['Plan de test', 'Tests fonctionnels', 'Rapports bugs', 'Validation qualité']
WHERE name = 'QA Tester';

-- Data Analyst
UPDATE hr_profiles 
SET 
  inputs = ARRAY['Données brutes', 'Objectifs business', 'Questions métier'],
  outputs = ARRAY['Analyses données', 'Tableaux de bord', 'Recommandations', 'Métriques performance']
WHERE name = 'Data Analyst';