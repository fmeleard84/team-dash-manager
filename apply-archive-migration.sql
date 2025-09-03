-- Script d'application directe de la migration d'archivage
-- ========================================================

-- 1. Ajouter colonnes pour archivage et soft delete
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS archived_reason TEXT,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- 2. Créer la table de logs
CREATE TABLE IF NOT EXISTS project_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('created', 'archived', 'unarchived', 'deleted', 'restored', 'paused', 'resumed', 'completed', 'cancelled')),
  action_reason TEXT,
  performed_by UUID REFERENCES profiles(id),
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  affected_users UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Créer les index
CREATE INDEX IF NOT EXISTS idx_projects_archived_at ON projects(archived_at);
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON projects(deleted_at);
CREATE INDEX IF NOT EXISTS idx_project_action_logs_project_id ON project_action_logs(project_id);

-- 4. Fonction archive_project
CREATE OR REPLACE FUNCTION archive_project(
  project_id_param UUID,
  user_id_param UUID,
  reason_param TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_record RECORD;
  affected_users UUID[];
  result JSONB;
BEGIN
  -- Vérifier que le projet existe et n'est pas déjà archivé
  SELECT * INTO project_record 
  FROM projects 
  WHERE id = project_id_param 
    AND archived_at IS NULL 
    AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Project not found or already archived/deleted'
    );
  END IF;
  
  -- Vérifier que l'utilisateur est le propriétaire
  IF project_record.owner_id != user_id_param THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only project owner can archive'
    );
  END IF;
  
  -- Récupérer les utilisateurs affectés
  SELECT ARRAY_AGG(DISTINCT candidate_id) INTO affected_users
  FROM hr_resource_assignments
  WHERE project_id = project_id_param
    AND candidate_id IS NOT NULL;
  
  -- Archiver le projet
  UPDATE projects
  SET 
    archived_at = NOW(),
    archived_by = user_id_param,
    archived_reason = reason_param,
    updated_at = NOW()
  WHERE id = project_id_param;
  
  -- Logger l'action
  INSERT INTO project_action_logs (
    project_id,
    action_type,
    action_reason,
    performed_by,
    affected_users,
    metadata
  ) VALUES (
    project_id_param,
    'archived',
    reason_param,
    user_id_param,
    COALESCE(affected_users, '{}'),
    jsonb_build_object(
      'previous_status', project_record.status,
      'project_title', project_record.title
    )
  );
  
  -- Créer des notifications pour tous les candidats affectés
  IF affected_users IS NOT NULL THEN
    INSERT INTO candidate_notifications (
      candidate_id,
      project_id,
      type,
      title,
      message,
      priority,
      data
    )
    SELECT 
      unnest(affected_users),
      project_id_param,
      'project_archived',
      'Projet archivé',
      format('Le projet "%s" a été archivé par le client. Vous pouvez toujours consulter vos données.', project_record.title),
      'high',
      jsonb_build_object(
        'project_title', project_record.title,
        'archived_reason', reason_param,
        'archived_at', NOW()
      );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'project_id', project_id_param,
    'archived_at', NOW(),
    'affected_users', COALESCE(array_length(affected_users, 1), 0)
  );
END;
$$;

-- 5. Fonction unarchive_project
CREATE OR REPLACE FUNCTION unarchive_project(
  project_id_param UUID,
  user_id_param UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_record RECORD;
  affected_users UUID[];
BEGIN
  -- Vérifier que le projet existe et est archivé
  SELECT * INTO project_record 
  FROM projects 
  WHERE id = project_id_param 
    AND archived_at IS NOT NULL
    AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Project not found or not archived'
    );
  END IF;
  
  -- Vérifier que l'utilisateur est le propriétaire
  IF project_record.owner_id != user_id_param THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only project owner can unarchive'
    );
  END IF;
  
  -- Récupérer les utilisateurs affectés
  SELECT ARRAY_AGG(DISTINCT candidate_id) INTO affected_users
  FROM hr_resource_assignments
  WHERE project_id = project_id_param
    AND candidate_id IS NOT NULL;
  
  -- Désarchiver le projet
  UPDATE projects
  SET 
    archived_at = NULL,
    archived_by = NULL,
    archived_reason = NULL,
    updated_at = NOW()
  WHERE id = project_id_param;
  
  -- Logger l'action
  INSERT INTO project_action_logs (
    project_id,
    action_type,
    performed_by,
    affected_users
  ) VALUES (
    project_id_param,
    'unarchived',
    user_id_param,
    COALESCE(affected_users, '{}')
  );
  
  -- Notifier les candidats
  IF affected_users IS NOT NULL THEN
    INSERT INTO candidate_notifications (
      candidate_id,
      project_id,
      type,
      title,
      message,
      priority
    )
    SELECT 
      unnest(affected_users),
      project_id_param,
      'project_unarchived',
      'Projet réactivé',
      format('Le projet "%s" a été réactivé et n''est plus archivé.', project_record.title),
      'medium';
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'project_id', project_id_param,
    'unarchived_at', NOW()
  );
