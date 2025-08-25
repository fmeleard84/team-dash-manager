import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  try {
    // Retourner le SQL à exécuter manuellement
    const sqlScript = `
-- ========================================
-- CORRECTION COMPLÈTE DE LA TABLE CLIENT_TEAM_MEMBERS
-- ========================================

-- 1. D'abord créer la fonction exec_sql si elle n'existe pas
CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Créer la table si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.client_team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Ajouter toutes les colonnes manquantes
ALTER TABLE public.client_team_members ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.client_team_members ADD COLUMN IF NOT EXISTS job_title VARCHAR(255);
ALTER TABLE public.client_team_members ADD COLUMN IF NOT EXISTS department VARCHAR(255);
ALTER TABLE public.client_team_members ADD COLUMN IF NOT EXISTS is_billable BOOLEAN DEFAULT false;
ALTER TABLE public.client_team_members ADD COLUMN IF NOT EXISTS daily_rate DECIMAL(10, 2);

-- 4. Créer les index
CREATE INDEX IF NOT EXISTS idx_client_team_members_client_id ON public.client_team_members(client_id);
CREATE INDEX IF NOT EXISTS idx_client_team_members_email ON public.client_team_members(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_team_members_client_email ON public.client_team_members(client_id, email);

-- 5. Activer RLS
ALTER TABLE public.client_team_members ENABLE ROW LEVEL SECURITY;

-- 6. Supprimer et recréer les politiques
DROP POLICY IF EXISTS "Clients can manage their own team members" ON public.client_team_members;
DROP POLICY IF EXISTS "Admin can view all team members" ON public.client_team_members;

CREATE POLICY "Clients can manage their own team members" 
  ON public.client_team_members
  FOR ALL
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Admin can view all team members" 
  ON public.client_team_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'hr')
    )
  );

-- 7. Créer la fonction de mise à jour
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. Créer le trigger
DROP TRIGGER IF EXISTS update_client_team_members_updated_at ON public.client_team_members;
CREATE TRIGGER update_client_team_members_updated_at
  BEFORE UPDATE ON public.client_team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 9. Activer le realtime
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.client_team_members;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- 10. Vérifier que tout est OK
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'client_team_members'
ORDER BY ordinal_position;
`;

    return new Response(JSON.stringify({
      success: true,
      message: '📋 Script SQL généré avec succès',
      instructions: `
INSTRUCTIONS POUR CORRIGER LA TABLE:

1. Ouvrez Supabase Dashboard: https://supabase.com/dashboard/project/egdelmcijszuapcpglsy/sql/new

2. Copiez et collez le script SQL ci-dessous

3. Cliquez sur "Run" pour exécuter

4. Après exécution, la table sera corrigée et vous pourrez ajouter des membres d'équipe sans erreur
      `,
      sql: sqlScript
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    })
  }
})