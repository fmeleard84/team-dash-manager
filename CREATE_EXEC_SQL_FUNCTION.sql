-- Créer une fonction pour exécuter du SQL dynamiquement
-- ATTENTION : Cette fonction est TRÈS PUISSANTE et doit être sécurisée !

CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    -- Sécurité : Limiter aux super admins seulement
    IF auth.uid() IS NULL OR auth.uid() NOT IN (
        SELECT id FROM profiles WHERE role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;
    
    -- Exécuter la requête
    EXECUTE sql_query;
    
    RETURN json_build_object('success', true, 'message', 'SQL executed successfully');
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Donner les permissions
GRANT EXECUTE ON FUNCTION exec_sql TO service_role;
GRANT EXECUTE ON FUNCTION exec_sql TO authenticated;