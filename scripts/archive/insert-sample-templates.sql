-- Insérer des données d'exemple complètes pour les templates
-- À exécuter après avoir créé les tables templates

-- Vider les tables existantes (optionnel)
DELETE FROM project_templates;
DELETE FROM template_categories;

-- Insérer les catégories
INSERT INTO template_categories (name, description, icon, color, order_index) VALUES
('Communication', 'Templates pour projets de communication et marketing digital', 'MessageSquare', 'from-purple-600 to-pink-600', 1),
('Technique', 'Templates pour projets de développement et technique', 'Cloud', 'from-blue-600 to-cyan-600', 2),
('Finance & Compta', 'Templates pour projets financiers et comptables', 'Receipt', 'from-green-600 to-emerald-600', 3);

-- Insérer les templates avec les données ReactFlow créées
INSERT INTO project_templates (category_id, name, description, reactflow_data, estimated_duration, estimated_cost, complexity_level, tags, order_index) VALUES

-- Templates Communication
(
  (SELECT id FROM template_categories WHERE name = 'Communication'),
  'Animation réseaux sociaux',
  'Équipe complète pour l''animation et la gestion de vos réseaux sociaux avec analytics',
  '{
    "nodes": [
      {
        "id": "1",
        "type": "custom",
        "position": { "x": 100, "y": 100 },
        "data": {
          "label": "Community Manager",
          "role": "Community Manager",
          "skills": ["Social Media", "Content Creation", "Analytics"],
          "description": "Gestion quotidienne des réseaux sociaux"
        }
      },
      {
        "id": "2", 
        "type": "custom",
        "position": { "x": 350, "y": 50 },
        "data": {
          "label": "Graphiste",
          "role": "Graphic Designer", 
          "skills": ["Design", "Photoshop", "Illustrator"],
          "description": "Création de visuels et contenus graphiques"
        }
      },
      {
        "id": "3",
        "type": "custom", 
        "position": { "x": 350, "y": 200 },
        "data": {
          "label": "Rédacteur",
          "role": "Content Writer",
          "skills": ["Writing", "SEO", "Storytelling"],
          "description": "Rédaction de contenus engageants"
        }
      },
      {
        "id": "4",
        "type": "custom",
        "position": { "x": 600, "y": 125 },
        "data": {
          "label": "Social Media Analyst",
          "role": "Data Analyst",
          "skills": ["Analytics", "Reporting", "KPIs"],
          "description": "Analyse des performances et ROI"
        }
      }
    ],
    "edges": [
      {
        "id": "e1-2",
        "source": "1",
        "target": "2", 
        "label": "Collaboration créative",
        "type": "smoothstep"
      },
      {
        "id": "e1-3",
        "source": "1",
        "target": "3",
        "label": "Coordination éditoriale", 
        "type": "smoothstep"
      },
      {
        "id": "e1-4",
        "source": "1",
        "target": "4",
        "label": "Suivi performances",
        "type": "smoothstep"
      },
      {
        "id": "e2-4", 
        "source": "2",
        "target": "4",
        "label": "Analytics visuels",
        "type": "smoothstep"
      },
      {
        "id": "e3-4",
        "source": "3", 
        "target": "4",
        "label": "Analytics contenus",
        "type": "smoothstep"
      }
    ]
  }',
  30,
  3500,
  'easy',
  ARRAY['social media', 'content', 'marketing', 'analytics'],
  1
),

-- Templates Technique
(
  (SELECT id FROM template_categories WHERE name = 'Technique'),
  'Création site web',
  'Équipe complète pour créer votre site web professionnel avec architecture moderne',
  '{
    "nodes": [
      {
        "id": "1",
        "type": "custom",
        "position": { "x": 100, "y": 150 },
        "data": {
          "label": "Chef de projet",
          "role": "Project Manager",
          "skills": ["Management", "Planning", "Communication"],
          "description": "Coordination générale et suivi du projet"
        }
      },
      {
        "id": "2",
        "type": "custom", 
        "position": { "x": 350, "y": 50 },
        "data": {
          "label": "UX/UI Designer",
          "role": "UX/UI Designer",
          "skills": ["Figma", "User Research", "Prototyping"],
          "description": "Conception de l''expérience utilisateur"
        }
      },
      {
        "id": "3",
        "type": "custom",
        "position": { "x": 350, "y": 200 },
        "data": {
          "label": "Développeur Frontend", 
          "role": "Frontend Developer",
          "skills": ["React", "TypeScript", "CSS"],
          "description": "Développement de l''interface utilisateur"
        }
      },
      {
        "id": "4",
        "type": "custom",
        "position": { "x": 600, "y": 125 },
        "data": {
          "label": "Développeur Backend",
          "role": "Backend Developer", 
          "skills": ["Node.js", "PostgreSQL", "API"],
          "description": "Développement serveur et base de données"
        }
      },
      {
        "id": "5",
        "type": "custom",
        "position": { "x": 850, "y": 150 },
        "data": {
          "label": "DevOps Engineer",
          "role": "DevOps Engineer",
          "skills": ["Docker", "AWS", "CI/CD"],
          "description": "Déploiement et infrastructure"
        }
      }
    ],
    "edges": [
      {
        "id": "e1-2",
        "source": "1",
        "target": "2",
        "label": "Brief & validation",
        "type": "smoothstep"
      },
      {
        "id": "e1-3", 
        "source": "1",
        "target": "3",
        "label": "Coordination dev",
        "type": "smoothstep"
      },
      {
        "id": "e1-4",
        "source": "1",
        "target": "4", 
        "label": "Management technique",
        "type": "smoothstep"
      },
      {
        "id": "e2-3",
        "source": "2",
        "target": "3",
        "label": "Design System",
        "type": "smoothstep"
      },
      {
        "id": "e3-4",
        "source": "3",
        "target": "4",
        "label": "Intégration API", 
        "type": "smoothstep"
      },
      {
        "id": "e4-5",
        "source": "4",
        "target": "5",
        "label": "Déploiement",
        "type": "smoothstep"
      }
    ]
  }',
  60,
  8500,
  'medium',
  ARRAY['web development', 'frontend', 'backend', 'design', 'devops'],
  1
),

