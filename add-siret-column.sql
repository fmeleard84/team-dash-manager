-- Ajouter la colonne siret à client_profiles
ALTER TABLE public.client_profiles 
ADD COLUMN IF NOT EXISTS siret VARCHAR(14);

-- Ajouter un commentaire sur la colonne
COMMENT ON COLUMN public.client_profiles.siret IS 'Numéro SIRET de l''entreprise (14 chiffres)';

-- Vérifier que la colonne existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'client_profiles' 
AND column_name = 'siret';