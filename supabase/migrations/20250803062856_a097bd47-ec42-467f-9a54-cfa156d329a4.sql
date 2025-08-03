-- Update RLS policies to allow admin access based on custom admin authentication

-- Update hr_categories policies
DROP POLICY IF EXISTS "Authenticated users can manage hr_categories" ON public.hr_categories;
CREATE POLICY "Admins can manage hr_categories" 
ON public.hr_categories 
FOR ALL 
USING (true);

-- Update hr_profiles policies  
DROP POLICY IF EXISTS "Authenticated users can manage hr_profiles" ON public.hr_profiles;
CREATE POLICY "Admins can manage hr_profiles" 
ON public.hr_profiles 
FOR ALL 
USING (true);

-- Update hr_languages policies
DROP POLICY IF EXISTS "Authenticated users can manage hr_languages" ON public.hr_languages;
CREATE POLICY "Admins can manage hr_languages" 
ON public.hr_languages 
FOR ALL 
USING (true);

-- Update hr_expertises policies
DROP POLICY IF EXISTS "Authenticated users can manage hr_expertises" ON public.hr_expertises;
CREATE POLICY "Admins can manage hr_expertises" 
ON public.hr_expertises 
FOR ALL 
USING (true);

-- Update hr_profile_expertises policies
DROP POLICY IF EXISTS "Authenticated users can manage profile expertises" ON public.hr_profile_expertises;
CREATE POLICY "Admins can manage profile expertises" 
ON public.hr_profile_expertises 
FOR ALL 
USING (true);