-- Fix RLS policies for candidate_profiles to allow candidate self-registration

-- Temporairement désactiver RLS pour pouvoir modifier les politiques
ALTER TABLE candidate_profiles DISABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Users can view their own candidate profile" ON candidate_profiles;
DROP POLICY IF EXISTS "Users can insert their own candidate profile" ON candidate_profiles;
DROP POLICY IF EXISTS "Users can update their own candidate profile" ON candidate_profiles;
DROP POLICY IF EXISTS "Admins can do everything on candidate_profiles" ON candidate_profiles;

-- Créer des nouvelles politiques plus permissives
CREATE POLICY "Allow candidates to read their own profile"
    ON candidate_profiles FOR SELECT
    USING (
        email = auth.email() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.email = auth.email() 
            AND profiles.role IN ('admin', 'client')
        )
    );

CREATE POLICY "Allow candidates to create their own profile"
    ON candidate_profiles FOR INSERT
    WITH CHECK (
        email = auth.email() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.email = auth.email() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Allow candidates to update their own profile"
    ON candidate_profiles FOR UPDATE
    USING (
        email = auth.email() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.email = auth.email() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Allow admins full access to candidate_profiles"
    ON candidate_profiles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.email = auth.email() 
            AND profiles.role = 'admin'
        )
    );

-- Réactiver RLS
ALTER TABLE candidate_profiles ENABLE ROW LEVEL SECURITY;

-- Rendre la colonne password_hash optionnelle si elle existe
ALTER TABLE candidate_profiles ALTER COLUMN password_hash DROP NOT NULL;

-- Ajouter une valeur par défaut pour password_hash
ALTER TABLE candidate_profiles ALTER COLUMN password_hash SET DEFAULT '';

-- Vérifier la structure de la table
\d candidate_profiles;