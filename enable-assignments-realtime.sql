-- Enable realtime for hr_resource_assignments
ALTER PUBLICATION supabase_realtime ADD TABLE hr_resource_assignments;

-- Verify realtime is enabled
SELECT 
    schemaname,
    tablename
FROM 
    pg_publication_tables
WHERE 
    pubname = 'supabase_realtime'
    AND tablename = 'hr_resource_assignments';