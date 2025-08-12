
-- Autoriser l'accès aux profils clients via l'en-tête Keycloak (x-keycloak-sub)

-- SELECT: Clients can view their own profile (ajout de l'alternative via headers)
ALTER POLICY "Clients can view their own profile"
ON public.client_profiles
FOR SELECT
USING (
  (keycloak_user_id = ((current_setting('request.jwt.claims', true))::json ->> 'sub'))
  OR (keycloak_user_id = ((current_setting('request.headers', true))::jsonb ->> 'x-keycloak-sub'))
);

-- UPDATE: Clients can update their own profile (ajout de l'alternative via headers)
ALTER POLICY "Clients can update their own profile"
ON public.client_profiles
FOR UPDATE
USING (
  (keycloak_user_id = ((current_setting('request.jwt.claims', true))::json ->> 'sub'))
  OR (keycloak_user_id = ((current_setting('request.headers', true))::jsonb ->> 'x-keycloak-sub'))
)
WITH CHECK (
  (keycloak_user_id = ((current_setting('request.jwt.claims', true))::json ->> 'sub'))
  OR (keycloak_user_id = ((current_setting('request.headers', true))::jsonb ->> 'x-keycloak-sub'))
);
