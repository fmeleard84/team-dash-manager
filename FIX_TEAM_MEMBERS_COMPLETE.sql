-- ========================================
-- SCRIPT COMPLET POUR CORRIGER LA TABLE CLIENT_TEAM_MEMBERS
-- ========================================
-- Exécutez ce script dans l'éditeur SQL de Supabase
-- Dashboard > SQL Editor > New Query

-- 1. Créer la table si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.client_team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ajouter les colonnes manquantes (si elles n'existent pas déjà)
ALTER TABLE public.client_team_members 
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.client_team_members 
ADD COLUMN IF NOT EXISTS job_title VARCHAR(255);

ALTER TABLE public.client_team_members 
ADD COLUMN IF NOT EXISTS department VARCHAR(255);

ALTER TABLE public.client_team_members 
ADD COLUMN IF NOT EXISTS is_billable BOOLEAN DEFAULT false;

ALTER TABLE public.client_team_members 
ADD COLUMN IF NOT EXISTS daily_rate DECIMAL(10, 2);

-- 3. Créer les index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_client_team_members_client_id 
  ON public.client_team_members(client_id);
  
CREATE INDEX IF NOT EXISTS idx_client_team_members_email 
  ON public.client_team_members(email);
  
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_team_members_client_email 
  ON public.client_team_members(client_id, email);

-- 4. Activer RLS (Row Level Security)
ALTER TABLE public.client_team_members ENABLE ROW LEVEL SECURITY;

-- 5. Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Clients can manage their own team members" 
  ON public.client_team_members;
DROP POLICY IF EXISTS "Admin can view all team members" 
  ON public.client_team_members;

-- 6. Créer la politique pour que les clients gèrent leurs propres membres
CREATE POLICY "Clients can manage their own team members" 
  ON public.client_team_members
  FOR ALL
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

-- 7. Créer la politique pour que les admins voient tous les membres
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

-- 8. Créer ou remplacer la fonction de mise à jour du timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 9. Créer le trigger pour mettre à jour updated_at
DROP TRIGGER IF EXISTS update_client_team_members_updated_at 
  ON public.client_team_members;
  
CREATE TRIGGER update_client_team_members_updated_at
  BEFORE UPDATE ON public.client_team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 10. Activer le realtime pour cette table
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.client_team_members;
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Ignorer si déjà ajouté
END $$;

-- 11. Créer la fonction exec_sql si elle n'existe pas (utile pour les edge functions)
CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Vérifier que tout est correct
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'client_team_members'
ORDER BY ordinal_position;

-- Message de confirmation
SELECT 
  '✅ Table client_team_members corrigée avec succès!' as message,
  COUNT(*) as nombre_colonnes,
  array_agg(column_name ORDER BY ordinal_position) as colonnes
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'client_team_members';