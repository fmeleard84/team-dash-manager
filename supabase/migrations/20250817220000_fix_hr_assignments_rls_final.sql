-- Fix RLS for hr_resource_assignments table
-- Permettre la lecture pour tous les utilisateurs (anon et authenticated)

-- Supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "hr_resource_assignments_select" ON hr_resource_assignments;
DROP POLICY IF EXISTS "hr_resource_assignments_read_all" ON hr_resource_assignments;
DROP POLICY IF EXISTS "hr_resource_assignments_write_auth" ON hr_resource_assignments;
DROP POLICY IF EXISTS "Enable read access for all users" ON hr_resource_assignments;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON hr_resource_assignments;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON hr_resource_assignments;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON hr_resource_assignments;
DROP POLICY IF EXISTS "permit_all_reads" ON hr_resource_assignments;

-- Créer une politique de lecture publique
CREATE POLICY "hr_assignments_public_read" ON hr_resource_assignments
FOR SELECT USING (true);

-- Créer une politique d'écriture pour les utilisateurs authentifiés seulement
CREATE POLICY "hr_assignments_auth_write" ON hr_resource_assignments
FOR ALL USING (auth.role() = 'authenticated');