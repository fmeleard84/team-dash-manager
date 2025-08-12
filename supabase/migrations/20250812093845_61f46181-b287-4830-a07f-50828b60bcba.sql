
-- Fix: ensure client_profiles.user_id gets an automatic UUID when not provided
ALTER TABLE public.client_profiles
ALTER COLUMN user_id SET DEFAULT gen_random_uuid();
