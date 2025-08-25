-- ========================================
-- CRÉER LA TABLE CLIENT_TEAM_MEMBERS
-- ========================================
-- Exécutez ce script dans l'éditeur SQL de Supabase
-- Dashboard > SQL Editor > New Query

-- 1. Créer la table
CREATE TABLE IF NOT EXISTS public.client_team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  job_title VARCHAR(255),
  department VARCHAR(255),
  is_billable BOOLEAN DEFAULT false,
  daily_rate DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Créer les index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_client_team_members_client_id 
  ON public.client_team_members(client_id);
CREATE INDEX IF NOT EXISTS idx_client_team_members_email 
  ON public.client_team_members(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_team_members_client_email 
  ON public.client_team_members(client_id, email);

-- 3. Activer RLS (Row Level Security)
ALTER TABLE public.client_team_members ENABLE ROW LEVEL SECURITY;

-- 4. Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Clients can manage their own team members" 
  ON public.client_team_members;
DROP POLICY IF EXISTS "Admin can view all team members" 
  ON public.client_team_members;

-- 5. Créer la politique pour que les clients gèrent leurs propres membres
CREATE POLICY "Clients can manage their own team members" 
  ON public.client_team_members
  FOR ALL
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

-- 6. Créer la politique pour que les admins voient tous les membres
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

-- 7. Créer le trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_client_team_members_updated_at 
  ON public.client_team_members;
CREATE TRIGGER update_client_team_members_updated_at
  BEFORE UPDATE ON public.client_team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. Activer le realtime pour cette table
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.client_team_members;
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Ignorer si déjà ajouté
END $$;

-- 9. Vérifier que la table existe
SELECT 
  'Table créée avec succès!' as message,
  COUNT(*) as nombre_colonnes
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'client_team_members';