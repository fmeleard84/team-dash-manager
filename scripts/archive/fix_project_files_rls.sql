-- Fix RLS policies for project_files table to allow Kanban file synchronization
-- This script resolves the "new row violates row-level security policy" error

-- =============================================================================
-- 1. DROP EXISTING PROBLEMATIC POLICIES
-- =============================================================================

DROP POLICY IF EXISTS "project_files_insert_policy" ON public.project_files;
DROP POLICY IF EXISTS "project_files_select_policy" ON public.project_files;
DROP POLICY IF EXISTS "project_files_update_policy" ON public.project_files;
DROP POLICY IF EXISTS "project_files_delete_policy" ON public.project_files;

-- =============================================================================
-- 2. CREATE NEW SIMPLIFIED RLS POLICIES
-- =============================================================================

-- Allow SELECT for authenticated users who are project members or if file is public
CREATE POLICY "project_files_select_policy" ON public.project_files
  FOR SELECT
  USING (
    auth.role() = 'authenticated' AND (
      is_public = true
      OR EXISTS (
        SELECT 1 FROM public.project_teams pt 
        WHERE pt.project_id = project_files.project_id 
        AND pt.member_email = auth.jwt()->>'email'
      )
      OR EXISTS (
        SELECT 1 FROM public.projects p 
        WHERE p.id = project_files.project_id 
        AND p.created_by = auth.jwt()->>'email'
      )
    )
  );

-- Allow INSERT for authenticated users who are project members
CREATE POLICY "project_files_insert_policy" ON public.project_files
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND (
      EXISTS (
        SELECT 1 FROM public.project_teams pt 
        WHERE pt.project_id = project_files.project_id 
        AND pt.member_email = auth.jwt()->>'email'
      )
      OR EXISTS (
        SELECT 1 FROM public.projects p 
        WHERE p.id = project_files.project_id 
        AND p.created_by = auth.jwt()->>'email'
      )
    )
  );

-- Allow UPDATE for file uploader or project members
CREATE POLICY "project_files_update_policy" ON public.project_files
  FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND (
      uploaded_by = auth.jwt()->>'email'
      OR EXISTS (
        SELECT 1 FROM public.project_teams pt 
        WHERE pt.project_id = project_files.project_id 
        AND pt.member_email = auth.jwt()->>'email'
      )
      OR EXISTS (
        SELECT 1 FROM public.projects p 
        WHERE p.id = project_files.project_id 
        AND p.created_by = auth.jwt()->>'email'
      )
    )
  );

-- Allow DELETE for file uploader or project owner
CREATE POLICY "project_files_delete_policy" ON public.project_files
  FOR DELETE
  USING (
    auth.role() = 'authenticated' AND (
      uploaded_by = auth.jwt()->>'email'
      OR EXISTS (
        SELECT 1 FROM public.projects p 
        WHERE p.id = project_files.project_id 
        AND p.created_by = auth.jwt()->>'email'
      )
    )
  );

-- =============================================================================
-- 3. ENSURE TABLE STRUCTURE IS CORRECT
-- =============================================================================

-- Make sure columns exist and have correct types
DO $$ 
BEGIN
    -- Check and add is_public column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_files' 
        AND column_name = 'is_public'
    ) THEN
        ALTER TABLE public.project_files ADD COLUMN is_public BOOLEAN DEFAULT FALSE;
    END IF;

    -- Check and add description column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_files' 
        AND column_name = 'description'
    ) THEN
        ALTER TABLE public.project_files ADD COLUMN description TEXT;
    END IF;
END $$;

-- =============================================================================
-- 4. CREATE FUNCTION TO CHECK PROJECT MEMBERSHIP (if not exists)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_project_member_email(project_uuid UUID, user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.project_teams 
        WHERE project_id = project_uuid 
        AND member_email = user_email
    ) OR EXISTS (
        SELECT 1 FROM public.projects 
        WHERE id = project_uuid 
        AND created_by = user_email
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 5. TEST POLICY WITH SAMPLE DATA (optional verification)
-- =============================================================================

-- This would test if the policies work correctly
-- Comment out if not needed
/*
DO $$
DECLARE
    test_project_id UUID;
    test_user_email TEXT := 'test@example.com';
BEGIN
    -- Create a test project if needed for verification
    SELECT id INTO test_project_id FROM public.projects LIMIT 1;
    
    IF test_project_id IS NOT NULL THEN
        -- Try to insert a test file record
        INSERT INTO public.project_files (
            project_id, 
            file_name, 
            file_path, 
            file_size, 
            file_type, 
            uploaded_by
        ) VALUES (
            test_project_id,
            'test_file.txt',
            'test/path/test_file.txt',
            1024,
            'text/plain',
            test_user_email
        );
        
        RAISE NOTICE 'RLS policies working correctly - test insert succeeded';
        
        -- Clean up test data
        DELETE FROM public.project_files WHERE file_name = 'test_file.txt';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'RLS test failed: %', SQLERRM;
END $$;
*/

COMMENT ON TABLE public.project_files IS 'Updated RLS policies to allow Kanban file synchronization - 2025-08-16';