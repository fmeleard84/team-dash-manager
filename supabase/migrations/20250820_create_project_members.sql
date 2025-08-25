-- ========================================
-- CRÉATION DE LA TABLE PROJECT_MEMBERS
-- Table unifiée pour tous les membres d'un projet
-- ========================================

-- 1. Créer la table
CREATE TABLE IF NOT EXISTS project_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- Peut référencer profiles.id ou candidate_profiles.id
  user_email TEXT NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('client', 'candidate')),
  display_name TEXT NOT NULL,
  job_title TEXT,
  role TEXT, -- rôle spécifique dans le projet
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'inactive')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Contrainte unique pour éviter les doublons
  UNIQUE(project_id, user_email)
);

-- 2. Index pour les performances
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
CREATE INDEX idx_project_members_status ON project_members(status);

-- 3. RLS (Row Level Security)
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Politique pour voir les membres d'un projet
CREATE POLICY "Users can view project members" ON project_members
  FOR SELECT
  USING (
    -- Le client peut voir les membres de ses projets
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
    OR
    -- Les candidats peuvent voir les membres des projets où ils sont
    user_id = auth.uid()
    OR
    -- Les candidats peuvent voir via leur email
    user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- 4. Fonction de mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION update_project_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_members_updated_at_trigger
  BEFORE UPDATE ON project_members
  FOR EACH ROW
  EXECUTE FUNCTION update_project_members_updated_at();

-- 5. Activer le realtime
ALTER PUBLICATION supabase_realtime ADD TABLE project_members;