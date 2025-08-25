-- Créer une fonction RPC pour exécuter du SQL directement
-- Migration créée le: 2025-08-16

CREATE OR REPLACE FUNCTION public.exec_sql(query text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result text;
BEGIN
    EXECUTE query;
    RETURN 'Query executed successfully';
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'Error: ' || SQLERRM;
END;
$$;

-- Fonction pour supprimer le trigger problématique
CREATE OR REPLACE FUNCTION public.fix_notification_trigger()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result_msg text := '';
BEGIN
    -- Supprimer le trigger problématique
    BEGIN
        DROP TRIGGER IF EXISTS trigger_create_notifications_on_assignment_change ON public.hr_resource_assignments;
        result_msg := result_msg || 'Trigger supprimé. ';
    EXCEPTION 
        WHEN OTHERS THEN
            result_msg := result_msg || 'Erreur trigger: ' || SQLERRM || '. ';
    END;
    
    -- Supprimer la fonction problématique
    BEGIN
        DROP FUNCTION IF EXISTS public.create_notifications_for_assignment() CASCADE;
        result_msg := result_msg || 'Fonction supprimée. ';
    EXCEPTION 
        WHEN OTHERS THEN
            result_msg := result_msg || 'Erreur fonction: ' || SQLERRM || '. ';
    END;
    
    RETURN result_msg || 'Fix terminé!';
END;
$$;

-- Log de la migration
INSERT INTO public.migration_logs (migration_name, applied_at, description) 
VALUES (
  '20250816000001_create_sql_executor',
  NOW(),
  'Created RPC functions to execute SQL and fix notification trigger issues'
) ON CONFLICT (migration_name) DO NOTHING;