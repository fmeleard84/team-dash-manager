-- Create candidate profiles table
CREATE TABLE public.candidate_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  is_email_verified BOOLEAN NOT NULL DEFAULT false,
  email_verification_code TEXT,
  verification_code_expires_at TIMESTAMP WITH TIME ZONE,
  daily_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  seniority hr_seniority NOT NULL DEFAULT 'junior',
  category_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (category_id) REFERENCES hr_categories(id)
);

-- Create candidate languages table (many-to-many)
CREATE TABLE public.candidate_languages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL,
  language_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (candidate_id) REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (language_id) REFERENCES hr_languages(id),
  UNIQUE(candidate_id, language_id)
);

-- Create candidate expertises table (many-to-many)
CREATE TABLE public.candidate_expertises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL,
  expertise_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (candidate_id) REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (expertise_id) REFERENCES hr_expertises(id),
  UNIQUE(candidate_id, expertise_id)
);

-- Create candidate project assignments table
CREATE TABLE public.candidate_project_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL,
  project_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, rejected, completed
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (candidate_id) REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Enable RLS on all tables
ALTER TABLE public.candidate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_expertises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_project_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for candidate_profiles
CREATE POLICY "Candidates can view their own profile" 
ON public.candidate_profiles 
FOR SELECT 
USING (email = current_setting('request.jwt.claims', true)::json->>'email');

CREATE POLICY "Candidates can update their own profile" 
ON public.candidate_profiles 
FOR UPDATE 
USING (email = current_setting('request.jwt.claims', true)::json->>'email');

CREATE POLICY "Anyone can create candidate profile" 
ON public.candidate_profiles 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view all candidate profiles" 
ON public.candidate_profiles 
FOR SELECT 
USING (true);

-- RLS Policies for candidate_languages
CREATE POLICY "Candidates can manage their own languages" 
ON public.candidate_languages 
FOR ALL 
USING (candidate_id IN (
  SELECT id FROM candidate_profiles 
  WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
));

CREATE POLICY "Admins can view all candidate languages" 
ON public.candidate_languages 
FOR SELECT 
USING (true);

-- RLS Policies for candidate_expertises
CREATE POLICY "Candidates can manage their own expertises" 
ON public.candidate_expertises 
FOR ALL 
USING (candidate_id IN (
  SELECT id FROM candidate_profiles 
  WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
));

CREATE POLICY "Admins can view all candidate expertises" 
ON public.candidate_expertises 
FOR SELECT 
USING (true);

-- RLS Policies for candidate_project_assignments
CREATE POLICY "Candidates can view their own assignments" 
ON public.candidate_project_assignments 
FOR SELECT 
USING (candidate_id IN (
  SELECT id FROM candidate_profiles 
  WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
));

CREATE POLICY "Candidates can update their own assignments" 
ON public.candidate_project_assignments 
FOR UPDATE 
USING (candidate_id IN (
  SELECT id FROM candidate_profiles 
  WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
));

CREATE POLICY "Admins can manage all assignments" 
ON public.candidate_project_assignments 
FOR ALL 
USING (true);

-- Create triggers for updated_at
CREATE TRIGGER update_candidate_profiles_updated_at
BEFORE UPDATE ON public.candidate_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_candidate_project_assignments_updated_at
BEFORE UPDATE ON public.candidate_project_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();