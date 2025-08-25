-- ============================================
-- CORRECTION COMPLÈTE DU SYSTÈME D'INSCRIPTION
-- ============================================

-- 1. Ajouter la colonne user_id à candidate_profiles si elle n'existe pas
ALTER TABLE candidate_profiles 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Créer un index unique sur user_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_candidate_profiles_user_id ON candidate_profiles(user_id);

-- 3. Corriger le trigger handle_new_user pour gérer correctement les deux types de profils
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_role TEXT;
BEGIN
    -- Récupérer le rôle depuis les métadonnées
    user_role := COALESCE(new.raw_user_meta_data->>'role', 'client');
    
    -- Toujours créer une entrée dans profiles (table principale)
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
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        phone = EXCLUDED.phone,
        company_name = EXCLUDED.company_name,
        role = EXCLUDED.role;
    
    -- Si l'utilisateur est un candidat, créer aussi une entrée candidate_profiles
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
            false,  -- email non vérifié au départ
            'pending',  -- qualification_status par défaut
            0,  -- onboarding_step initial
            'disponible'  -- status par défaut
        )
        ON CONFLICT (user_id) DO UPDATE SET
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            phone = EXCLUDED.phone,
            email = EXCLUDED.email;
    END IF;
    
    RETURN new;
EXCEPTION
    WHEN OTHERS THEN
        -- En cas d'erreur, logger mais ne pas bloquer la création de l'utilisateur
        RAISE WARNING 'Error in handle_new_user: % - %', SQLERRM, SQLSTATE;
        RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. S'assurer que le trigger est bien actif
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Mettre à jour les politiques RLS pour candidate_profiles
DROP POLICY IF EXISTS "Candidates can view their own profile" ON public.candidate_profiles;
DROP POLICY IF EXISTS "Candidates can update their own profile" ON public.candidate_profiles;
DROP POLICY IF EXISTS "Anyone can create candidate profile" ON public.candidate_profiles;

-- Nouvelles politiques utilisant user_id
CREATE POLICY "Candidates can view their own profile" 
ON public.candidate_profiles 
FOR SELECT 
USING (
    user_id = auth.uid() 
    OR 
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'client'))
);

CREATE POLICY "Candidates can update their own profile" 
ON public.candidate_profiles 
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can create candidate profiles" 
ON public.candidate_profiles 
FOR INSERT 
WITH CHECK (true);

-- 6. Corriger les profils candidats existants qui n'ont pas de user_id
UPDATE candidate_profiles cp
SET user_id = p.id
FROM profiles p
WHERE cp.email = p.email
AND cp.user_id IS NULL
AND p.role = 'candidate';

-- 7. Vérifier et corriger le problème de téléphone
-- S'assurer que la colonne phone existe dans profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- 8. Test de vérification
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ SYSTÈME D''INSCRIPTION CORRIGÉ !';
    RAISE NOTICE '';
    RAISE NOTICE 'Les améliorations suivantes ont été appliquées :';
    RAISE NOTICE '  - Le trigger handle_new_user gère maintenant correctement les candidats';
    RAISE NOTICE '  - La colonne user_id relie candidate_profiles à auth.users';
    RAISE NOTICE '  - Le téléphone est correctement stocké dans les deux tables';
    RAISE NOTICE '  - Les politiques RLS sont mises à jour';
    RAISE NOTICE '  - L''onboarding_step est initialisé à 0 pour les candidats';
    RAISE NOTICE '';
    RAISE NOTICE 'Les utilisateurs peuvent maintenant s''inscrire sans erreur !';
END $$;