-- Create a junction table to link hr_profiles (jobs/métiers) with hr_expertises
-- This allows each job profile to have specific relevant expertises

CREATE TABLE public.hr_profile_expertises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.hr_profiles(id) ON DELETE CASCADE,
  expertise_id UUID NOT NULL REFERENCES public.hr_expertises(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(profile_id, expertise_id)
);

-- Enable RLS
ALTER TABLE public.hr_profile_expertises ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view profile expertises" 
ON public.hr_profile_expertises 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can manage profile expertises" 
ON public.hr_profile_expertises 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Add trigger for updated_at
CREATE TRIGGER update_hr_profile_expertises_updated_at
BEFORE UPDATE ON public.hr_profile_expertises
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some initial associations

-- Développeur Frontend expertises
INSERT INTO public.hr_profile_expertises (profile_id, expertise_id) 
SELECT 
  (SELECT id FROM public.hr_profiles WHERE name = 'Développeur Frontend'),
  id 
FROM public.hr_expertises 
WHERE name IN ('JavaScript', 'React', 'Vue.js');

-- Développeur Backend expertises  
INSERT INTO public.hr_profile_expertises (profile_id, expertise_id)
SELECT 
  (SELECT id FROM public.hr_profiles WHERE name = 'Développeur Backend'),
  id 
FROM public.hr_expertises 
WHERE name IN ('PHP', 'Node.js', 'Python');

-- Développeur Full-Stack expertises (combines both)
INSERT INTO public.hr_profile_expertises (profile_id, expertise_id)
SELECT 
  (SELECT id FROM public.hr_profiles WHERE name = 'Développeur Full-Stack'),
  id 
FROM public.hr_expertises 
WHERE name IN ('JavaScript', 'React', 'Vue.js', 'PHP', 'Node.js', 'Python');

-- Project management expertises
INSERT INTO public.hr_profile_expertises (profile_id, expertise_id)
SELECT 
  p.id as profile_id,
  e.id as expertise_id
FROM public.hr_profiles p
CROSS JOIN public.hr_expertises e
WHERE p.name IN ('Project Manager', 'Chef de projet senior', 'Scrum Master')
  AND e.name IN ('Agile', 'Scrum', 'Kanban', 'Jira');

-- Marketing expertises
INSERT INTO public.hr_profile_expertises (profile_id, expertise_id)
SELECT 
  p.id as profile_id,
  e.id as expertise_id
FROM public.hr_profiles p
CROSS JOIN public.hr_expertises e
WHERE p.name IN ('Chef de projet marketing', 'Directeur marketing', 'Stratégiste marketing')
  AND e.name IN ('Google Ads', 'SEO', 'Social Media', 'Content Marketing');

-- Accounting/Finance expertises
INSERT INTO public.hr_profile_expertises (profile_id, expertise_id)
SELECT 
  p.id as profile_id,
  e.id as expertise_id
FROM public.hr_profiles p
CROSS JOIN public.hr_expertises e
WHERE p.name IN ('Expert-comptable', 'Comptable senior', 'Assistant comptable')
  AND e.name IN ('Sage', 'Excel', 'Fiscalité');

-- Finance expertises  
INSERT INTO public.hr_profile_expertises (profile_id, expertise_id)
SELECT 
  p.id as profile_id,
  e.id as expertise_id
FROM public.hr_profiles p
CROSS JOIN public.hr_expertises e
WHERE p.name IN ('Analyste financier', 'Directeur financier', 'Contrôleur de gestion')
  AND e.name IN ('SAP', 'Power BI', 'Analyse financière', 'Excel');