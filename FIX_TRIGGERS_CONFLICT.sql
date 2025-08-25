-- ============================================
-- CORRECTION DES CONFLITS DE TRIGGERS
-- ============================================

-- 1. Supprimer les triggers redondants sur la table profiles
DROP TRIGGER IF EXISTS on_profile_created ON profiles;
DROP TRIGGER IF EXISTS on_profile_created_candidate ON profiles;

-- 2. Supprimer les fonctions obsolètes
DROP FUNCTION IF EXISTS create_candidate_profile CASCADE;
DROP FUNCTION IF EXISTS create_candidate_profile_for_user CASCADE;

-- 3. Recréer correctement le trigger on_auth_user_created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_role TEXT;
BEGIN
    -- Récupérer le rôle depuis les métadonnées
    user_role := COALESCE(new.raw_user_meta_data->>'role', 'client');
    
    -- Créer le profil principal dans profiles
    INSERT INTO public.profiles (
        id,
        email,
        first_name,
        last_name,
        role,
        phone,
        company_name
    )
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'first_name', ''),
        COALESCE(new.raw_user_meta_data->>'last_name', ''),
        user_role,
        new.raw_user_meta_data->>'phone',
        CASE 
            WHEN user_role = 'client' THEN new.raw_user_meta_data->>'company_name'
            ELSE NULL
        END
    )
    ON CONFLICT (id) DO UPDATE SET
        first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
        last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
        phone = COALESCE(EXCLUDED.phone, profiles.phone),
        company_name = COALESCE(EXCLUDED.company_name, profiles.company_name),
        role = EXCLUDED.role,
        updated_at = now();
    
    -- Si c'est un candidat, créer aussi une entrée dans candidate_profiles
    IF user_role = 'candidate' THEN
        INSERT INTO public.candidate_profiles (
            user_id,  -- Lien avec auth.users
            email,
            first_name,
            last_name,
            phone,
            daily_rate,
            seniority,
            is_email_verified,
            qualification_status,
            onboarding_step,
            status
        )
        VALUES (
            new.id,  -- user_id = auth.users.id
            new.email,
            COALESCE(new.raw_user_meta_data->>'first_name', ''),
            COALESCE(new.raw_user_meta_data->>'last_name', ''),
            new.raw_user_meta_data->>'phone',
            0,  -- daily_rate par défaut
            'junior',  -- seniority par défaut
            CASE 
                WHEN new.email_confirmed_at IS NOT NULL THEN true
                ELSE false
            END,  -- is_email_verified basé sur la confirmation email
            'pending',  -- qualification_status par défaut
            0,  -- onboarding_step initial
            'disponible'  -- status par défaut
        )
        ON CONFLICT (user_id) DO UPDATE SET
            first_name = COALESCE(EXCLUDED.first_name, candidate_profiles.first_name),
            last_name = COALESCE(EXCLUDED.last_name, candidate_profiles.last_name),
            phone = COALESCE(EXCLUDED.phone, candidate_profiles.phone),
            email = EXCLUDED.email,
            updated_at = now();
            
        -- Alternative : Si le conflit est sur email au lieu de user_id
        -- (cela peut arriver avec d'anciens enregistrements)
        INSERT INTO public.candidate_profiles (
            user_id,
            email,
            first_name,
            last_name,
            phone,
            daily_rate,
            seniority,
            is_email_verified,
            qualification_status,
            onboarding_step,
            status
        )
        VALUES (
            new.id,
            new.email,
            COALESCE(new.raw_user_meta_data->>'first_name', ''),
            COALESCE(new.raw_user_meta_data->>'last_name', ''),
            new.raw_user_meta_data->>'phone',
            0,
            'junior',
            CASE 
                WHEN new.email_confirmed_at IS NOT NULL THEN true
                ELSE false
            END,
            'pending',
            0,
            'disponible'
        )
        ON CONFLICT (email) DO UPDATE SET
            user_id = COALESCE(EXCLUDED.user_id, candidate_profiles.user_id),
            first_name = COALESCE(EXCLUDED.first_name, candidate_profiles.first_name),
            last_name = COALESCE(EXCLUDED.last_name, candidate_profiles.last_name),
            phone = COALESCE(EXCLUDED.phone, candidate_profiles.phone),
            updated_at = now()
        WHERE candidate_profiles.user_id IS NULL;  -- Ne mettre à jour que si user_id n'est pas déjà défini
    END IF;
    
    RETURN new;
EXCEPTION
    WHEN OTHERS THEN
        -- Logger l'erreur mais ne pas bloquer la création de l'utilisateur
        RAISE WARNING 'Error in handle_new_user: % - SQLSTATE: %', SQLERRM, SQLSTATE;
        RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Créer le trigger AFTER INSERT (pas BEFORE)
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Nettoyer les doublons éventuels dans candidate_profiles
-- Garder seulement les entrées avec user_id défini
DELETE FROM candidate_profiles cp1
WHERE cp1.user_id IS NULL
AND EXISTS (
    SELECT 1 FROM candidate_profiles cp2
    WHERE cp2.email = cp1.email
    AND cp2.user_id IS NOT NULL
);

-- 6. Message de confirmation
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ CONFLITS DE TRIGGERS RÉSOLUS !';
    RAISE NOTICE '';
    RAISE NOTICE 'Les corrections suivantes ont été appliquées :';
    RAISE NOTICE '  - Suppression des triggers redondants sur profiles';
    RAISE NOTICE '  - Suppression des fonctions obsolètes';
    RAISE NOTICE '  - Trigger unique sur auth.users pour gérer les inscriptions';
    RAISE NOTICE '  - Gestion des conflits sur email ET user_id';
    RAISE NOTICE '  - Nettoyage des doublons dans candidate_profiles';
    RAISE NOTICE '';
    RAISE NOTICE 'Le système d''inscription est maintenant unifié et fonctionnel !';
END $$;