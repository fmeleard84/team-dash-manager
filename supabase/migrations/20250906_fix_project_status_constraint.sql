-- Migration: Fix project status constraint to include 'attente-team'
-- Date: 2025-09-06
-- Description: Aligns the status constraint with the documentation

BEGIN;

-- 1. First, update any projects with invalid statuses
UPDATE projects 
SET status = CASE
    WHEN status IN ('cancelled', 'archived') THEN 'completed'
    WHEN status = 'waiting' THEN 'attente-team'
    ELSE 'pause'
END
WHERE status NOT IN ('pause', 'attente-team', 'play', 'completed');

-- 2. Drop the existing constraint
ALTER TABLE projects 
DROP CONSTRAINT IF EXISTS projects_status_check;

-- 3. Add the new constraint with all documented statuses
ALTER TABLE projects 
ADD CONSTRAINT projects_status_check 
CHECK (status IN ('pause', 'attente-team', 'play', 'completed'));

-- 4. Update the fix-project-delete function to use 'completed' instead of 'cancelled'
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
    v_project RECORD;
    v_result JSONB;
BEGIN
    -- Get project details
    SELECT * INTO v_project 
    FROM projects 
    WHERE id = project_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Project not found'
        );
    END IF;
    
    -- Check if user is the owner
    IF v_project.owner_id != user_id_param THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Unauthorized: Only the project owner can delete the project'
        );
    END IF;
    
    -- Update project status to 'completed' (soft delete)
    UPDATE projects 
    SET 
        status = 'completed',
        updated_at = NOW()
    WHERE id = project_id_param;
    
    -- Log the deletion in project_events if the table exists
    INSERT INTO project_events (
        project_id,
        event_type,
        event_data,
        created_by
    )
    SELECT 
        project_id_param,
        'project_deleted',
        jsonb_build_object(
            'reason', COALESCE(reason_param, 'User requested deletion'),
            'previous_status', v_project.status,
            'deleted_at', NOW()
        ),
        user_id_param
    WHERE EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'project_events'
    );
    
    -- Clean up related data (optional, depending on business logic)
    -- Update resource assignments
    UPDATE hr_resource_assignments 
    SET booking_status = 'declined'
    WHERE project_id = project_id_param 
    AND booking_status IN ('draft', 'recherche');
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Project successfully deleted',
        'project_id', project_id_param,
        'status', 'completed'
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- 5. Add comment to document valid statuses
COMMENT ON COLUMN projects.status IS 'Project status: pause (created/paused), attente-team (waiting for team acceptance), play (active), completed (finished/deleted)';

COMMIT;