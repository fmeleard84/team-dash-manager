import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log(`
📋 Instructions pour appliquer la migration d'archivage :
=========================================================

1. Ouvrez Supabase Dashboard SQL Editor:
   https://supabase.com/dashboard/project/egdelmcijszuapcpglsy/sql/new

2. Copiez et exécutez le contenu du fichier:
   /opt/team-dash-manager/apply-archive-migration.sql

3. Ou utilisez ces commandes directes dans le SQL Editor:

=== ÉTAPE 1: Structure des tables ===
`);

console.log(`
-- Ajouter colonnes pour archivage
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS archived_reason TEXT,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- Créer table de logs
CREATE TABLE IF NOT EXISTS project_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_reason TEXT,
  performed_by UUID REFERENCES profiles(id),
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  affected_users UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Créer les index
CREATE INDEX IF NOT EXISTS idx_projects_archived_at ON projects(archived_at);
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON projects(deleted_at);
`);

console.log(`
=== ÉTAPE 2: Créer la fonction archive_project ===

Copier le contenu complet de la fonction depuis apply-archive-migration.sql
(lignes 31 à 130)
`);

console.log(`
=== ÉTAPE 3: Créer la fonction unarchive_project ===

Copier le contenu complet de la fonction depuis apply-archive-migration.sql
(lignes 133 à 212)
`);

console.log(`
=== ÉTAPE 4: Créer la fonction soft_delete_project ===

Copier le contenu complet de la fonction depuis apply-archive-migration.sql
(lignes 215 à 314)
`);

console.log(`
=== ÉTAPE 5: Activer RLS ===

ALTER TABLE project_action_logs ENABLE ROW LEVEL SECURITY;

-- Policy pour les propriétaires
CREATE POLICY "Owners can view their project logs"
  ON project_action_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_action_logs.project_id
      AND p.owner_id = auth.uid()
    )
  );
`);

console.log(`
✅ Une fois toutes les étapes exécutées, l'archivage sera fonctionnel !
`);