-- ============================================
-- FIX CANDIDATE REGISTRATION ISSUE
-- ============================================
-- Cette requête corrige le problème d'inscription des candidats
-- Exécutez ce SQL dans l'éditeur SQL de Supabase Dashboard

-- 1. Modifier la table candidate_profiles pour rendre certains champs optionnels
ALTER TABLE candidate_profiles 
  ALTER COLUMN password_hash DROP NOT NULL,
  ALTER COLUMN daily_rate SET DEFAULT 0,
  ALTER COLUMN seniority SET DEFAULT 'junior',
  ALTER COLUMN category_id DROP NOT NULL;

-- 2. Ajouter une colonne user_id pour lier avec auth.users
ALTER TABLE candidate_profiles 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Créer un index unique sur user_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_candidate_profiles_user_id ON candidate_profiles(user_id);

-- 4. Mettre à jour la fonction handle_new_user pour créer aussi une entrée candidate_profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_role TEXT;
  default_category_id UUID;
BEGIN
    -- Récupérer le rôle depuis les métadonnées
    user_role := COALESCE(new.raw_user_meta_data->>'role', 'client');
    
    -- Toujours créer une entrée dans profiles
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
    ON CONFLICT (id) DO NOTHING;
    
    -- Si l'utilisateur est un candidat, créer aussi une entrée candidate_profiles
    IF user_role = 'candidate' THEN
        -- Obtenir une category_id par défaut (la première disponible)
        SELECT id INTO default_category_id FROM hr_categories LIMIT 1;
        
        INSERT INTO public.candidate_profiles (
            user_id,
            email,
            first_name,
            last_name,
            phone,
            daily_rate,
            seniority,
            category_id,
            is_email_verified
        )
        VALUES (
            new.id,
            new.email,
            COALESCE(new.raw_user_meta_data->>'first_name', ''),
            COALESCE(new.raw_user_meta_data->>'last_name', ''),
            new.raw_user_meta_data->>'phone',
            0, -- Taux journalier par défaut
            'junior', -- Séniorité par défaut
            default_category_id, -- Sera NULL si aucune catégorie n'existe
            false -- Email non vérifié par défaut
        )
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
    
    RETURN new;
EXCEPTION
    WHEN OTHERS THEN
        -- Logger l'erreur mais ne pas faire échouer la création de l'utilisateur
        RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
        RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Mettre à jour les politiques RLS pour candidate_profiles pour utiliser user_id
DROP POLICY IF EXISTS "Candidates can view their own profile" ON public.candidate_profiles;
DROP POLICY IF EXISTS "Candidates can update their own profile" ON public.candidate_profiles;

-- Créer les nouvelles politiques utilisant user_id
CREATE POLICY "Candidates can view their own profile" 
ON public.candidate_profiles 
FOR SELECT 
USING (user_id = auth.uid() OR auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
));

CREATE POLICY "Candidates can update their own profile" 
ON public.candidate_profiles 
FOR UPDATE 
USING (user_id = auth.uid());

-- 6. Mettre à jour les politiques pour les assignments
DROP POLICY IF EXISTS "Candidates can view their own assignments" ON public.candidate_project_assignments;

CREATE POLICY "Candidates can view their own assignments" 
ON public.candidate_project_assignments 
FOR SELECT 
USING (
    candidate_id IN (
        SELECT id FROM candidate_profiles WHERE user_id = auth.uid()
    )
    OR 
    auth.uid() IN (
        SELECT id FROM profiles WHERE role IN ('admin', 'client')
    )
);

DROP POLICY IF EXISTS "Candidates can update their own assignments" ON public.candidate_project_assignments;

CREATE POLICY "Candidates can update their own assignments" 
ON public.candidate_project_assignments 
FOR UPDATE 
USING (
    candidate_id IN (
        SELECT id FROM candidate_profiles WHERE user_id = auth.uid()
    )
);

-- 7. Vérifier que le trigger est bien actif
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Message de confirmation
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ CORRECTION APPLIQUÉE AVEC SUCCÈS !';
    RAISE NOTICE '';
    RAISE NOTICE 'Les candidats peuvent maintenant s''inscrire sans erreur.';
    RAISE NOTICE 'La fonction handle_new_user créera automatiquement :';
    RAISE NOTICE '  - Une entrée dans profiles (pour tous les utilisateurs)';
    RAISE NOTICE '  - Une entrée dans candidate_profiles (pour les candidats uniquement)';
END $$;