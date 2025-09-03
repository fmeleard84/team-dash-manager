-- Créer la fonction RPC exec_sql si elle n'existe pas
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
    rec record;
    results jsonb[] := '{}';
BEGIN
    -- Execute the SQL and convert results to JSON
    FOR rec IN EXECUTE sql LOOP
        results := array_append(results, to_jsonb(rec));
    END LOOP;
    
    -- Return as JSON array
    RETURN array_to_json(results)::jsonb;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'SQL execution failed: %', SQLERRM;
END;
$$;