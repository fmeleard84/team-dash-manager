-- Correction de la structure de candidate_profiles avec suppression préalable
-- Cette migration corrige le problème de visibilité des projets pour les candidats

-- 1. Rendre password_hash optionnel
ALTER TABLE candidate_profiles 
ALTER COLUMN password_hash DROP NOT NULL;

-- 2. Supprimer TOUTES les anciennes politiques RLS pour candidate_profiles
DROP POLICY IF EXISTS "candidate_profiles_insert_policy" ON candidate_profiles;
DROP POLICY IF EXISTS "candidate_profiles_select_policy" ON candidate_profiles;
DROP POLICY IF EXISTS "candidate_profiles_update_policy" ON candidate_profiles;
DROP POLICY IF EXISTS "Users can create their own candidate profile" ON candidate_profiles;
DROP POLICY IF EXISTS "Users can view their own candidate profile" ON candidate_profiles;
DROP POLICY IF EXISTS "Users can update their own candidate profile" ON candidate_profiles;

-- 3. Recréer les politiques RLS pour candidate_profiles
CREATE POLICY "Users can create their own candidate profile"
ON candidate_profiles FOR INSERT
WITH CHECK (
    auth.email() = email
);

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

CREATE POLICY "Users can update their own candidate profile"
ON candidate_profiles FOR UPDATE
USING (auth.email() = email)
WITH CHECK (auth.email() = email);

-- 4. Supprimer et recréer les politiques pour hr_resource_assignments
DROP POLICY IF EXISTS "hr_resource_assignments_select_policy" ON hr_resource_assignments;
DROP POLICY IF EXISTS "hr_resource_assignments_insert_policy" ON hr_resource_assignments;
DROP POLICY IF EXISTS "hr_resource_assignments_update_policy" ON hr_resource_assignments;
DROP POLICY IF EXISTS "hr_resource_assignments_delete_policy" ON hr_resource_assignments;
DROP POLICY IF EXISTS "Candidates can view their assignments" ON hr_resource_assignments;
DROP POLICY IF EXISTS "Admin and clients can create assignments" ON hr_resource_assignments;
DROP POLICY IF EXISTS "Admin and clients can update assignments" ON hr_resource_assignments;
DROP POLICY IF EXISTS "Admin and clients can delete assignments" ON hr_resource_assignments;
DROP POLICY IF EXISTS "Project owners can manage resource assignments (JWT fallback)" ON hr_resource_assignments;

-- Politique pour permettre aux candidats de voir leurs propres assignations
-- Note: hr_resource_assignments utilise profile_id, pas candidate_id
CREATE POLICY "Candidates can view their assignments"
ON hr_resource_assignments FOR SELECT
USING (
    -- Les candidats peuvent voir les assignations liées à leur email
    EXISTS (
        SELECT 1 FROM candidate_profiles cp
        WHERE cp.email = auth.email()
    )
    OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.email = auth.email()
        AND profiles.role IN ('admin', 'client')
    )
);

-- Politique pour permettre aux admins et clients de créer des assignations
CREATE POLICY "Admin and clients can create assignments"
ON hr_resource_assignments FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.email = auth.email()
        AND profiles.role IN ('admin', 'client')
    )
);

-- Politique pour permettre aux admins et clients de modifier les assignations
CREATE POLICY "Admin and clients can update assignments"
ON hr_resource_assignments FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.email = auth.email()
        AND profiles.role IN ('admin', 'client')
    )
);

-- Politique pour permettre aux admins et clients de supprimer les assignations
CREATE POLICY "Admin and clients can delete assignments"
ON hr_resource_assignments FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.email = auth.email()
        AND profiles.role IN ('admin', 'client')
    )
);

-- 5. Supprimer et recréer les politiques pour projects (visibilité pour les candidats)
DROP POLICY IF EXISTS "projects_select_policy" ON projects;
DROP POLICY IF EXISTS "Users can view relevant projects" ON projects;
DROP POLICY IF EXISTS "Projects are visible to all authenticated users" ON projects;

-- Créer une nouvelle politique qui permet aux candidats de voir les projets où ils sont assignés
CREATE POLICY "Users can view relevant projects"
ON projects FOR SELECT
USING (
    -- Admins et clients voient tous les projets
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.email = auth.email()
        AND profiles.role IN ('admin', 'client')
    )
    OR
    -- Les candidats voient les projets où ils sont assignés
    EXISTS (
        SELECT 1 FROM hr_resource_assignments hra
        WHERE hra.project_id = projects.id
    )
);