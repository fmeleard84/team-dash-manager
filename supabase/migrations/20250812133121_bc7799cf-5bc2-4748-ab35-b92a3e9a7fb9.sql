
-- Autoriser l'accès aux données Candidat via l'en-tête Keycloak (x-keycloak-email)
-- Sans modifier les autres règles existantes, on étend les politiques pour accepter l'email transmis par header.

-- 1) candidate_profiles: SELECT doit autoriser l'email depuis le header
ALTER POLICY "Candidates can view their own profile"
ON public.candidate_profiles
FOR SELECT
USING (
  (email = ((current_setting('request.jwt.claims', true))::json ->> 'email'))
  OR (email = ((current_setting('request.headers', true))::jsonb ->> 'x-keycloak-email'))
);

-- 2) candidate_profiles: UPDATE status doit aussi autoriser l'email depuis le header
ALTER POLICY "Candidates can update their own status"
ON public.candidate_profiles
FOR UPDATE
USING (
  (email = ((current_setting('request.jwt.claims', true))::json ->> 'email'))
  OR (email = ((current_setting('request.headers', true))::jsonb ->> 'x-keycloak-email'))
)
WITH CHECK (
  (email = ((current_setting('request.jwt.claims', true))::json ->> 'email'))
  OR (email = ((current_setting('request.headers', true))::jsonb ->> 'x-keycloak-email'))
);

-- 3) candidate_project_assignments: SELECT doit autoriser via jointure avec candidate_profiles en utilisant l'email header
ALTER POLICY "Candidates can view their own assignments"
ON public.candidate_project_assignments
FOR SELECT
USING (
  candidate_id IN (
    SELECT cp.id FROM public.candidate_profiles cp
    WHERE (cp.email = ((current_setting('request.jwt.claims', true))::json ->> 'email'))
       OR (cp.email = ((current_setting('request.headers', true))::jsonb ->> 'x-keycloak-email'))
  )
);

-- 3bis) candidate_project_assignments: UPDATE idem
ALTER POLICY "Candidates can update their own assignments"
ON public.candidate_project_assignments
FOR UPDATE
USING (
  candidate_id IN (
    SELECT cp.id FROM public.candidate_profiles cp
    WHERE (cp.email = ((current_setting('request.jwt.claims', true))::json ->> 'email'))
       OR (cp.email = ((current_setting('request.headers', true))::jsonb ->> 'x-keycloak-email'))
  )
);

-- 4) candidate_reviews: SELECT doit autoriser via jointure avec candidate_profiles en utilisant l'email header
ALTER POLICY "Candidates can view their own reviews"
ON public.candidate_reviews
FOR SELECT
USING (
  candidate_id IN (
    SELECT cp.id FROM public.candidate_profiles cp
    WHERE (cp.email = ((current_setting('request.jwt.claims', true))::json ->> 'email'))
       OR (cp.email = ((current_setting('request.headers', true))::jsonb ->> 'x-keycloak-email'))
  )
);
