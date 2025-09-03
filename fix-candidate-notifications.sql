-- Fix candidate_notifications table structure
-- =============================================

-- 1. Vérifier si la colonne 'type' existe, sinon l'ajouter
ALTER TABLE candidate_notifications 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'general';

-- 2. Vérifier les autres colonnes nécessaires
ALTER TABLE candidate_notifications
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS message TEXT,
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'unread',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Recréer la fonction archive_project avec gestion d'erreur améliorée
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
  
  -- Logger l'action (avec gestion d'erreur)
  BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    -- Si erreur sur les logs, continuer quand même
    RAISE NOTICE 'Could not log action: %', SQLERRM;
  END;
  
  -- Créer des notifications pour tous les candidats affectés
  IF affected_users IS NOT NULL THEN
    BEGIN
      -- Utiliser la structure existante de candidate_notifications
      -- Vérifier d'abord les colonnes disponibles
      INSERT INTO candidate_notifications (
        candidate_id,
        project_id,
        type,
        title,
        message,
        priority,
        data,
        created_at
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
        ),
        NOW();
    EXCEPTION WHEN OTHERS THEN
      -- Si erreur sur les notifications, essayer format minimal
      BEGIN
        INSERT INTO candidate_notifications (
          candidate_id,
          project_id,
          created_at
        )
        SELECT 
          unnest(affected_users),
          project_id_param,
          NOW();
      EXCEPTION WHEN OTHERS THEN
        -- Ignorer les erreurs de notification
        RAISE NOTICE 'Could not create notifications: %', SQLERRM;
      END;
    END;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'project_id', project_id_param,
    'archived_at', NOW(),
    'affected_users', COALESCE(array_length(affected_users, 1), 0)
  );
END;
$$;

-- 4. Recréer unarchive_project avec gestion d'erreur
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
  BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not log action: %', SQLERRM;
  END;
  
  -- Notifier les candidats
  IF affected_users IS NOT NULL THEN
    BEGIN
      INSERT INTO candidate_notifications (
        candidate_id,
        project_id,
        type,
        title,
        message,
        priority,
        created_at
      )
      SELECT 
        unnest(affected_users),
        project_id_param,
        'project_unarchived',
        'Projet réactivé',
        format('Le projet "%s" a été réactivé et n''est plus archivé.', project_record.title),
        'medium',
        NOW();
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not create notifications: %', SQLERRM;
    END;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'project_id', project_id_param,
    'unarchived_at', NOW()
  );
END;
$$;

-- 5. Recréer soft_delete_project avec gestion d'erreur
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
  BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not log action: %', SQLERRM;
  END;
  
  -- Notifier les candidats
  IF affected_users IS NOT NULL THEN
    BEGIN
      INSERT INTO candidate_notifications (
        candidate_id,
        project_id,
        type,
        title,
        message,
        priority,
        data,
        created_at
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
        ),
        NOW();
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not create notifications: %', SQLERRM;
    END;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'project_id', project_id_param,
    'deleted_at', NOW(),
    'affected_users', COALESCE(array_length(affected_users, 1), 0)
  );
END;
$$;

-- Vérifier la structure de candidate_notifications
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'candidate_notifications' 
AND table_schema = 'public'
ORDER BY ordinal_position;