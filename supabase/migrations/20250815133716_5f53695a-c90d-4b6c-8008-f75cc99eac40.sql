-- Fix search path security warnings for the newly created functions
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS TEXT AS $$
  SELECT COALESCE(
    ((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text),
    ((current_setting('request.headers'::text, true))::jsonb ->> 'x-keycloak-email'::text)
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (((current_setting('request.jwt.claims'::text, true))::jsonb -> 'groups'::text) ? 'admin'::text),
    (((current_setting('request.headers'::text, true))::jsonb ->> 'x-admin-access'::text) = 'true'::text),
    false
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = 'public';