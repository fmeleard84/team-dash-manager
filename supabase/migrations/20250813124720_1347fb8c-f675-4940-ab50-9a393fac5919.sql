-- Create qualification tests table
CREATE TABLE public.hr_qualification_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  passing_score INTEGER NOT NULL DEFAULT 70,
  max_score INTEGER NOT NULL DEFAULT 100,
  time_limit_minutes INTEGER DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create candidate qualification results table
CREATE TABLE public.candidate_qualification_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL,
  test_id UUID NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  max_score INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'passed', 'failed', 'in_progress')),
  answers JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(candidate_id, test_id)
);

-- Add qualification status to candidate profiles
ALTER TABLE public.candidate_profiles 
ADD COLUMN qualification_status TEXT DEFAULT 'pending' CHECK (qualification_status IN ('pending', 'qualified', 'rejected'));

-- Enable RLS
ALTER TABLE public.hr_qualification_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_qualification_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for qualification tests
CREATE POLICY "Admins can manage qualification tests"
ON public.hr_qualification_tests
FOR ALL
USING (true);

CREATE POLICY "Anyone can view active qualification tests"
ON public.hr_qualification_tests
FOR SELECT
USING (is_active = true);

-- RLS Policies for qualification results
CREATE POLICY "Candidates can view their own results"
ON public.candidate_qualification_results
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM candidate_profiles cp
    WHERE cp.id = candidate_qualification_results.candidate_id
    AND (cp.email = ((current_setting('request.headers', true))::jsonb ->> 'x-keycloak-email')
         OR cp.email = ((current_setting('request.jwt.claims', true))::jsonb ->> 'email'))
  )
);

CREATE POLICY "Candidates can insert their own results"
ON public.candidate_qualification_results
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM candidate_profiles cp
    WHERE cp.id = candidate_qualification_results.candidate_id
    AND (cp.email = ((current_setting('request.headers', true))::jsonb ->> 'x-keycloak-email')
         OR cp.email = ((current_setting('request.jwt.claims', true))::jsonb ->> 'email'))
  )
);

CREATE POLICY "Candidates can update their own results"
ON public.candidate_qualification_results
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM candidate_profiles cp
    WHERE cp.id = candidate_qualification_results.candidate_id
    AND (cp.email = ((current_setting('request.headers', true))::jsonb ->> 'x-keycloak-email')
         OR cp.email = ((current_setting('request.jwt.claims', true))::jsonb ->> 'email'))
  )
);

CREATE POLICY "Admins can manage all qualification results"
ON public.candidate_qualification_results
FOR ALL
USING (
  ((current_setting('request.jwt.claims', true))::jsonb -> 'groups') ? 'admin'
  OR ((current_setting('request.headers', true))::jsonb ->> 'x-admin-access') = 'true'
);

-- Add triggers for updated_at
CREATE TRIGGER update_qualification_tests_updated_at
  BEFORE UPDATE ON public.hr_qualification_tests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_qualification_results_updated_at
  BEFORE UPDATE ON public.candidate_qualification_results
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert demo qualification test
INSERT INTO public.hr_qualification_tests (profile_id, name, description, questions, passing_score, max_score) 
SELECT 
  hp.id,
  'Test de qualification - ' || hp.name,
  'Test de compétences pour valider le profil ' || hp.name,
  '[
    {
      "id": 1,
      "question": "Quelle est votre expérience principale dans ce domaine ?",
      "options": ["Moins de 1 an", "1-3 ans", "3-5 ans", "Plus de 5 ans"],
      "correct_answer": 3,
      "points": 25
    },
    {
      "id": 2,
      "question": "Quel outil utilisez-vous principalement ?",
      "options": ["Outil A", "Outil B", "Outil C", "Outil D"],
      "correct_answer": 1,
      "points": 25
    },
    {
      "id": 3,
      "question": "Comment gérez-vous les projets complexes ?",
      "options": ["Méthode A", "Méthode B", "Méthode C", "Méthode D"],
      "correct_answer": 2,
      "points": 25
    },
    {
      "id": 4,
      "question": "Quelle est votre approche pour résoudre les problèmes ?",
      "options": ["Approche A", "Approche B", "Approche C", "Approche D"],
      "correct_answer": 0,
      "points": 25
    }
  ]'::jsonb,
  70,
  100
FROM public.hr_profiles hp
LIMIT 5;