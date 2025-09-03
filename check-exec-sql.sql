-- Vérifier si la fonction RPC exec_sql existe
SELECT 
    proname as function_name,
    proargtypes,
    prosrc as source_code
FROM pg_proc 
WHERE proname = 'exec_sql';