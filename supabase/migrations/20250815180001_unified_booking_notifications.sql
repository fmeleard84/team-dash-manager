-- Système de notifications unifié pour le booking
-- Migration créée le: 2025-08-15

-- =============================================================================
-- 1. TABLE DE NOTIFICATIONS DE BOOKING UNIFIÉE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.booking_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    assignment_id UUID REFERENCES public.hr_resource_assignments(id) ON DELETE CASCADE,
    recipient_type TEXT CHECK (recipient_type IN ('client', 'candidate', 'team', 'admin')) NOT NULL,
    recipient_email TEXT NOT NULL,
    notification_type TEXT CHECK (notification_type IN (
        'mission_request',      -- Nouvelle demande de mission pour un candidat
        'mission_accepted',     -- Mission acceptée par un candidat
        'mission_declined',     -- Mission refusée par un candidat
        'mission_expired',      -- Mission expirée sans réponse
        'team_incomplete',      -- Équipe incomplète
        'team_complete',        -- Équipe complète (projet prêt)
        'project_ready',        -- Projet prêt à démarrer
        'resource_search',      -- Recherche de nouvelles ressources
        'booking_reminder'      -- Rappel pour répondre à une mission
    )) NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    status TEXT CHECK (status IN ('unread', 'read', 'archived')) DEFAULT 'unread',
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les notifications de booking
CREATE INDEX IF NOT EXISTS idx_booking_notifications_recipient ON public.booking_notifications(recipient_email, status);
CREATE INDEX IF NOT EXISTS idx_booking_notifications_project ON public.booking_notifications(project_id);
CREATE INDEX IF NOT EXISTS idx_booking_notifications_assignment ON public.booking_notifications(assignment_id);
CREATE INDEX IF NOT EXISTS idx_booking_notifications_type ON public.booking_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_booking_notifications_created ON public.booking_notifications(created_at DESC);

-- RLS pour les notifications de booking
ALTER TABLE public.booking_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "booking_notifications_select_policy" ON public.booking_notifications
  FOR SELECT
  USING (
    recipient_email = auth.get_current_user_email()
    OR auth.get_current_user_role() = 'admin'
  );

CREATE POLICY "booking_notifications_update_policy" ON public.booking_notifications
  FOR UPDATE
  USING (recipient_email = auth.get_current_user_email())
  WITH CHECK (recipient_email = auth.get_current_user_email());

-- Trigger pour updated_at
CREATE TRIGGER update_booking_notifications_updated_at 
  BEFORE UPDATE ON public.booking_notifications
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =============================================================================
-- 2. FONCTIONS POUR CRÉER LES NOTIFICATIONS DE BOOKING
-- =============================================================================

