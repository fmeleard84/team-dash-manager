-- ⚠️ IMPORTANT: Exécutez ce script dans le dashboard Supabase SQL Editor
-- Go to: https://supabase.com/dashboard/project/egdelmcijszuapcpglsy/sql/new

-- ========================================
-- 1. CORRIGER LA FONCTION handle_new_user
-- ========================================
-- Cette fonction doit copier le téléphone lors de l'inscription

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- Créer le profil avec TOUTES les données incluant le téléphone
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
        new.raw_user_meta_data->>'phone',  -- Récupérer le téléphone
        new.raw_user_meta_data->>'company_name',  -- Récupérer le nom de société
        COALESCE(new.raw_user_meta_data->>'role', 'client')
    )
    ON CONFLICT (id) DO UPDATE SET
        phone = EXCLUDED.phone,  -- Mettre à jour le téléphone si le profil existe déjà
        company_name = EXCLUDED.company_name;
    
    -- Si c'est un candidat, créer aussi son profil candidat
    IF new.raw_user_meta_data->>'role' = 'candidate' THEN
        INSERT INTO public.candidate_profiles (
            email,
            first_name,
            last_name,
            phone,
            qualification_status,
            onboarding_step
        )
        VALUES (
            new.email,
            COALESCE(new.raw_user_meta_data->>'first_name', ''),
            COALESCE(new.raw_user_meta_data->>'last_name', ''),
            new.raw_user_meta_data->>'phone',  -- Copier le téléphone ici aussi
            'pending',
            0
        )
        ON CONFLICT (email) DO UPDATE SET
            phone = EXCLUDED.phone;  -- Mettre à jour le téléphone si existe
    END IF;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 2. CRÉER LA TABLE active_time_tracking SI ELLE N'EXISTE PAS
-- ========================================

CREATE TABLE IF NOT EXISTS active_time_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER DEFAULT 0,
    status TEXT CHECK (status IN ('active', 'paused', 'completed')) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_active_time_tracking_candidate_id 
ON active_time_tracking(candidate_id);

CREATE INDEX IF NOT EXISTS idx_active_time_tracking_project_id 
ON active_time_tracking(project_id);

CREATE INDEX IF NOT EXISTS idx_active_time_tracking_status 
ON active_time_tracking(status);

-- ========================================
-- 3. POLITIQUES RLS POUR active_time_tracking
-- ========================================

ALTER TABLE active_time_tracking ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Candidates can view own time tracking" ON active_time_tracking;
DROP POLICY IF EXISTS "Candidates can manage own time tracking" ON active_time_tracking;

-- Politique pour SELECT
CREATE POLICY "Candidates can view own time tracking"
ON active_time_tracking FOR SELECT
USING (
    candidate_id IN (
        SELECT id FROM candidate_profiles 
        WHERE email = auth.email()
    )
    OR
    auth.uid() IN (
        SELECT id FROM profiles WHERE is_hr = true
    )
);

-- Politique pour INSERT
CREATE POLICY "Candidates can create own time tracking"
ON active_time_tracking FOR INSERT
WITH CHECK (
    candidate_id IN (
        SELECT id FROM candidate_profiles 
        WHERE email = auth.email()
    )
);

-- Politique pour UPDATE
CREATE POLICY "Candidates can update own time tracking"
ON active_time_tracking FOR UPDATE
USING (
    candidate_id IN (
        SELECT id FROM candidate_profiles 
        WHERE email = auth.email()
    )
);

-- ========================================
-- 4. METTRE À JOUR LE TÉLÉPHONE POUR L'UTILISATEUR EXISTANT
-- ========================================

-- Pour corriger manuellement le téléphone de fmeleard+ressource_7@gmail.com
-- Remplacez 'VOTRE_NUMERO' par le bon numéro
/*
UPDATE candidate_profiles 
SET phone = 'VOTRE_NUMERO'
WHERE email = 'fmeleard+ressource_7@gmail.com';

UPDATE profiles
SET phone = 'VOTRE_NUMERO'
WHERE email = 'fmeleard+ressource_7@gmail.com';
*/

-- ========================================
-- 5. VÉRIFICATION
-- ========================================

-- Vérifier que tout est OK
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Vérifier candidate_qualification_results
    SELECT COUNT(*) INTO v_count FROM information_schema.tables 
    WHERE table_name = 'candidate_qualification_results';
    RAISE NOTICE 'Table candidate_qualification_results existe: %', v_count > 0;
    
    -- Vérifier active_time_tracking
    SELECT COUNT(*) INTO v_count FROM information_schema.tables 
    WHERE table_name = 'active_time_tracking';
    RAISE NOTICE 'Table active_time_tracking existe: %', v_count > 0;
    
    -- Compter les candidats
    SELECT COUNT(*) INTO v_count FROM candidate_profiles;
    RAISE NOTICE 'Nombre de candidats: %', v_count;
    
    -- Compter les résultats de qualification
    SELECT COUNT(*) INTO v_count FROM candidate_qualification_results;
    RAISE NOTICE 'Nombre de résultats de qualification: %', v_count;
END $$;