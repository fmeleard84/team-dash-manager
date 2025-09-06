-- ================================================
-- Migration: Fix project_events RLS permissions
-- Date: 2025-09-05
-- Issue: Les candidats ne peuvent pas voir les événements kickoff
-- ================================================

-- 1. Supprimer l'ancienne politique problématique
DROP POLICY IF EXISTS "Candidates can view their project events" ON public.project_events;

-- 2. Créer une fonction améliorée qui gère correctement les candidats
CREATE OR REPLACE FUNCTION public.user_can_view_project_event(event_row project_events)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  v_user_email text;
  v_candidate_id uuid;
  v_client_id uuid;
BEGIN
  -- Récupérer l'email de l'utilisateur courant
  SELECT email INTO v_user_email 
  FROM auth.users 
  WHERE id = auth.uid();
  
  IF v_user_email IS NULL THEN
    RETURN false;
  END IF;
  
  -- Vérifier si l'utilisateur est le client propriétaire du projet
  SELECT id INTO v_client_id
  FROM client_profiles
  WHERE email = v_user_email;
  
  IF v_client_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM projects 
      WHERE id = event_row.project_id 
      AND owner_id = v_client_id
    ) THEN
      RETURN true;
    END IF;
  END IF;
  
  -- Vérifier si l'utilisateur est un candidat accepté sur ce projet
  SELECT id INTO v_candidate_id
  FROM candidate_profiles
  WHERE email = v_user_email;
  
  IF v_candidate_id IS NOT NULL THEN
    -- Vérifier via hr_resource_assignments (source de vérité)
    IF EXISTS (
      SELECT 1 
      FROM hr_resource_assignments
      WHERE project_id = event_row.project_id
      AND candidate_id = v_candidate_id
      AND booking_status = 'accepted'
    ) THEN
      RETURN true;
    END IF;
    
    -- Vérifier aussi dans project_teams (backup)
    IF EXISTS (
      SELECT 1 
      FROM project_teams
      WHERE project_id = event_row.project_id
      AND member_id = v_candidate_id
    ) THEN
      RETURN true;
    END IF;
  END IF;
  
  -- Vérifier si l'utilisateur est dans les attendees
  IF EXISTS (
    SELECT 1 
    FROM project_event_attendees
    WHERE event_id = event_row.id
    AND email = v_user_email
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- 3. Créer une nouvelle politique simple et efficace
CREATE POLICY "All users can view their project events" 
ON public.project_events 
FOR SELECT 
USING (
  user_can_view_project_event(project_events)
);

-- 4. Créer aussi des politiques pour INSERT/UPDATE/DELETE (clients uniquement)
CREATE POLICY "Clients can create events"
ON public.project_events
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects p
    JOIN client_profiles cp ON cp.id = p.owner_id
    WHERE p.id = project_id
    AND cp.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

CREATE POLICY "Clients can update their events"
ON public.project_events
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM projects p
    JOIN client_profiles cp ON cp.id = p.owner_id
    WHERE p.id = project_id
    AND cp.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

CREATE POLICY "Clients can delete their events"
ON public.project_events
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM projects p
    JOIN client_profiles cp ON cp.id = p.owner_id
    WHERE p.id = project_id
    AND cp.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- 5. S'assurer que RLS est activé
ALTER TABLE public.project_events ENABLE ROW LEVEL SECURITY;

-- 6. Grant des permissions appropriées
GRANT SELECT ON public.project_events TO authenticated;
GRANT ALL ON public.project_events TO service_role;