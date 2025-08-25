-- Script pour corriger les politiques RLS et permettre aux admins de gérer les templates
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Admins can manage template categories" ON template_categories;
DROP POLICY IF EXISTS "Admins can manage project templates" ON project_templates;

-- 2. Créer de nouvelles politiques pour les admins avec toutes les opérations
CREATE POLICY "Admins can manage template categories"
ON template_categories FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can manage project templates"
ON project_templates FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- 3. Vérifier que l'utilisateur admin existe et a le bon rôle
SELECT id, email, role, first_name, last_name 
FROM profiles 
WHERE email = 'fmeleard@gmail.com';

-- 4. Vérifier les politiques créées
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('template_categories', 'project_templates')
ORDER BY tablename, policyname;