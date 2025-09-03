import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // SQL de migration complet
    const migrationSQL = `
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
    `;

    // Fonction archive_project
    const archiveFunctionSQL = `
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
    `;

    // Fonction unarchive_project
    const unarchiveFunctionSQL = `
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
    `;

    // Fonction soft_delete_project
    const deleteFunctionSQL = `
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
    `;

    // RLS Policies
    const rlsPoliciesSQL = `
      -- Activer RLS sur project_action_logs
      ALTER TABLE project_action_logs ENABLE ROW LEVEL SECURITY;

      -- Créer les policies RLS
      DROP POLICY IF EXISTS "Owners can view their project logs" ON project_action_logs;
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

      DROP POLICY IF EXISTS "Candidates can view logs of their projects" ON project_action_logs;
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

      -- Fonction helper
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
    `;

    // Exécuter les migrations
    console.log('Applying migration...')
    
    // 1. Structure
    const { error: structureError } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    }).single()
    
    if (structureError && !structureError.message?.includes('already exists')) {
      console.error('Structure error:', structureError)
    }

    // 2. Archive function
    const { error: archiveError } = await supabase.rpc('exec_sql', {
      sql: archiveFunctionSQL
    }).single()
    
    if (archiveError && !archiveError.message?.includes('already exists')) {
      console.error('Archive function error:', archiveError)
    }

    // 3. Unarchive function
    const { error: unarchiveError } = await supabase.rpc('exec_sql', {
      sql: unarchiveFunctionSQL
    }).single()
    
    if (unarchiveError && !unarchiveError.message?.includes('already exists')) {
      console.error('Unarchive function error:', unarchiveError)
    }

    // 4. Delete function
    const { error: deleteError } = await supabase.rpc('exec_sql', {
      sql: deleteFunctionSQL
    }).single()
    
    if (deleteError && !deleteError.message?.includes('already exists')) {
      console.error('Delete function error:', deleteError)
    }

    // 5. RLS Policies
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: rlsPoliciesSQL
    }).single()
    
    if (rlsError && !rlsError.message?.includes('already exists')) {
      console.error('RLS error:', rlsError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Archive migration applied successfully',
        details: {
          structure: !structureError,
          archive_function: !archiveError,
          unarchive_function: !unarchiveError,
          delete_function: !deleteError,
          rls_policies: !rlsError
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 200
      }
    )

  } catch (error) {
    console.error('Migration error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 500
      }
    )
  }
})