(
  (SELECT id FROM template_categories WHERE name = 'Technique'),
  'Application mobile',
  'Développement d''application mobile cross-platform avec React Native',
  '{
    "nodes": [
      {
        "id": "1",
        "type": "custom",
        "position": { "x": 100, "y": 150 },
        "data": {
          "label": "Product Owner",
          "role": "Product Owner",
          "skills": ["Product Strategy", "User Stories", "Roadmap"],
          "description": "Définition des besoins et priorités"
        }
      },
      {
        "id": "2",
        "type": "custom",
        "position": { "x": 350, "y": 100 },
        "data": {
          "label": "Mobile Designer",
          "role": "Mobile UI/UX Designer", 
          "skills": ["Mobile Design", "Prototyping", "User Testing"],
          "description": "Design spécialisé mobile"
        }
      },
      {
        "id": "3",
        "type": "custom",
        "position": { "x": 350, "y": 200 },
        "data": {
          "label": "Développeur React Native",
          "role": "Mobile Developer",
          "skills": ["React Native", "JavaScript", "Mobile APIs"],
          "description": "Développement cross-platform"
        }
      },
      {
        "id": "4",
        "type": "custom", 
        "position": { "x": 600, "y": 150 },
        "data": {
          "label": "Backend Developer",
          "role": "Backend Developer",
          "skills": ["Node.js", "API REST", "Database"],
          "description": "API et services backend"
        }
      },
      {
        "id": "5",
        "type": "custom",
        "position": { "x": 350, "y": 300 },
        "data": {
          "label": "QA Tester",
          "role": "QA Engineer", 
          "skills": ["Testing", "Bug Tracking", "Test Automation"],
          "description": "Tests et assurance qualité"
        }
      }
    ],
    "edges": [
      {
        "id": "e1-2",
        "source": "1",
        "target": "2",
        "label": "Specs fonctionnelles",
        "type": "smoothstep"
      },
      {
        "id": "e1-3",
        "source": "1", 
        "target": "3",
        "label": "User Stories",
        "type": "smoothstep"
      },
      {
        "id": "e2-3",
        "source": "2",
        "target": "3",
        "label": "Maquettes & Assets",
        "type": "smoothstep" 
      },
      {
        "id": "e3-4",
        "source": "3",
        "target": "4",
        "label": "Intégrations API",
        "type": "smoothstep"
      },
      {
        "id": "e3-5",
        "source": "3",
        "target": "5", 
        "label": "Builds de test",
        "type": "smoothstep"
      },
      {
        "id": "e5-1",
        "source": "5",
        "target": "1",
        "label": "Feedback qualité",
        "type": "smoothstep"
      }
    ]
  }',
  90,
  12000,
  'hard',
  ARRAY['mobile', 'react native', 'cross-platform', 'qa'],
  2
),

-- Template Finance
(
  (SELECT id FROM template_categories WHERE name = 'Finance & Compta'),
  'Audit financier',
  'Équipe d''audit comptable et financier pour PME/ETI',
  '{
    "nodes": [
      {
        "id": "1",
        "type": "custom",
        "position": { "x": 100, "y": 150 },
        "data": {
          "label": "Directeur de mission",
          "role": "Audit Manager",
          "skills": ["Audit", "Management", "Normes comptables"],
          "description": "Pilotage global de la mission d''audit"
        }
      },
      {
        "id": "2",
        "type": "custom",
        "position": { "x": 350, "y": 100 },
        "data": {
          "label": "Senior Auditeur",
          "role": "Senior Auditor",
          "skills": ["Comptabilité", "Contrôle interne", "Analyse financière"],
          "description": "Supervision des travaux d''audit"
        }
      },
      {
        "id": "3",
        "type": "custom",
        "position": { "x": 350, "y": 200 },
        "data": {
          "label": "Auditeur Junior",
          "role": "Junior Auditor",
          "skills": ["Révision comptable", "Tests de détail", "Documentation"],
          "description": "Exécution des contrôles détaillés"
        }
      },
      {
        "id": "4",
        "type": "custom",
        "position": { "x": 600, "y": 150 },
        "data": {
          "label": "Expert-comptable",
          "role": "Chartered Accountant",
          "skills": ["Expertise comptable", "Fiscalité", "Conseil"],
          "description": "Validation technique et conformité"
        }
      }
    ],
    "edges": [
      {
        "id": "e1-2",
        "source": "1",
        "target": "2",
        "label": "Supervision",
        "type": "smoothstep"
      },
      {
        "id": "e2-3",
        "source": "2",
        "target": "3",
        "label": "Encadrement",
        "type": "smoothstep"
      },
      {
        "id": "e1-4",
        "source": "1",
        "target": "4",
        "label": "Validation technique",
        "type": "smoothstep"
      },
      {
        "id": "e2-4",
        "source": "2",
        "target": "4",
        "label": "Coordination",
        "type": "smoothstep"
      }
    ]
  }',
  45,
  6500,
  'medium',
  ARRAY['audit', 'comptabilité', 'finance', 'conformité'],
  1
);

-- Vérifier les données insérées
SELECT 
  tc.name as category,
  pt.name as template,
  pt.estimated_duration,
  pt.estimated_cost,
  pt.complexity_level
FROM template_categories tc
JOIN project_templates pt ON tc.id = pt.category_id
ORDER BY tc.order_index, pt.order_index;