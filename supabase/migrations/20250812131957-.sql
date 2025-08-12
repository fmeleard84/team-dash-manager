-- Update RLS policies to accept x-keycloak-email header as identity for candidates

-- 1) candidate_profiles: SELECT should allow header email
ALTER POLICY "Candidates can view their own profile"
ON public.candidate_profiles
FOR SELECT
USING (
  (email = ((current_setting('request.jwt.claims', true))::json ->> 'email'))
  OR (email = ((current_setting('request.headers', true))::jsonb ->> 'x-keycloak-email'))
);

-- 2) candidate_profiles: UPDATE status should allow header email too
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

-- 3) candidate_project_assignments: SELECT/UPDATE should allow header email via join to candidate_profiles
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

-- 4) candidate_reviews: SELECT should allow header email via join to candidate_profiles
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
