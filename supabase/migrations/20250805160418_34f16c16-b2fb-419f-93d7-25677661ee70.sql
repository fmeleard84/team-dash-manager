-- Remove foreign key constraint from projects table
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_user_id_fkey;

-- Change user_id column to text to store Keycloak user IDs directly
ALTER TABLE public.projects ALTER COLUMN user_id TYPE text;