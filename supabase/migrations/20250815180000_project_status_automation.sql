-- Automatisation des transitions de statuts de projets
-- Migration créée le: 2025-08-15

-- =============================================================================
-- 1. FONCTION POUR CALCULER LE STATUT AUTOMATIQUE D'UN PROJET
-- =============================================================================

CREATE OR REPLACE FUNCTION calculate_project_status(project_id_param UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  total_assignments INTEGER;
  accepted_assignments INTEGER;
  pending_assignments INTEGER;
  expired_assignments INTEGER;
  project_status TEXT;
BEGIN
  -- Compter les assignations par statut
  SELECT 
    COUNT(*),
    COUNT(CASE WHEN booking_status = 'accepted' THEN 1 END),
    COUNT(CASE WHEN booking_status = 'recherche' THEN 1 END),
    COUNT(CASE WHEN booking_status = 'expired' THEN 1 END)
  INTO 
    total_assignments,
    accepted_assignments,
    pending_assignments,
    expired_assignments
  FROM public.hr_resource_assignments
  WHERE project_id = project_id_param;

  -- Si pas d'assignations, le projet reste nouveau
  IF total_assignments = 0 THEN
    RETURN 'nouveaux';
  END IF;

  -- Si toutes les ressources sont acceptées, le projet est prêt (pause)
  IF accepted_assignments = total_assignments THEN
    RETURN 'pause';
  END IF;

  -- Si au moins une ressource est acceptée, le projet est en attente d'équipe
  IF accepted_assignments > 0 THEN
    RETURN 'attente-team';
  END IF;

  -- Si toutes les assignations ont expiré sans acceptation
  IF expired_assignments = total_assignments THEN
    RETURN 'nouveaux';
  END IF;

  -- Sinon, le projet reste nouveau (en cours de recherche)
  RETURN 'nouveaux';
END;
$$;

-- =============================================================================
-- 2. FONCTION POUR METTRE À JOUR LE STATUT D'UN PROJET
-- =============================================================================

CREATE OR REPLACE FUNCTION update_project_status_automatically(project_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_status TEXT;
  current_status TEXT;
  project_title TEXT;
  project_owner TEXT;
BEGIN
  -- Calculer le nouveau statut
  new_status := calculate_project_status(project_id_param);
  
  -- Récupérer le statut actuel et les infos du projet
  SELECT status, title, owner_id 
  INTO current_status, project_title, project_owner
  FROM public.projects 
  WHERE id = project_id_param;

  -- Si le statut a changé, le mettre à jour
  IF current_status != new_status THEN
    UPDATE public.projects 
    SET 
      status = new_status,
      updated_at = NOW()
    WHERE id = project_id_param;

    -- Logger le changement
    INSERT INTO public.migration_logs (migration_name, applied_at, description)
    VALUES (
      'project_status_change_' || project_id_param::text,
      NOW(),
      format('Project %s status changed from %s to %s', project_title, current_status, new_status)
    );

    -- Créer des notifications selon le nouveau statut
    IF new_status = 'pause' THEN
      -- Toutes les ressources sont assignées, notifier le client
      INSERT INTO public.candidate_notifications (
        candidate_email,
        type,
        title,
        message,
        project_id,
        status,
        priority,
        metadata
      ) VALUES (
        project_owner,
        'project_ready',
        'Projet prêt à démarrer !',
        format('Toutes les ressources sont maintenant assignées au projet "%s". Vous pouvez le démarrer.', project_title),
        project_id_param,
        'unread',
        'high',
        jsonb_build_object(
          'project_id', project_id_param,
          'project_title', project_title,
          'old_status', current_status,
          'new_status', new_status,
          'can_start', true
        )
      );
    ELSIF new_status = 'attente-team' AND current_status = 'nouveaux' THEN
      -- Premières ressources assignées
      INSERT INTO public.candidate_notifications (
        candidate_email,
        type,
        title,
        message,
        project_id,
        status,
        priority,
        metadata
      ) VALUES (
        project_owner,
        'team_progress',
        'Constitution d\'équipe en cours',
        format('Des ressources ont accepté de rejoindre le projet "%s". Constitution de l\'équipe en cours.', project_title),
        project_id_param,
        'unread',
        'medium',
        jsonb_build_object(
          'project_id', project_id_param,
          'project_title', project_title,
          'old_status', current_status,
          'new_status', new_status
        )
      );
    END IF;

    RAISE NOTICE 'Project % status updated from % to %', project_title, current_status, new_status;
  END IF;
END;
$$;

-- =============================================================================
-- 3. TRIGGER POUR MISE À JOUR AUTOMATIQUE DU STATUT
-- =============================================================================

CREATE OR REPLACE FUNCTION trigger_project_status_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Mettre à jour le statut du projet concerné
  IF TG_OP = 'INSERT' THEN
    PERFORM update_project_status_automatically(NEW.project_id);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Vérifier si le booking_status a changé
    IF OLD.booking_status != NEW.booking_status THEN
      PERFORM update_project_status_automatically(NEW.project_id);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM update_project_status_automatically(OLD.project_id);
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Supprimer le trigger existant s'il existe
DROP TRIGGER IF EXISTS update_project_status_on_assignment_change ON public.hr_resource_assignments;

-- Créer le nouveau trigger
CREATE TRIGGER update_project_status_on_assignment_change
  AFTER INSERT OR UPDATE OR DELETE ON public.hr_resource_assignments
  FOR EACH ROW EXECUTE FUNCTION trigger_project_status_update();

-- =============================================================================
-- 4. FONCTION POUR VÉRIFIER LES PRÉREQUIS AVANT DÉMARRAGE
-- =============================================================================

CREATE OR REPLACE FUNCTION check_project_can_start(project_id_param UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  project_data RECORD;
  assignments_data RECORD;
  result jsonb;
  missing_resources jsonb[] := '{}';
  warnings jsonb[] := '{}';
BEGIN
  -- Récupérer les données du projet
  SELECT * INTO project_data
  FROM public.projects
  WHERE id = project_id_param;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'can_start', false,
      'error', 'Project not found'
    );
  END IF;

  -- Analyser les assignations
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN booking_status = 'accepted' THEN 1 END) as accepted,
    COUNT(CASE WHEN booking_status = 'recherche' THEN 1 END) as pending,
    COUNT(CASE WHEN booking_status = 'expired' THEN 1 END) as expired,
    jsonb_agg(
      CASE WHEN booking_status != 'accepted' THEN
        jsonb_build_object(
          'profile_name', hr_profiles.name,
          'category', hr_categories.name,
          'status', booking_status,
          'seniority', seniority
        )
      END
    ) FILTER (WHERE booking_status != 'accepted') as missing
  INTO assignments_data
  FROM public.hr_resource_assignments hrs
  LEFT JOIN public.hr_profiles ON hrs.profile_id = hr_profiles.id
  LEFT JOIN public.hr_categories ON hr_profiles.category_id = hr_categories.id
  WHERE hrs.project_id = project_id_param;

  -- Construire la réponse
  result := jsonb_build_object(
    'can_start', assignments_data.accepted = assignments_data.total AND assignments_data.total > 0,
    'project_status', project_data.status,
    'resources', jsonb_build_object(
      'total', assignments_data.total,
      'accepted', assignments_data.accepted,
      'pending', assignments_data.pending,
      'expired', assignments_data.expired
    )
  );

  -- Ajouter les ressources manquantes si nécessaire
  IF assignments_data.missing IS NOT NULL THEN
    result := result || jsonb_build_object('missing_resources', assignments_data.missing);
  END IF;

  -- Ajouter des warnings si nécessaire
  IF assignments_data.total = 0 THEN
    warnings := warnings || jsonb_build_object('type', 'no_resources', 'message', 'Aucune ressource assignée au projet');
  END IF;

  IF assignments_data.pending > 0 THEN
    warnings := warnings || jsonb_build_object(
      'type', 'pending_resources', 
      'message', format('%s ressource(s) en attente de réponse', assignments_data.pending)
    );
  END IF;

  IF assignments_data.expired > 0 THEN
    warnings := warnings || jsonb_build_object(
      'type', 'expired_resources', 
      'message', format('%s ressource(s) expirée(s), recherche à relancer', assignments_data.expired)
    );
  END IF;

  IF array_length(warnings, 1) > 0 THEN
    result := result || jsonb_build_object('warnings', to_jsonb(warnings));
  END IF;

  RETURN result;
END;
$$;

-- =============================================================================
-- 5. FONCTION DE MAINTENANCE POUR CORRIGER LES STATUTS
-- =============================================================================

CREATE OR REPLACE FUNCTION fix_all_project_statuses()
RETURNS TABLE(project_id UUID, old_status TEXT, new_status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  project_record RECORD;
  calculated_status TEXT;
BEGIN
  FOR project_record IN 
    SELECT id, status, title 
    FROM public.projects 
    WHERE status IN ('nouveaux', 'attente-team', 'pause')
  LOOP
    calculated_status := calculate_project_status(project_record.id);
    
    IF project_record.status != calculated_status THEN
      UPDATE public.projects 
      SET 
        status = calculated_status,
        updated_at = NOW()
      WHERE id = project_record.id;
      
      project_id := project_record.id;
      old_status := project_record.status;
      new_status := calculated_status;
      
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

-- =============================================================================
-- 6. VUES POUR MONITORING
-- =============================================================================

-- Vue pour suivre l'état des projets
CREATE OR REPLACE VIEW public.projects_status_summary AS
SELECT 
  p.id,
  p.title,
  p.status as current_status,
  calculate_project_status(p.id) as calculated_status,
  p.status != calculate_project_status(p.id) as needs_update,
  p.created_at,
  p.updated_at,
  (
    SELECT COUNT(*) 
    FROM public.hr_resource_assignments 
    WHERE project_id = p.id
  ) as total_resources,
  (
    SELECT COUNT(*) 
    FROM public.hr_resource_assignments 
    WHERE project_id = p.id AND booking_status = 'accepted'
  ) as accepted_resources,
  (
    SELECT COUNT(*) 
    FROM public.hr_resource_assignments 
    WHERE project_id = p.id AND booking_status = 'recherche'
  ) as pending_resources
FROM public.projects p
WHERE p.status IN ('nouveaux', 'attente-team', 'pause');

-- =============================================================================
-- 7. DONNÉES DE TEST ET CORRECTION
-- =============================================================================

-- Corriger tous les statuts existants
SELECT fix_all_project_statuses();

-- =============================================================================
-- 8. LOG DE LA MIGRATION
-- =============================================================================

INSERT INTO public.migration_logs (migration_name, applied_at, description) 
VALUES (
  '20250815180000_project_status_automation',
  NOW(),
  'Added automatic project status transitions based on resource booking status with triggers and validation functions'
) ON CONFLICT (migration_name) DO NOTHING;