END;
$$;

-- 6. Fonction soft_delete_project
CREATE OR REPLACE FUNCTION soft_delete_project(
  project_id_param UUID,
  user_id_param UUID,
  reason_param TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_record RECORD;
  affected_users UUID[];
BEGIN
  -- Vérifier que le projet existe
  SELECT * INTO project_record 
  FROM projects 
  WHERE id = project_id_param 
    AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Project not found or already deleted'
    );
  END IF;
  
  -- Vérifier que l'utilisateur est le propriétaire
  IF project_record.owner_id != user_id_param THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only project owner can delete'
    );
  END IF;
  
  -- Récupérer les utilisateurs affectés
  SELECT ARRAY_AGG(DISTINCT candidate_id) INTO affected_users
  FROM hr_resource_assignments
  WHERE project_id = project_id_param
    AND candidate_id IS NOT NULL;
  
  -- Soft delete
  UPDATE projects
  SET 
    deleted_at = NOW(),
    deleted_by = user_id_param,
    deletion_reason = reason_param,
    status = 'cancelled',
    updated_at = NOW()
  WHERE id = project_id_param;
  
  -- Logger l'action
  INSERT INTO project_action_logs (
    project_id,
    action_type,
    action_reason,
    performed_by,
    affected_users,
    metadata
  ) VALUES (
    project_id_param,
    'deleted',
    reason_param,
    user_id_param,
    COALESCE(affected_users, '{}'),
    jsonb_build_object(
      'previous_status', project_record.status,
      'project_title', project_record.title
    )
  );
  
  -- Notifier les candidats
  IF affected_users IS NOT NULL THEN
    INSERT INTO candidate_notifications (
      candidate_id,
      project_id,
      type,
      title,
      message,
      priority,
      data
    )
    SELECT 
      unnest(affected_users),
      project_id_param,
      'project_deleted',
      'Projet supprimé',
      format('Le projet "%s" a été supprimé. Vos données restent accessibles pour consultation.', project_record.title),
      'urgent',
      jsonb_build_object(
        'project_title', project_record.title,
        'deletion_reason', reason_param,
        'deleted_at', NOW()
      );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'project_id', project_id_param,
    'deleted_at', NOW(),
    'affected_users', COALESCE(array_length(affected_users, 1), 0)
  );
END;
$$;

-- 7. Activer RLS sur project_action_logs
ALTER TABLE project_action_logs ENABLE ROW LEVEL SECURITY;

-- 8. Créer les policies RLS
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

CREATE POLICY "Candidates can view logs of their projects"
  ON project_action_logs
  FOR SELECT
  USING (
    auth.uid() = ANY(affected_users)
    OR EXISTS (
      SELECT 1 FROM hr_resource_assignments hra
      JOIN candidate_profiles cp ON cp.id = hra.candidate_id
      JOIN profiles pr ON pr.email = cp.email
      WHERE hra.project_id = project_action_logs.project_id
      AND pr.id = auth.uid()
    )
  );

-- 9. Fonction helper pour vérifier si un projet est readonly
CREATE OR REPLACE FUNCTION is_project_readonly(project_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM projects
    WHERE id = project_id
    AND (archived_at IS NOT NULL OR deleted_at IS NOT NULL)
  );
END;
$$;

-- Afficher confirmation
SELECT 'Migration archivage appliquée avec succès' as status;