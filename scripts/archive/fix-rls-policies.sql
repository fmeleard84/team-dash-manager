-- Correction définitive des politiques RLS pour hr_resource_assignments
-- À exécuter directement dans Supabase SQL Editor

-- 1. Supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "hr_resource_assignments_select" ON hr_resource_assignments;
DROP POLICY IF EXISTS "hr_resource_assignments_read_all" ON hr_resource_assignments;
DROP POLICY IF EXISTS "hr_resource_assignments_write_auth" ON hr_resource_assignments;
DROP POLICY IF EXISTS "Enable read access for all users" ON hr_resource_assignments;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON hr_resource_assignments;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON hr_resource_assignments;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON hr_resource_assignments;
DROP POLICY IF EXISTS "permit_all_reads" ON hr_resource_assignments;
DROP POLICY IF EXISTS "hr_assignments_public_read" ON hr_resource_assignments;
DROP POLICY IF EXISTS "hr_assignments_auth_write" ON hr_resource_assignments;

-- 2. Créer des politiques simples et permissives
CREATE POLICY "public_read_assignments" ON hr_resource_assignments
FOR SELECT USING (true);

CREATE POLICY "authenticated_write_assignments" ON hr_resource_assignments
FOR ALL USING (auth.role() = 'authenticated');

-- 3. Vérifier que RLS est activé
ALTER TABLE hr_resource_assignments ENABLE ROW LEVEL SECURITY;

-- 4. Test rapide
SELECT COUNT(*) as total_assignments FROM hr_resource_assignments;
SELECT COUNT(*) as marketing_assignments FROM hr_resource_assignments 
WHERE profile_id = '922efb64-1684-45ec-8aea-436c4dad2f37';