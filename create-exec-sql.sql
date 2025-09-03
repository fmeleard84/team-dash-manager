-- Créer la fonction exec_sql pour permettre l'exécution de SQL dynamique
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    -- Exécuter le SQL et retourner le résultat
    EXECUTE sql INTO result;
    RETURN result;
EXCEPTION WHEN OTHERS THEN
    -- En cas d'erreur, retourner null
    RETURN json_build_object('error', SQLERRM);
END;
$$;

-- Donner les permissions appropriées
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;