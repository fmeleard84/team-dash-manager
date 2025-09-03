-- Check the constraint on projects.status
SELECT 
    conname AS constraint_name,
    pg_catalog.pg_get_constraintdef(c.oid, true) AS constraint_definition
FROM 
    pg_catalog.pg_constraint c
JOIN 
    pg_catalog.pg_class t ON c.conrelid = t.oid
WHERE 
    t.relname = 'projects' 
    AND conname LIKE '%status%';

-- Check the actual values in the status column
SELECT DISTINCT status, COUNT(*) 
FROM projects 
GROUP BY status 
ORDER BY status;