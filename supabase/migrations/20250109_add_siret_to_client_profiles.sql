-- Ajouter la colonne SIRET à client_profiles si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'client_profiles' 
        AND column_name = 'siret'
    ) THEN
        ALTER TABLE public.client_profiles 
        ADD COLUMN siret VARCHAR(14);
        
        COMMENT ON COLUMN public.client_profiles.siret IS 'Numéro SIRET de l''entreprise (14 chiffres)';
    END IF;
END $$;