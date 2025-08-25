-- Ajouter la colonne description à la table client_team_members
-- Exécutez ce script dans l'éditeur SQL de Supabase

ALTER TABLE public.client_team_members 
ADD COLUMN IF NOT EXISTS description TEXT;