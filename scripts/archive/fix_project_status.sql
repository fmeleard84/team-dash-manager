-- Fix Claude 2 project status directly via SQL
-- The error "thread_id is ambiguous" is likely from a corrupted RLS policy

-- 1. First, let's check the current status
SELECT id, title, status FROM projects WHERE id = 'a2505a79-1198-44ae-83fb-141c7168afbf';

-- 2. Temporarily disable RLS to update the status
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- 3. Update the project status to 'play'
UPDATE projects 
SET status = 'play' 
WHERE id = 'a2505a79-1198-44ae-83fb-141c7168afbf';

-- 4. Re-enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 5. Verify the update
SELECT id, title, status FROM projects WHERE id = 'a2505a79-1198-44ae-83fb-141c7168afbf';

-- 6. Check if there are any RLS policies with thread_id that might cause issues
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'projects' 
AND (qual LIKE '%thread_id%' OR with_check LIKE '%thread_id%');