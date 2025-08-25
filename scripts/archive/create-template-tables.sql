-- Script à exécuter dans l'éditeur SQL de Supabase
-- https://supabase.com/dashboard/project/egdelmcijszuapcpglsy/sql

-- 1. Create template_categories table
CREATE TABLE template_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name varchar(255) NOT NULL,
  description text,
  icon varchar(100),
  color varchar(50),
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create project_templates table
CREATE TABLE project_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id uuid REFERENCES template_categories(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  description text,
  reactflow_data jsonb NOT NULL,
  estimated_duration integer,
  estimated_cost integer,
  complexity_level varchar(20) DEFAULT 'medium',
  tags text[],
  is_active boolean DEFAULT true,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS
ALTER TABLE template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies (everyone can read, only admins can modify)
CREATE POLICY "Everyone can read template categories"
ON template_categories FOR SELECT
USING (true);

CREATE POLICY "Everyone can read project templates"
ON project_templates FOR SELECT
USING (is_active = true);

-- Admin policies (uncomment if you have admin users)
-- CREATE POLICY "Admins can manage template categories"
-- ON template_categories FOR ALL
-- TO authenticated
-- USING (
--   EXISTS (
--     SELECT 1 FROM profiles 
--     WHERE profiles.id = auth.uid() 
--     AND profiles.role = 'admin'
--   )
-- );

-- CREATE POLICY "Admins can manage project templates"
-- ON project_templates FOR ALL
-- TO authenticated
-- USING (
--   EXISTS (
--     SELECT 1 FROM profiles 
--     WHERE profiles.id = auth.uid() 
--     AND profiles.role = 'admin'
--   )
-- );

-- 5. Insert sample data
INSERT INTO template_categories (name, description, icon, color, order_index) VALUES
('Communication', 'Templates pour projets de communication et marketing', 'MessageSquare', 'from-purple-600 to-pink-600', 1),
('Technique', 'Templates pour projets techniques et développement', 'Cloud', 'from-blue-600 to-cyan-600', 2),
('Finance & Compta', 'Templates pour projets financiers et comptables', 'Receipt', 'from-green-600 to-emerald-600', 3);

-- 6. Insert sample templates
INSERT INTO project_templates (category_id, name, description, reactflow_data, estimated_duration, estimated_cost, complexity_level, tags) VALUES
(
  (SELECT id FROM template_categories WHERE name = 'Communication'),
  'Animation réseaux sociaux',
  'Équipe complète pour l''animation et la gestion de vos réseaux sociaux',
  '{
    "nodes": [
      {"id": "1", "type": "custom", "position": {"x": 100, "y": 100}, "data": {"label": "Community Manager", "role": "Community Manager", "skills": ["Social Media", "Content Creation", "Analytics"]}},
      {"id": "2", "type": "custom", "position": {"x": 300, "y": 100}, "data": {"label": "Graphiste", "role": "Graphic Designer", "skills": ["Design", "Photoshop", "Illustrator"]}},
      {"id": "3", "type": "custom", "position": {"x": 200, "y": 250}, "data": {"label": "Rédacteur", "role": "Content Writer", "skills": ["Writing", "SEO", "Storytelling"]}}
    ],
    "edges": [
      {"id": "e1-2", "source": "1", "target": "2", "label": "Collaboration"},
      {"id": "e1-3", "source": "1", "target": "3", "label": "Coordination"}
    ]
  }',
  30,
  3500,
  'easy',
  ARRAY['social media', 'content', 'marketing']
),
(
  (SELECT id FROM template_categories WHERE name = 'Technique'),
  'Création site web',
  'Équipe complète pour créer votre site web professionnel',
  '{
    "nodes": [
      {"id": "1", "type": "custom", "position": {"x": 100, "y": 100}, "data": {"label": "Chef de projet", "role": "Project Manager", "skills": ["Management", "Planning", "Communication"]}},
      {"id": "2", "type": "custom", "position": {"x": 300, "y": 50}, "data": {"label": "UX/UI Designer", "role": "UX/UI Designer", "skills": ["Figma", "User Research", "Prototyping"]}},
      {"id": "3", "type": "custom", "position": {"x": 300, "y": 150}, "data": {"label": "Développeur Frontend", "role": "Frontend Developer", "skills": ["React", "TypeScript", "CSS"]}},
      {"id": "4", "type": "custom", "position": {"x": 500, "y": 100}, "data": {"label": "Développeur Backend", "role": "Backend Developer", "skills": ["Node.js", "PostgreSQL", "API"]}}
    ],
    "edges": [
      {"id": "e1-2", "source": "1", "target": "2", "label": "Briefing"},
      {"id": "e1-3", "source": "1", "target": "3", "label": "Coordination"},
      {"id": "e1-4", "source": "1", "target": "4", "label": "Management"},
      {"id": "e2-3", "source": "2", "target": "3", "label": "Design System"},
      {"id": "e3-4", "source": "3", "target": "4", "label": "API Integration"}
    ]
  }',
  60,
  8500,
  'medium',
  ARRAY['web development', 'frontend', 'backend', 'design']
);

-- 7. Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_template_categories_updated_at 
    BEFORE UPDATE ON template_categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_templates_updated_at 
    BEFORE UPDATE ON project_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();