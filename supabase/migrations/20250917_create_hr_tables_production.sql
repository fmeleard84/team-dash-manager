-- Migration pour créer les tables HR en production
-- Date: 2025-09-17
-- Description: Création des tables hr_categories, hr_profiles et hr_resource_assignments

-- 1. Créer la table hr_categories
CREATE TABLE IF NOT EXISTS public.hr_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insérer les catégories de base
INSERT INTO public.hr_categories (name, description) VALUES
  ('Développement', 'Développeurs, architectes, DevOps'),
  ('Design', 'UX/UI, graphistes, motion designers'),
  ('Marketing', 'Marketing digital, growth, SEO/SEA'),
  ('Gestion de projet', 'Chefs de projet, product owners, scrum masters'),
  ('Data', 'Data scientists, data analysts, data engineers'),
  ('Support', 'Support client, QA, testeurs'),
  ('Commercial', 'Business developers, account managers'),
  ('RH', 'Recruteurs, gestionnaires RH'),
  ('Finance', 'Comptables, contrôleurs de gestion'),
  ('Juridique', 'Juristes, avocats')
ON CONFLICT (name) DO NOTHING;

-- 2. Créer la table hr_profiles
CREATE TABLE IF NOT EXISTS public.hr_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.hr_categories(id) ON DELETE SET NULL,
  base_price DECIMAL(10,2),
  skills TEXT[] DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insérer les profils de base
INSERT INTO public.hr_profiles (name, category_id, base_price, skills)
SELECT
  profile_name,
  (SELECT id FROM hr_categories WHERE name = category_name),
  base_price,
  skills
FROM (VALUES
  ('Développeur Full-Stack', 'Développement', 500, ARRAY['JavaScript', 'React', 'Node.js', 'PostgreSQL']),
  ('Développeur Frontend', 'Développement', 450, ARRAY['React', 'Vue.js', 'TypeScript', 'CSS']),
  ('Développeur Backend', 'Développement', 450, ARRAY['Node.js', 'Python', 'API REST', 'PostgreSQL']),
  ('Développeur Mobile', 'Développement', 500, ARRAY['React Native', 'Flutter', 'iOS', 'Android']),
  ('DevOps', 'Développement', 550, ARRAY['Docker', 'Kubernetes', 'CI/CD', 'AWS']),
  ('UX/UI Designer', 'Design', 400, ARRAY['Figma', 'Sketch', 'Adobe XD', 'Prototypage']),
  ('Product Designer', 'Design', 450, ARRAY['Design Thinking', 'User Research', 'Prototypage']),
  ('Chef de projet', 'Gestion de projet', 600, ARRAY['Agile', 'Scrum', 'Jira', 'Planification']),
  ('Product Owner', 'Gestion de projet', 650, ARRAY['Agile', 'User Stories', 'Roadmap', 'Analytics']),
  ('Scrum Master', 'Gestion de projet', 550, ARRAY['Scrum', 'Agile', 'Facilitation', 'Coaching']),
  ('Data Analyst', 'Data', 500, ARRAY['SQL', 'Python', 'Tableau', 'Analytics']),
  ('Data Scientist', 'Data', 600, ARRAY['Python', 'Machine Learning', 'TensorFlow', 'Statistics']),
  ('Growth Hacker', 'Marketing', 450, ARRAY['SEO', 'SEA', 'Analytics', 'A/B Testing']),
  ('Community Manager', 'Marketing', 350, ARRAY['Social Media', 'Content', 'Engagement']),
  ('Business Developer', 'Commercial', 500, ARRAY['Négociation', 'CRM', 'Prospection']),
  ('Comptable', 'Finance', 400, ARRAY['Comptabilité', 'Excel', 'ERP'])
) AS profiles(profile_name, category_name, base_price, skills)
ON CONFLICT DO NOTHING;

-- 3. Créer la table hr_resource_assignments
CREATE TABLE IF NOT EXISTS public.hr_resource_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.hr_profiles(id) ON DELETE SET NULL,
  candidate_id UUID REFERENCES public.candidate_profiles(id) ON DELETE SET NULL,
  seniority TEXT CHECK (seniority IN ('junior', 'confirmé', 'senior', 'expert')),
  languages TEXT[] DEFAULT '{}',
  expertises TEXT[] DEFAULT '{}',
  calculated_price DECIMAL(10,2),
  booking_status TEXT DEFAULT 'draft' CHECK (booking_status IN ('draft', 'recherche', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ajouter une contrainte unique pour éviter les doublons
ALTER TABLE public.hr_resource_assignments
  ADD CONSTRAINT unique_assignment UNIQUE (project_id, profile_id, candidate_id);

-- 4. Créer les index pour les performances
CREATE INDEX IF NOT EXISTS idx_hr_assignments_project ON public.hr_resource_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_hr_assignments_candidate ON public.hr_resource_assignments(candidate_id);
CREATE INDEX IF NOT EXISTS idx_hr_assignments_profile ON public.hr_resource_assignments(profile_id);
CREATE INDEX IF NOT EXISTS idx_hr_assignments_status ON public.hr_resource_assignments(booking_status);
CREATE INDEX IF NOT EXISTS idx_hr_profiles_category ON public.hr_profiles(category_id);
CREATE INDEX IF NOT EXISTS idx_hr_profiles_name ON public.hr_profiles(name);

-- 5. Activer RLS sur toutes les tables
ALTER TABLE public.hr_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_resource_assignments ENABLE ROW LEVEL SECURITY;

-- 6. Créer les politiques RLS pour hr_categories (lecture publique)
CREATE POLICY "Lecture publique des catégories" ON public.hr_categories
  FOR SELECT
  USING (true);

-- 7. Créer les politiques RLS pour hr_profiles (lecture publique)
CREATE POLICY "Lecture publique des profils" ON public.hr_profiles
  FOR SELECT
  USING (true);

-- 8. Créer les politiques RLS pour hr_resource_assignments
-- Politique pour les candidats (lecture de leurs propres assignments et des offres en recherche)
CREATE POLICY "Candidats peuvent voir les assignments" ON public.hr_resource_assignments
  FOR SELECT
  USING (
    candidate_id = auth.uid() OR
    candidate_id IS NULL OR
    booking_status = 'recherche'
  );

-- Politique pour les clients (tous les droits sur leurs projets)
CREATE POLICY "Clients gèrent leurs assignments" ON public.hr_resource_assignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = hr_resource_assignments.project_id
      AND projects.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = hr_resource_assignments.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Politique pour les candidats (mise à jour du booking_status uniquement)
CREATE POLICY "Candidats peuvent accepter/refuser" ON public.hr_resource_assignments
  FOR UPDATE
  USING (candidate_id = auth.uid())
  WITH CHECK (candidate_id = auth.uid());

-- 9. Créer les fonctions de trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Créer les triggers pour updated_at
CREATE TRIGGER update_hr_profiles_updated_at
  BEFORE UPDATE ON public.hr_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hr_resource_assignments_updated_at
  BEFORE UPDATE ON public.hr_resource_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 11. Grant des permissions nécessaires
GRANT SELECT ON public.hr_categories TO anon, authenticated;
GRANT SELECT ON public.hr_profiles TO anon, authenticated;
GRANT ALL ON public.hr_resource_assignments TO authenticated;

-- Fin de la migration
-- Pour appliquer: npx supabase db push --include-all