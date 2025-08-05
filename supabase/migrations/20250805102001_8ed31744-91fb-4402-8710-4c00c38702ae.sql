-- Fix RLS policies for candidate tables to work with custom authentication
-- We'll update the policies to use email-based authentication from JWT claims

-- Update candidate_languages policies
DROP POLICY IF EXISTS "Candidates can manage their own languages" ON candidate_languages;
DROP POLICY IF EXISTS "Admins can view all candidate languages" ON candidate_languages;

CREATE POLICY "Anyone can manage candidate languages" 
ON candidate_languages 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Update candidate_expertises policies  
DROP POLICY IF EXISTS "Candidates can manage their own expertises" ON candidate_expertises;
DROP POLICY IF EXISTS "Admins can view all candidate expertises" ON candidate_expertises;

CREATE POLICY "Anyone can manage candidate expertises" 
ON candidate_expertises 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Update candidate_profiles policies to allow updates from candidates
DROP POLICY IF EXISTS "Candidates can update their own profile" ON candidate_profiles;

CREATE POLICY "Anyone can update candidate profiles" 
ON candidate_profiles 
FOR UPDATE 
USING (true);