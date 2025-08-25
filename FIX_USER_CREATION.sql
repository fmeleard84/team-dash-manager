-- ⚠️ IMPORTANT: Exécutez ce script dans le dashboard Supabase SQL Editor
-- Go to: https://supabase.com/dashboard/project/egdelmcijszuapcpglsy/sql/new

-- ========================================
-- CORRIGER LA FONCTION handle_new_user
-- ========================================
-- La fonction doit gérer les colonnes obligatoires de candidate_profiles

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- Créer le profil principal
    INSERT INTO public.profiles (
        id,
        email,
        first_name,
        last_name,
        phone,
        company_name,
        role
    )
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'first_name', ''),
        COALESCE(new.raw_user_meta_data->>'last_name', ''),
        new.raw_user_meta_data->>'phone',
        new.raw_user_meta_data->>'company_name',
        COALESCE(new.raw_user_meta_data->>'role', 'client')
    )
    ON CONFLICT (id) DO UPDATE SET
        phone = COALESCE(EXCLUDED.phone, profiles.phone),
        company_name = COALESCE(EXCLUDED.company_name, profiles.company_name),
        first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
        last_name = COALESCE(EXCLUDED.last_name, profiles.last_name);
    
    -- Si c'est un candidat, créer son profil candidat
    IF new.raw_user_meta_data->>'role' = 'candidate' THEN
        INSERT INTO public.candidate_profiles (
            email,
            password_hash,  -- Valeur par défaut pour éviter l'erreur NOT NULL
            first_name,
            last_name,
            phone,
            qualification_status,
            onboarding_step,
            profile_id  -- Peut être NULL au début, sera défini pendant l'onboarding
        )
        VALUES (
            new.email,
            '',  -- Password_hash vide car l'auth est gérée par Supabase Auth
            COALESCE(new.raw_user_meta_data->>'first_name', ''),
            COALESCE(new.raw_user_meta_data->>'last_name', ''),
            new.raw_user_meta_data->>'phone',
            'pending',
            0,
            NULL  -- profile_id sera défini pendant l'onboarding
        )
        ON CONFLICT (email) DO UPDATE SET
            phone = COALESCE(EXCLUDED.phone, candidate_profiles.phone),
            first_name = COALESCE(EXCLUDED.first_name, candidate_profiles.first_name),
            last_name = COALESCE(EXCLUDED.last_name, candidate_profiles.last_name);
    END IF;
    
    -- Si c'est un client, créer son profil client si la table existe
    IF new.raw_user_meta_data->>'role' = 'client' THEN
        -- Vérifier si la table client_profiles existe
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_profiles') THEN
            INSERT INTO public.client_profiles (
                user_id,
                email,
                first_name,
                last_name,
                phone,
                company_name
            )
            VALUES (
                new.id,
                new.email,
                COALESCE(new.raw_user_meta_data->>'first_name', ''),
                COALESCE(new.raw_user_meta_data->>'last_name', ''),
                new.raw_user_meta_data->>'phone',
                new.raw_user_meta_data->>'company_name'
            )
            ON CONFLICT (email) DO UPDATE SET
                phone = COALESCE(EXCLUDED.phone, client_profiles.phone),
                company_name = COALESCE(EXCLUDED.company_name, client_profiles.company_name),
                first_name = COALESCE(EXCLUDED.first_name, client_profiles.first_name),
                last_name = COALESCE(EXCLUDED.last_name, client_profiles.last_name);
        END IF;
    END IF;
    
    RETURN new;
EXCEPTION
    WHEN OTHERS THEN
        -- Log l'erreur mais ne bloque pas la création de l'utilisateur
        RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
        RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- OPTIONNEL: Rendre password_hash nullable si possible
-- ========================================
-- Si vous voulez simplifier, vous pouvez rendre password_hash nullable
-- car l'authentification est gérée par Supabase Auth, pas par cette colonne

ALTER TABLE candidate_profiles 
ALTER COLUMN password_hash DROP NOT NULL,
ALTER COLUMN password_hash SET DEFAULT '';

-- ========================================
-- VÉRIFICATION
-- ========================================

DO $$
DECLARE
    v_count INTEGER;
    v_nullable BOOLEAN;
BEGIN
    -- Vérifier si password_hash est nullable maintenant
    SELECT is_nullable = 'YES' INTO v_nullable
    FROM information_schema.columns 
    WHERE table_name = 'candidate_profiles' 
    AND column_name = 'password_hash';
    
    RAISE NOTICE 'password_hash nullable: %', v_nullable;
    
    -- Vérifier les contraintes sur candidate_profiles
    SELECT COUNT(*) INTO v_count
    FROM information_schema.columns 
    WHERE table_name = 'candidate_profiles' 
    AND is_nullable = 'NO'
    AND column_name NOT IN ('id', 'email', 'first_name', 'last_name', 'created_at', 'updated_at');
    
    RAISE NOTICE 'Nombre de colonnes NOT NULL (hors id, email, names, dates): %', v_count;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Fonction handle_new_user mise à jour!';
    RAISE NOTICE '✅ La création de nouveaux utilisateurs devrait maintenant fonctionner.';
END $$;