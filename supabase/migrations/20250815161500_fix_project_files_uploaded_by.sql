-- Fix uploaded_by constraint in project_files table
-- Change uploaded_by from UUID with foreign key to TEXT

-- Drop foreign key constraint if it exists
ALTER TABLE public.project_files 
  DROP CONSTRAINT IF EXISTS project_files_uploaded_by_fkey;

-- Change uploaded_by to TEXT if it's not already
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'project_files' 
        AND column_name = 'uploaded_by' 
        AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.project_files 
          ALTER COLUMN uploaded_by TYPE TEXT;
    END IF;
END $$;

-- Ensure column is NOT NULL
ALTER TABLE public.project_files 
  ALTER COLUMN uploaded_by SET NOT NULL;

COMMENT ON MIGRATION IS 'Fix uploaded_by column type to TEXT and remove foreign key constraint';