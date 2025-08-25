-- Correction de la structure de candidate_profiles
-- Cette migration corrige le problème de password_hash et des politiques RLS

-- 1. Rendre password_hash optionnel ou le supprimer
ALTER TABLE candidate_profiles 
ALTER COLUMN password_hash DROP NOT NULL;

-- Ou pour supprimer complètement la colonne (si elle n'est pas utilisée)
-- ALTER TABLE candidate_profiles DROP COLUMN IF EXISTS password_hash;

-- 2. Corriger les politiques RLS pour permettre l'auto-inscription
DROP POLICY IF EXISTS "candidate_profiles_insert_policy" ON candidate_profiles;
DROP POLICY IF EXISTS "candidate_profiles_select_policy" ON candidate_profiles;
DROP POLICY IF EXISTS "candidate_profiles_update_policy" ON candidate_profiles;

-- Politique pour permettre aux utilisateurs de créer leur propre profil candidat
CREATE POLICY "Users can create their own candidate profile"
ON candidate_profiles FOR INSERT
WITH CHECK (
    auth.email() = email
);

-- Politique pour permettre aux utilisateurs de voir leur propre profil
CREATE POLICY "Users can view their own candidate profile"
ON candidate_profiles FOR SELECT
USING (
    auth.email() = email
    OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.email = auth.email()
        AND profiles.role IN ('admin', 'client')
    )
);

-- Politique pour permettre aux utilisateurs de modifier leur propre profil
CREATE POLICY "Users can update their own candidate profile"
ON candidate_profiles FOR UPDATE
USING (auth.email() = email)
WITH CHECK (auth.email() = email);

-- 3. S'assurer que les triggers et fonctions sont corrects
-- Vérifier si un trigger existe pour synchroniser avec profiles
CREATE OR REPLACE FUNCTION create_candidate_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Créer automatiquement un profil candidat quand un utilisateur avec role='candidate' est créé
    IF NEW.role = 'candidate' THEN
        INSERT INTO candidate_profiles (
            email,
            first_name,
            last_name,
            qualification_status,
            password_hash
        ) VALUES (
            NEW.email,
            NEW.first_name,
            NEW.last_name,
            'pending',
            '' -- password_hash vide par défaut
        ) ON CONFLICT (email) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger si il n'existe pas
DROP TRIGGER IF EXISTS on_profile_created ON profiles;
CREATE TRIGGER on_profile_created
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_candidate_profile_for_user();