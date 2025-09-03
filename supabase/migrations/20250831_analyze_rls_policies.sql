-- Create function to analyze RLS policies
CREATE OR REPLACE FUNCTION analyze_rls_policies()
RETURNS TABLE (
    schema_name text,
    table_name text,
    policy_name text,
    permissive text,
    roles text[],
    command text,
    qualifier text,
    with_check_clause text
) 
LANGUAGE sql 
SECURITY DEFINER
AS $$
    SELECT 
        schemaname::text,
        tablename::text,
        policyname::text,
        permissive::text,
        roles,
        cmd::text,
        qual::text,
        with_check::text
    FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects'
    ORDER BY cmd, policyname;
$$;