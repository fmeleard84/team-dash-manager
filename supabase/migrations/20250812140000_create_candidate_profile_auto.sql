-- Allow automatic creation of candidate profiles via Keycloak headers
-- This policy allows users to create their own profile based on their Keycloak email

-- Create policy for INSERT on candidate_profiles
CREATE POLICY "Users can create their own candidate profile"
ON public.candidate_profiles
FOR INSERT
WITH CHECK (
  -- Allow insertion if the email matches the Keycloak header email
  email = ((current_setting('request.headers', true))::jsonb ->> 'x-keycloak-email')
  OR email = ((current_setting('request.jwt.claims', true))::json ->> 'email')
);

-- Enable RLS on candidate_profiles if not already enabled
ALTER TABLE public.candidate_profiles ENABLE ROW LEVEL SECURITY;