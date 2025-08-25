-- ⚠️ IMPORTANT: Exécutez ce script dans le dashboard Supabase SQL Editor
-- Go to: https://supabase.com/dashboard/project/egdelmcijszuapcpglsy/sql/new

-- ========================================
-- 1. CORRIGER LES POLITIQUES RLS POUR candidate_qualification_results
-- ========================================

-- Activer RLS
ALTER TABLE candidate_qualification_results ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Candidates can view own qualification results" ON candidate_qualification_results;
DROP POLICY IF EXISTS "Candidates can insert own qualification results" ON candidate_qualification_results;
DROP POLICY IF EXISTS "Candidates can update own qualification results" ON candidate_qualification_results;
DROP POLICY IF EXISTS "Users can view own qualification results" ON candidate_qualification_results;
DROP POLICY IF EXISTS "Users can insert own qualification results" ON candidate_qualification_results;
DROP POLICY IF EXISTS "Users can update own qualification results" ON candidate_qualification_results;

-- Créer de nouvelles politiques RLS
CREATE POLICY "Users can view own qualification results"
ON candidate_qualification_results FOR SELECT
USING (
  candidate_id IN (
    SELECT id FROM candidate_profiles 
    WHERE email = auth.email()
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'hr_manager')
  )
);

CREATE POLICY "Users can insert own qualification results"
ON candidate_qualification_results FOR INSERT
WITH CHECK (
  candidate_id IN (
    SELECT id FROM candidate_profiles 
    WHERE email = auth.email()
  )
);

CREATE POLICY "Users can update own qualification results"
ON candidate_qualification_results FOR UPDATE
USING (
  candidate_id IN (
    SELECT id FROM candidate_profiles 
    WHERE email = auth.email()
  )
);

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

-- Activer RLS
ALTER TABLE active_time_tracking ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Candidates can view own time tracking" ON active_time_tracking;
DROP POLICY IF EXISTS "Candidates can create own time tracking" ON active_time_tracking;
DROP POLICY IF EXISTS "Candidates can update own time tracking" ON active_time_tracking;
DROP POLICY IF EXISTS "Users can view own time tracking" ON active_time_tracking;

-- Créer nouvelles politiques RLS
CREATE POLICY "Users can view time tracking"
ON active_time_tracking FOR SELECT
USING (
  candidate_id IN (
    SELECT id FROM candidate_profiles 
    WHERE email = auth.email()
  )
  OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'hr_manager')
  )
);

CREATE POLICY "Candidates can create own time tracking"
ON active_time_tracking FOR INSERT
WITH CHECK (
  candidate_id IN (
    SELECT id FROM candidate_profiles 
    WHERE email = auth.email()
  )
);

CREATE POLICY "Candidates can update own time tracking"
ON active_time_tracking FOR UPDATE
USING (
  candidate_id IN (
    SELECT id FROM candidate_profiles 
    WHERE email = auth.email()
  )
);

-- ========================================
-- 3. CRÉER LA TABLE notifications SI ELLE N'EXISTE PAS
-- ========================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT CHECK (type IN ('info', 'success', 'warning', 'error')) DEFAULT 'info',
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
ON notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_read 
ON notifications(read);

-- Activer RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Créer politiques RLS
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can create own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;

CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
USING (user_id = auth.uid());

-- Les notifications sont généralement créées par le système (service role)
-- Donc pas de politique INSERT pour les utilisateurs normaux

-- ========================================
-- 4. CORRIGER LA FONCTION handle_new_user
-- ========================================

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
        phone = COALESCE(EXCLUDED.phone, profiles.phone),
        company_name = COALESCE(EXCLUDED.company_name, profiles.company_name);
    
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
            phone = COALESCE(EXCLUDED.phone, candidate_profiles.phone);
    END IF;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 5. MISE À JOUR MANUELLE DU TÉLÉPHONE
-- ========================================

-- Pour corriger manuellement le téléphone de vos utilisateurs existants
-- Décommentez et modifiez ces lignes selon vos besoins :

/*
-- Pour fmeleard+ressource_7@gmail.com
UPDATE candidate_profiles 
SET phone = '+33 6 XX XX XX XX'  -- Remplacez par le bon numéro
WHERE email = 'fmeleard+ressource_7@gmail.com';

UPDATE profiles
SET phone = '+33 6 XX XX XX XX'  -- Remplacez par le bon numéro  
WHERE email = 'fmeleard+ressource_7@gmail.com';
*/

-- ========================================
-- 6. VÉRIFICATION FINALE
-- ========================================

DO $$
DECLARE
    v_count INTEGER;
    v_exists BOOLEAN;
BEGIN
    -- Vérifier que les tables existent
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'candidate_qualification_results'
    ) INTO v_exists;
    RAISE NOTICE 'Table candidate_qualification_results existe: %', v_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'active_time_tracking'
    ) INTO v_exists;
    RAISE NOTICE 'Table active_time_tracking existe: %', v_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'notifications'
    ) INTO v_exists;
    RAISE NOTICE 'Table notifications existe: %', v_exists;
    
    -- Compter les enregistrements
    SELECT COUNT(*) INTO v_count FROM candidate_profiles;
    RAISE NOTICE 'Nombre de candidats: %', v_count;
    
    SELECT COUNT(*) INTO v_count FROM candidate_qualification_results;
    RAISE NOTICE 'Nombre de résultats de qualification: %', v_count;
    
    -- Vérifier la structure de profiles
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'phone'
    ) INTO v_exists;
    RAISE NOTICE 'Colonne phone dans profiles: %', v_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'role'
    ) INTO v_exists;
    RAISE NOTICE 'Colonne role dans profiles: %', v_exists;
    
    RAISE NOTICE '✅ Script exécuté avec succès!';
END $$;