CREATE OR REPLACE FUNCTION create_mission_request_notification(
  assignment_id_param UUID,
  candidate_email_param TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  assignment_data RECORD;
BEGIN
  -- Récupérer les données de l'assignation
  SELECT 
    hrs.id,
    hrs.project_id,
    hrs.calculated_price,
    hrs.seniority,
    hrs.languages,
    hrs.expertises,
    hrs.expires_at,
    p.title as project_title,
    p.description as project_description,
    p.owner_id as client_email,
    hp.name as profile_name,
    hc.name as category_name,
    prof.first_name || ' ' || prof.last_name as client_name
  INTO assignment_data
  FROM public.hr_resource_assignments hrs
  JOIN public.projects p ON hrs.project_id = p.id
  JOIN public.hr_profiles hp ON hrs.profile_id = hp.id
  JOIN public.hr_categories hc ON hp.category_id = hc.id
  LEFT JOIN public.profiles prof ON p.owner_id = prof.email
  WHERE hrs.id = assignment_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assignment not found';
  END IF;

  -- Créer la notification pour le candidat
  INSERT INTO public.booking_notifications (
    project_id,
    assignment_id,
    recipient_type,
    recipient_email,
    notification_type,
    title,
    message,
    data,
    priority,
    expires_at
  ) VALUES (
    assignment_data.project_id,
    assignment_id_param,
    'candidate',
    candidate_email_param,
    'mission_request',
    format('Nouvelle mission : %s', assignment_data.profile_name),
    format('Une nouvelle mission vous est proposée pour le projet "%s" en tant que %s %s.', 
           assignment_data.project_title, 
           assignment_data.profile_name,
           assignment_data.seniority),
    jsonb_build_object(
      'project_title', assignment_data.project_title,
      'project_description', assignment_data.project_description,
      'profile_name', assignment_data.profile_name,
      'category_name', assignment_data.category_name,
      'seniority', assignment_data.seniority,
      'languages', assignment_data.languages,
      'expertises', assignment_data.expertises,
      'calculated_price', assignment_data.calculated_price,
      'client_name', assignment_data.client_name,
      'client_email', assignment_data.client_email
    ),
    'high',
    assignment_data.expires_at
  );

  -- Log
  RAISE NOTICE 'Created mission request notification for candidate % on project %', 
               candidate_email_param, assignment_data.project_title;
END;
$$;

CREATE OR REPLACE FUNCTION create_mission_response_notification(
  assignment_id_param UUID,
  candidate_email_param TEXT,
  response_type TEXT -- 'accepted' or 'declined'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  assignment_data RECORD;
  notification_title TEXT;
  notification_message TEXT;
  notification_type TEXT;
BEGIN
  -- Récupérer les données
  SELECT 
    hrs.project_id,
    p.title as project_title,
    p.owner_id as client_email,
    hp.name as profile_name,
    prof.first_name || ' ' || prof.last_name as candidate_name
  INTO assignment_data
  FROM public.hr_resource_assignments hrs
  JOIN public.projects p ON hrs.project_id = p.id
  JOIN public.hr_profiles hp ON hrs.profile_id = hp.id
  LEFT JOIN public.candidate_profiles cp ON cp.email = candidate_email_param
  LEFT JOIN public.profiles prof ON cp.id::text = prof.id::text
  WHERE hrs.id = assignment_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assignment not found';
  END IF;

  -- Construire le message selon le type de réponse
  IF response_type = 'accepted' THEN
    notification_type := 'mission_accepted';
    notification_title := format('Mission acceptée : %s', assignment_data.profile_name);
    notification_message := format('%s a accepté la mission %s pour le projet "%s".', 
                                  COALESCE(assignment_data.candidate_name, candidate_email_param),
                                  assignment_data.profile_name,
                                  assignment_data.project_title);
  ELSE
    notification_type := 'mission_declined';
    notification_title := format('Mission refusée : %s', assignment_data.profile_name);
    notification_message := format('%s a refusé la mission %s pour le projet "%s".', 
                                  COALESCE(assignment_data.candidate_name, candidate_email_param),
                                  assignment_data.profile_name,
                                  assignment_data.project_title);
  END IF;

  -- Créer la notification pour le client
  INSERT INTO public.booking_notifications (
    project_id,
    assignment_id,
    recipient_type,
    recipient_email,
    notification_type,
    title,
    message,
    data,
    priority
  ) VALUES (
    assignment_data.project_id,
    assignment_id_param,
    'client',
    assignment_data.client_email,
    notification_type,
    notification_title,
    notification_message,
    jsonb_build_object(
      'project_title', assignment_data.project_title,
      'profile_name', assignment_data.profile_name,
      'candidate_email', candidate_email_param,
      'candidate_name', assignment_data.candidate_name,
      'response_type', response_type
    ),
    CASE WHEN response_type = 'accepted' THEN 'medium' ELSE 'low' END
  );

  RAISE NOTICE 'Created % notification for client % on project %', 
               response_type, assignment_data.client_email, assignment_data.project_title;
END;
$$;

CREATE OR REPLACE FUNCTION create_project_ready_notification(project_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  project_data RECORD;
  resources_count INTEGER;
  resource_names TEXT[];
BEGIN
  -- Récupérer les données du projet
  SELECT 
    p.title,
    p.owner_id,
    prof.first_name || ' ' || prof.last_name as client_name
  INTO project_data
  FROM public.projects p
  LEFT JOIN public.profiles prof ON p.owner_id = prof.email
  WHERE p.id = project_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  -- Compter les ressources et récupérer leurs noms
  SELECT 
    COUNT(*),
    array_agg(hp.name)
  INTO resources_count, resource_names
  FROM public.hr_resource_assignments hrs
  JOIN public.hr_profiles hp ON hrs.profile_id = hp.id
  WHERE hrs.project_id = project_id_param 
    AND hrs.booking_status = 'accepted';

  -- Créer la notification pour le client
  INSERT INTO public.booking_notifications (
    project_id,
    recipient_type,
    recipient_email,
    notification_type,
    title,
    message,
    data,
    priority
  ) VALUES (
    project_id_param,
    'client',
    project_data.owner_id,
    'project_ready',
    'Équipe complète - Projet prêt à démarrer !',
    format('Félicitations ! Toutes les ressources (%s) sont maintenant assignées au projet "%s". Vous pouvez démarrer le projet.', 
           resources_count, project_data.title),
    jsonb_build_object(
      'project_title', project_data.title,
      'resources_count', resources_count,
      'resource_names', resource_names,
      'can_start', true,
      'next_action', 'start_project'
    ),
    'urgent'
  );

  RAISE NOTICE 'Created project ready notification for client % on project %', 
               project_data.owner_id, project_data.title;
END;
$$;

-- =============================================================================
-- 3. TRIGGERS POUR CRÉER AUTOMATIQUEMENT LES NOTIFICATIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION trigger_booking_notifications()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Nouvelle assignation créée
    IF NEW.booking_data ? 'candidate_email' THEN
      PERFORM create_mission_request_notification(
        NEW.id, 
        NEW.booking_data->>'candidate_email'
      );
    END IF;
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Statut de booking changé
    IF OLD.booking_status != NEW.booking_status THEN
      
      IF NEW.booking_status = 'accepted' THEN
        PERFORM create_mission_response_notification(
          NEW.id,
          NEW.booking_data->>'candidate_email',
          'accepted'
        );
        
        -- Vérifier si le projet est maintenant complet
        IF calculate_project_status(NEW.project_id) = 'pause' THEN
          PERFORM create_project_ready_notification(NEW.project_id);
        END IF;
        
      ELSIF NEW.booking_status = 'declined' THEN
        PERFORM create_mission_response_notification(
          NEW.id,
          NEW.booking_data->>'candidate_email',
          'declined'
        );
        
      ELSIF NEW.booking_status = 'expired' THEN
        -- TODO: Créer notification d'expiration et relancer recherche
        NULL;
      END IF;
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Créer le trigger sur hr_resource_assignments
CREATE TRIGGER trigger_booking_notifications_on_assignments
  AFTER INSERT OR UPDATE ON public.hr_resource_assignments
  FOR EACH ROW EXECUTE FUNCTION trigger_booking_notifications();

-- =============================================================================
-- 4. API POUR RÉCUPÉRER LES NOTIFICATIONS DE BOOKING
-- =============================================================================

CREATE OR REPLACE FUNCTION get_booking_notifications(
  user_email_param TEXT,
  limit_param INTEGER DEFAULT 20,
  offset_param INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  project_id UUID,
  project_title TEXT,
  notification_type TEXT,
  title TEXT,
  message TEXT,
  data JSONB,
  status TEXT,
  priority TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bn.id,
    bn.project_id,
    p.title as project_title,
    bn.notification_type,
    bn.title,
    bn.message,
    bn.data,
    bn.status,
    bn.priority,
    bn.created_at,
    bn.expires_at
  FROM public.booking_notifications bn
  LEFT JOIN public.projects p ON bn.project_id = p.id
  WHERE bn.recipient_email = user_email_param
    AND bn.status != 'archived'
  ORDER BY 
    CASE WHEN bn.status = 'unread' THEN 0 ELSE 1 END,
    CASE bn.priority 
      WHEN 'urgent' THEN 0 
      WHEN 'high' THEN 1 
      WHEN 'medium' THEN 2 
      ELSE 3 
    END,
    bn.created_at DESC
  LIMIT limit_param OFFSET offset_param;
END;
$$;

-- =============================================================================
-- 5. VUES POUR LE MONITORING DES NOTIFICATIONS
-- =============================================================================

CREATE OR REPLACE VIEW public.booking_notifications_summary AS
SELECT 
  notification_type,
  status,
  priority,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM public.booking_notifications
GROUP BY notification_type, status, priority
ORDER BY notification_type, status, priority;

-- =============================================================================
-- 6. FONCTION DE MAINTENANCE DES NOTIFICATIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_booking_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Supprimer les notifications archivées de plus de 30 jours
  DELETE FROM public.booking_notifications
  WHERE status = 'archived' 
    AND created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Archiver automatiquement les notifications lues de plus de 7 jours
  UPDATE public.booking_notifications
  SET status = 'archived', updated_at = NOW()
  WHERE status = 'read' 
    AND created_at < NOW() - INTERVAL '7 days';
    
  RETURN deleted_count;
END;
$$;

-- =============================================================================
-- 7. LOG DE LA MIGRATION
-- =============================================================================

INSERT INTO public.migration_logs (migration_name, applied_at, description) 
VALUES (
  '20250815180001_unified_booking_notifications',
  NOW(),
  'Added unified booking notification system with automatic triggers for mission requests, responses, and project status changes'
) ON CONFLICT (migration_name) DO NOTHING;