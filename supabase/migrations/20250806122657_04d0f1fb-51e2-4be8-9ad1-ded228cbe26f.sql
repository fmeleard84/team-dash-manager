-- Fix the function security warning
CREATE OR REPLACE FUNCTION public.debug_jwt_claims()
RETURNS jsonb AS $$
BEGIN
  RETURN current_setting('request.jwt.claims'::text, true)::jsonb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public;