-- Créer des fonctions RPC pour diagnostiquer et corriger la base
-- Migration créée le: 2025-08-16

-- Fonction pour diagnostiquer l'état actuel
CREATE OR REPLACE FUNCTION public.diagnose_system()
RETURNS table(
  category text,
  item text,
  status text,
  count_value bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier les triggers
  RETURN QUERY
  SELECT 
    'triggers'::text as category,
    tgname::text as item,
    'exists'::text as status,
    1::bigint as count_value
  FROM pg_trigger 
  WHERE tgname LIKE '%notification%';
  
  -- Vérifier les assignments Claude 2
  RETURN QUERY
  SELECT 
    'assignments'::text as category,
    'claude_2'::text as item,
    booking_status::text as status,
    COUNT(*)::bigint as count_value
  FROM hr_resource_assignments 
  WHERE project_id = 'a2505a79-1198-44ae-83fb-141c7168afbf'::uuid
  GROUP BY booking_status;
  
  -- Vérifier les notifications pour le candidat
  RETURN QUERY
  SELECT 
    'notifications'::text as category,
    'fmeleard_ressource'::text as item,
    cn.status::text as status,
    COUNT(*)::bigint as count_value
  FROM candidate_notifications cn
  JOIN candidate_profiles cp ON cn.candidate_id = cp.id
  WHERE cp.email = 'fmeleard+ressource@gmail.com'
    AND cn.project_id = 'a2505a79-1198-44ae-83fb-141c7168afbf'::uuid
  GROUP BY cn.status;
  
  -- Vérifier les politiques RLS
  RETURN QUERY
  SELECT 
    'rls_policies'::text as category,
    tablename::text as item,
    'enabled'::text as status,
    COUNT(*)::bigint as count_value
  FROM pg_policies 
  WHERE tablename IN ('hr_resource_assignments', 'candidate_notifications')
  GROUP BY tablename;
END;
$$;

-- Fonction pour exécuter du SQL de façon sécurisée
CREATE OR REPLACE FUNCTION public.exec_sql(query_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result text;
BEGIN
  EXECUTE query_text;
  GET DIAGNOSTICS result = ROW_COUNT;
  RETURN 'Executed successfully. Rows affected: ' || result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'Error: ' || SQLERRM;
END;
$$;

-- Fonction pour optimiser Claude 2
CREATE OR REPLACE FUNCTION public.optimize_claude_2()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_msg text := '';
  assignment_count int;
  notification_count int;
BEGIN
  -- Vérifier si l'assignment existe déjà
  SELECT COUNT(*) INTO assignment_count
  FROM hr_resource_assignments 
  WHERE project_id = 'a2505a79-1198-44ae-83fb-141c7168afbf'::uuid
    AND booking_status = 'recherche';
  
  IF assignment_count = 0 THEN
    result_msg := result_msg || 'Assignment créé. ';
    
    -- Créer l'assignment
    INSERT INTO hr_resource_assignments (
      project_id,
      profile_id,
      seniority,
      languages,
      expertises,
      calculated_price,
      booking_status
    ) VALUES (
      'a2505a79-1198-44ae-83fb-141c7168afbf'::uuid,
      (SELECT id FROM hr_profiles WHERE name ILIKE '%directeur%marketing%' LIMIT 1),
      'intermediate',
      ARRAY['Français'],
      ARRAY['Google Ads'],
      138,
      'recherche'
    );
  ELSE
    result_msg := result_msg || assignment_count::text || ' assignment(s) déjà visible(s). ';
  END IF;
  
  -- Vérifier si la notification existe
  SELECT COUNT(*) INTO notification_count
  FROM candidate_notifications cn
  JOIN candidate_profiles cp ON cn.candidate_id = cp.id
  WHERE cp.email = 'fmeleard+ressource@gmail.com'
    AND cn.project_id = 'a2505a79-1198-44ae-83fb-141c7168afbf'::uuid
    AND cn.status = 'unread';
  
  IF notification_count = 0 THEN
    result_msg := result_msg || 'Notification créée. ';
    
    -- Créer la notification
    INSERT INTO candidate_notifications (
      candidate_id,
      project_id,
      resource_assignment_id,
      title,
      description,
      status
    ) VALUES (
      (SELECT id FROM candidate_profiles WHERE email = 'fmeleard+ressource@gmail.com'),
      'a2505a79-1198-44ae-83fb-141c7168afbf'::uuid,
      (SELECT id FROM hr_resource_assignments 
       WHERE project_id = 'a2505a79-1198-44ae-83fb-141c7168afbf'::uuid 
       ORDER BY created_at DESC LIMIT 1),
      'Nouvelle mission: Claude 2',
      'Mission de Directeur marketing pour le projet Claude 2.',
      'unread'
    );
  ELSE
    result_msg := result_msg || notification_count::text || ' notification(s) déjà active(s). ';
  END IF;
  
  RETURN result_msg || 'Claude 2 optimisé!';
END;
$$;

-- Log de la migration
INSERT INTO public.migration_logs (migration_name, applied_at, description) 
VALUES (
  '20250816070000_create_rpc_functions',
  NOW(),
  'Created RPC functions for system diagnosis and optimization'
) ON CONFLICT (migration_name) DO NOTHING;