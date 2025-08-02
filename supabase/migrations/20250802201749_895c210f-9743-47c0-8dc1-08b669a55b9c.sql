-- Créer le type enum pour la séniorité
CREATE TYPE hr_seniority AS ENUM ('junior', 'intermediate', 'senior');

-- Table des catégories HR
CREATE TABLE public.hr_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des profils HR par catégorie
CREATE TABLE public.hr_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES public.hr_categories(id) ON DELETE CASCADE,
  base_price DECIMAL(10,2) NOT NULL DEFAULT 50.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des langues disponibles
CREATE TABLE public.hr_languages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des expertises par catégorie
CREATE TABLE public.hr_expertises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES public.hr_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des assignations de ressources dans les projets
CREATE TABLE public.hr_resource_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.hr_profiles(id) ON DELETE CASCADE,
  seniority hr_seniority NOT NULL DEFAULT 'junior',
  languages TEXT[] DEFAULT '{}',
  expertises TEXT[] DEFAULT '{}',
  calculated_price DECIMAL(10,2) NOT NULL DEFAULT 50.00,
  node_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, profile_id)
);

-- Activer RLS sur toutes les tables
ALTER TABLE public.hr_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_expertises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_resource_assignments ENABLE ROW LEVEL SECURITY;

-- Policies pour hr_categories (lecture publique, modification admin seulement)
CREATE POLICY "Anyone can view hr_categories" ON public.hr_categories FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage hr_categories" ON public.hr_categories FOR ALL USING (auth.uid() IS NOT NULL);

-- Policies pour hr_profiles
CREATE POLICY "Anyone can view hr_profiles" ON public.hr_profiles FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage hr_profiles" ON public.hr_profiles FOR ALL USING (auth.uid() IS NOT NULL);

-- Policies pour hr_languages
CREATE POLICY "Anyone can view hr_languages" ON public.hr_languages FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage hr_languages" ON public.hr_languages FOR ALL USING (auth.uid() IS NOT NULL);

-- Policies pour hr_expertises
CREATE POLICY "Anyone can view hr_expertises" ON public.hr_expertises FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage hr_expertises" ON public.hr_expertises FOR ALL USING (auth.uid() IS NOT NULL);

-- Policies pour hr_resource_assignments
CREATE POLICY "Users can view their own resource assignments" ON public.hr_resource_assignments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = hr_resource_assignments.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users can manage their own resource assignments" ON public.hr_resource_assignments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = hr_resource_assignments.project_id AND projects.user_id = auth.uid())
);

-- Triggers pour updated_at
CREATE TRIGGER update_hr_categories_updated_at BEFORE UPDATE ON public.hr_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_hr_profiles_updated_at BEFORE UPDATE ON public.hr_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_hr_languages_updated_at BEFORE UPDATE ON public.hr_languages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_hr_expertises_updated_at BEFORE UPDATE ON public.hr_expertises FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_hr_resource_assignments_updated_at BEFORE UPDATE ON public.hr_resource_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ajouter une contrainte unique sur project_id dans project_flows pour éviter l'erreur de sauvegarde
ALTER TABLE public.project_flows ADD CONSTRAINT project_flows_project_id_unique UNIQUE (project_id);

-- Données d'exemple pour les catégories
INSERT INTO public.hr_categories (name) VALUES 
('Marketing'),
('Développement'),
('Gestion de projet'),
('Comptabilité'),
('Finance');

-- Récupérer les IDs des catégories pour les profils
DO $$
DECLARE
    cat_marketing_id UUID;
    cat_dev_id UUID;
    cat_gestion_id UUID;
    cat_compta_id UUID;
    cat_finance_id UUID;
BEGIN
    SELECT id INTO cat_marketing_id FROM public.hr_categories WHERE name = 'Marketing';
    SELECT id INTO cat_dev_id FROM public.hr_categories WHERE name = 'Développement';
    SELECT id INTO cat_gestion_id FROM public.hr_categories WHERE name = 'Gestion de projet';
    SELECT id INTO cat_compta_id FROM public.hr_categories WHERE name = 'Comptabilité';
    SELECT id INTO cat_finance_id FROM public.hr_categories WHERE name = 'Finance';

    -- Profils Marketing
    INSERT INTO public.hr_profiles (name, category_id, base_price) VALUES 
    ('Directeur marketing', cat_marketing_id, 80.00),
    ('Stratégiste marketing', cat_marketing_id, 65.00),
    ('Chef de projet marketing', cat_marketing_id, 55.00);

    -- Profils Développement
    INSERT INTO public.hr_profiles (name, category_id, base_price) VALUES 
    ('Architecte technique', cat_dev_id, 90.00),
    ('Développeur Full-Stack', cat_dev_id, 70.00),
    ('Développeur Frontend', cat_dev_id, 60.00),
    ('Développeur Backend', cat_dev_id, 65.00);

    -- Profils Gestion de projet
    INSERT INTO public.hr_profiles (name, category_id, base_price) VALUES 
    ('Chef de projet senior', cat_gestion_id, 75.00),
    ('Project Manager', cat_gestion_id, 65.00),
    ('Scrum Master', cat_gestion_id, 60.00);

    -- Profils Comptabilité
    INSERT INTO public.hr_profiles (name, category_id, base_price) VALUES 
    ('Expert-comptable', cat_compta_id, 85.00),
    ('Comptable senior', cat_compta_id, 55.00),
    ('Assistant comptable', cat_compta_id, 35.00);

    -- Profils Finance
    INSERT INTO public.hr_profiles (name, category_id, base_price) VALUES 
    ('Directeur financier', cat_finance_id, 95.00),
    ('Analyste financier', cat_finance_id, 70.00),
    ('Contrôleur de gestion', cat_finance_id, 65.00);

    -- Expertises par catégorie
    INSERT INTO public.hr_expertises (name, category_id) VALUES 
    ('Google Ads', cat_marketing_id),
    ('SEO', cat_marketing_id),
    ('Social Media', cat_marketing_id),
    ('Content Marketing', cat_marketing_id),
    ('PHP', cat_dev_id),
    ('JavaScript', cat_dev_id),
    ('React', cat_dev_id),
    ('Vue.js', cat_dev_id),
    ('Node.js', cat_dev_id),
    ('Python', cat_dev_id),
    ('Agile', cat_gestion_id),
    ('Scrum', cat_gestion_id),
    ('Kanban', cat_gestion_id),
    ('Jira', cat_gestion_id),
    ('Sage', cat_compta_id),
    ('Excel', cat_compta_id),
    ('Fiscalité', cat_compta_id),
    ('SAP', cat_finance_id),
    ('Power BI', cat_finance_id),
    ('Analyse financière', cat_finance_id);
END $$;

-- Langues disponibles
INSERT INTO public.hr_languages (name, code) VALUES 
('Français', 'fr'),
('Anglais', 'en'),
('Espagnol', 'es'),
('Allemand', 'de'),
('Italien', 'it'),
('Portugais', 'pt'),
('Chinois', 'zh'),
('Japonais', 'ja'),
('Arabe', 'ar'),
('Russe', 'ru');