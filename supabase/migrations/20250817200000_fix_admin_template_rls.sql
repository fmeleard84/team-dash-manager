-- Script pour corriger les politiques RLS et permettre aux admins de gérer les templates

-- 1. Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Admins can manage template categories" ON template_categories;
DROP POLICY IF EXISTS "Admins can manage project templates" ON project_templates;
DROP POLICY IF EXISTS "Users can view template categories" ON template_categories;
DROP POLICY IF EXISTS "Users can view project templates" ON project_templates;

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

-- 3. Créer des politiques pour permettre aux utilisateurs authentifiés de voir les templates
CREATE POLICY "Users can view template categories"
ON template_categories FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can view project templates"
ON project_templates FOR SELECT
TO authenticated
USING (true);