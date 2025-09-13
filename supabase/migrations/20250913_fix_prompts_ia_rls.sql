-- Migration pour corriger les RLS de prompts_ia
-- Permet à tous les utilisateurs (même anonymes) de lire les prompts

-- Désactiver RLS temporairement
ALTER TABLE prompts_ia DISABLE ROW LEVEL SECURITY;

-- Supprimer toutes les anciennes policies
DROP POLICY IF EXISTS "prompts_ia_select_policy" ON prompts_ia;
DROP POLICY IF EXISTS "prompts_ia_insert_policy" ON prompts_ia;
DROP POLICY IF EXISTS "prompts_ia_update_policy" ON prompts_ia;
DROP POLICY IF EXISTS "prompts_ia_delete_policy" ON prompts_ia;
DROP POLICY IF EXISTS "prompts_ia_public_read" ON prompts_ia;
DROP POLICY IF EXISTS "prompts_ia_admin_all" ON prompts_ia;
DROP POLICY IF EXISTS "allow_public_read" ON prompts_ia;
DROP POLICY IF EXISTS "allow_admin_all" ON prompts_ia;

-- Créer une politique de lecture publique simple
CREATE POLICY "allow_public_read" ON prompts_ia
  FOR SELECT
  USING (true);

-- Créer une politique pour les admins (écriture)
CREATE POLICY "allow_admin_all" ON prompts_ia
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM client_profiles
      WHERE client_profiles.owner_id = auth.uid()
    )
  );

-- Réactiver RLS
ALTER TABLE prompts_ia ENABLE ROW LEVEL SECURITY;