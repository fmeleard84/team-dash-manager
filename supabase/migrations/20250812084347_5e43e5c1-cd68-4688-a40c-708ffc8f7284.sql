-- Add unique indexes required for PostgREST upserts used by edge function
-- These support on_conflict=keycloak_user_id on both tables

-- Ensure unique key for client_profiles.keycloak_user_id
CREATE UNIQUE INDEX IF NOT EXISTS ux_client_profiles_keycloak_user_id
ON public.client_profiles (keycloak_user_id);

-- Ensure unique key for candidate_profiles.keycloak_user_id
CREATE UNIQUE INDEX IF NOT EXISTS ux_candidate_profiles_keycloak_user_id
ON public.candidate_profiles (keycloak_user_id);
