-- Migration pour gérer les transitions et modifications de ressources
-- Permet de tracker les changements de profil, séniorité et compétences

-- Table pour tracker les transitions de ressources
CREATE TABLE IF NOT EXISTS public.resource_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES public.hr_resource_assignments(id) ON DELETE CASCADE,
  
  -- Type de transition
  transition_type TEXT NOT NULL CHECK (transition_type IN ('profile_change', 'seniority_change', 'skill_update')),
  
  -- Ancien candidat et configuration
  previous_candidate_id UUID REFERENCES public.candidate_profiles(id),
  previous_profile_id UUID REFERENCES public.hr_profiles(id),
  previous_seniority TEXT,
  previous_languages TEXT[],
  previous_expertises TEXT[],
  
  -- Nouvelle configuration demandée
  new_profile_id UUID REFERENCES public.hr_profiles(id),
  new_seniority TEXT,
  new_languages TEXT[],
  new_expertises TEXT[],
  
  -- État de la transition
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'searching', 'candidate_found', 'completed', 'cancelled')),
  new_candidate_id UUID REFERENCES public.candidate_profiles(id),
  
  -- Raison et métadonnées
  reason TEXT,
  notification_message TEXT, -- Message personnalisé pour le candidat sortant
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT unique_active_transition UNIQUE (assignment_id, status) 
    WHERE status IN ('pending', 'searching', 'candidate_found')
);

-- Table pour les accès projet (Drive, Kanban, Messagerie)
CREATE TABLE IF NOT EXISTS public.project_access_rights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES public.hr_resource_assignments(id) ON DELETE SET NULL,
  
  -- Droits d'accès détaillés
  has_drive_access BOOLEAN DEFAULT false,
  has_kanban_access BOOLEAN DEFAULT false,
  has_messaging_access BOOLEAN DEFAULT false,
  
  -- Permissions spécifiques Drive
  drive_folders TEXT[], -- Dossiers accessibles
  drive_permissions TEXT DEFAULT 'read', -- read, write, admin
  
  -- État des accès
  access_status TEXT NOT NULL DEFAULT 'active' CHECK (access_status IN ('active', 'revoked', 'pending_transfer', 'transferred')),
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  transferred_to UUID REFERENCES public.candidate_profiles(id),
  transferred_at TIMESTAMPTZ,
  
  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Contrainte pour éviter les doublons actifs
  CONSTRAINT unique_active_access UNIQUE (project_id, candidate_id, assignment_id) 
    WHERE access_status = 'active'
);

-- Table d'historique des changements de ressources
CREATE TABLE IF NOT EXISTS public.resource_change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES public.hr_resource_assignments(id) ON DELETE SET NULL,
  
  -- Type de changement
  change_type TEXT NOT NULL CHECK (change_type IN (
    'profile_replaced',     -- Métier A remplacé par métier Y
    'seniority_upgraded',   -- Junior → Senior
    'seniority_downgraded', -- Senior → Junior
    'skills_added',         -- Ajout de langues/expertises
    'skills_removed',       -- Retrait de langues/expertises
    'candidate_replaced'    -- Remplacement suite à indisponibilité
  )),
  
  -- Détails du changement
  from_state JSONB NOT NULL, -- État avant changement
  to_state JSONB NOT NULL,   -- État après changement
  
  -- Candidats impactés
  removed_candidate_id UUID REFERENCES public.candidate_profiles(id),
  added_candidate_id UUID REFERENCES public.candidate_profiles(id),
  
  -- Impact
  required_rebooking BOOLEAN DEFAULT false,
  access_transferred BOOLEAN DEFAULT false,
  
  -- Métadonnées
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT now(),
  change_reason TEXT
);

-- Ajouter des colonnes à hr_resource_assignments pour tracker le candidat actuel
ALTER TABLE public.hr_resource_assignments 
ADD COLUMN IF NOT EXISTS current_candidate_id UUID REFERENCES public.candidate_profiles(id),
ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS modification_in_progress BOOLEAN DEFAULT false;

-- Fonction pour détecter les changements critiques
CREATE OR REPLACE FUNCTION public.detect_critical_changes(
  p_assignment_id UUID,
  p_new_profile_id UUID,
  p_new_seniority TEXT,
  p_new_languages TEXT[],
  p_new_expertises TEXT[]
)
RETURNS TABLE (
  change_type TEXT,
  requires_rebooking BOOLEAN,
  impact_description TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_assignment RECORD;
  v_current_candidate RECORD;
  v_change_type TEXT;
  v_requires_rebooking BOOLEAN := false;
  v_impact TEXT;
BEGIN
  -- Récupérer l'assignation actuelle
  SELECT 
    ra.*,
    hp.name as profile_name
  INTO v_current_assignment
  FROM hr_resource_assignments ra
  JOIN hr_profiles hp ON hp.id = ra.profile_id
  WHERE ra.id = p_assignment_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assignment not found';
  END IF;
  
  -- Si pas de candidat actuellement booké, pas besoin de rebooking
  IF v_current_assignment.booking_status NOT IN ('accepted', 'booké') OR 
     v_current_assignment.current_candidate_id IS NULL THEN
    RETURN QUERY SELECT 
      'no_active_booking'::TEXT,
      false,
      'Pas de candidat actuellement assigné'::TEXT;
    RETURN;
  END IF;
  
  -- Récupérer les infos du candidat actuel
  SELECT 
    cp.*,
    array_agg(DISTINCT cl.language_id) as candidate_languages,
    array_agg(DISTINCT ce.expertise_id) as candidate_expertises
  INTO v_current_candidate
  FROM candidate_profiles cp
  LEFT JOIN candidate_languages cl ON cl.candidate_id = cp.id
  LEFT JOIN candidate_expertises ce ON ce.candidate_id = cp.id
  WHERE cp.id = v_current_assignment.current_candidate_id
  GROUP BY cp.id;
  
  -- CAS 1: Changement de profil/métier
  IF p_new_profile_id IS NOT NULL AND p_new_profile_id != v_current_assignment.profile_id THEN
    RETURN QUERY SELECT 
      'profile_change'::TEXT,
      true,
      format('Changement de métier: %s sera remplacé', v_current_assignment.profile_name)::TEXT;
    RETURN;
  END IF;
  
  -- CAS 2: Changement de séniorité
  IF p_new_seniority IS NOT NULL AND p_new_seniority != v_current_assignment.seniority THEN
    -- Vérifier si le candidat actuel a la bonne séniorité
    IF v_current_candidate.seniority != p_new_seniority THEN
      RETURN QUERY SELECT 
        'seniority_change'::TEXT,
        true,
        format('Changement de séniorité: %s → %s', v_current_assignment.seniority, p_new_seniority)::TEXT;
      RETURN;
    END IF;
  END IF;
  
  -- CAS 3: Ajout/modification de compétences
  IF p_new_languages IS NOT NULL OR p_new_expertises IS NOT NULL THEN
    DECLARE
      v_missing_languages TEXT[];
      v_missing_expertises TEXT[];
    BEGIN
      -- Vérifier les langues manquantes
      IF p_new_languages IS NOT NULL THEN
        SELECT array_agg(lang)
        INTO v_missing_languages
        FROM unnest(p_new_languages) lang
        WHERE lang NOT IN (SELECT unnest(v_current_candidate.candidate_languages));
      END IF;
      
      -- Vérifier les expertises manquantes
      IF p_new_expertises IS NOT NULL THEN
        SELECT array_agg(exp)
        INTO v_missing_expertises
        FROM unnest(p_new_expertises) exp
        WHERE exp NOT IN (SELECT unnest(v_current_candidate.candidate_expertises));
      END IF;
      
      -- Si des compétences manquent
      IF (v_missing_languages IS NOT NULL AND array_length(v_missing_languages, 1) > 0) OR
         (v_missing_expertises IS NOT NULL AND array_length(v_missing_expertises, 1) > 0) THEN
        
        v_impact := 'Compétences manquantes: ';
        IF v_missing_languages IS NOT NULL AND array_length(v_missing_languages, 1) > 0 THEN
          v_impact := v_impact || 'Langues: ' || array_to_string(v_missing_languages, ', ');
        END IF;
        IF v_missing_expertises IS NOT NULL AND array_length(v_missing_expertises, 1) > 0 THEN
          IF v_missing_languages IS NOT NULL THEN
            v_impact := v_impact || ' | ';
          END IF;
          v_impact := v_impact || 'Expertises: ' || array_to_string(v_missing_expertises, ', ');
        END IF;
        
        RETURN QUERY SELECT 
          'skill_update'::TEXT,
          true,
          v_impact::TEXT;
        RETURN;
      END IF;
    END;
  END IF;
  
  -- Aucun changement critique détecté
  RETURN QUERY SELECT 
    'no_critical_change'::TEXT,
    false,
    'Le candidat actuel possède toutes les compétences requises'::TEXT;
END;
$$;

-- Fonction pour révoquer les accès d'un candidat
CREATE OR REPLACE FUNCTION public.revoke_candidate_access(
  p_candidate_id UUID,
  p_project_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Mettre à jour les droits d'accès
  UPDATE project_access_rights
  SET 
    access_status = 'revoked',
    revoked_at = now(),
    revoked_reason = p_reason,
    updated_at = now()
  WHERE 
    candidate_id = p_candidate_id 
    AND project_id = p_project_id
    AND access_status = 'active';
  
  -- Créer une notification pour le candidat
  INSERT INTO candidate_notifications (
    candidate_id,
    project_id,
    title,
    description,
    type,
    status
  ) VALUES (
    p_candidate_id,
    p_project_id,
    'Modification du projet',
    COALESCE(p_reason, 'Le client a modifié les besoins du projet. Votre accès a été révoqué.'),
    'access_revoked',
    'unread'
  );
  
  RETURN true;
END;
$$;

-- Fonction pour transférer les accès projet
CREATE OR REPLACE FUNCTION public.transfer_project_access(
  p_from_candidate_id UUID,
  p_to_candidate_id UUID,
  p_project_id UUID,
  p_assignment_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_previous_access RECORD;
BEGIN
  -- Récupérer les accès actuels
  SELECT * INTO v_previous_access
  FROM project_access_rights
  WHERE 
    candidate_id = p_from_candidate_id 
    AND project_id = p_project_id
    AND access_status = 'active'
  LIMIT 1;
  
  IF NOT FOUND THEN
    -- Pas d'accès à transférer, créer de nouveaux accès
    INSERT INTO project_access_rights (
      project_id,
      candidate_id,
      assignment_id,
      has_drive_access,
      has_kanban_access,
      has_messaging_access,
      access_status
    ) VALUES (
      p_project_id,
      p_to_candidate_id,
      p_assignment_id,
      true,
      true,
      true,
      'active'
    );
  ELSE
    -- Marquer l'ancien accès comme transféré
    UPDATE project_access_rights
    SET 
      access_status = 'transferred',
      transferred_to = p_to_candidate_id,
      transferred_at = now(),
      updated_at = now()
    WHERE 
      id = v_previous_access.id;
    
    -- Créer les nouveaux accès avec les mêmes permissions
    INSERT INTO project_access_rights (
      project_id,
      candidate_id,
      assignment_id,
      has_drive_access,
      has_kanban_access,
      has_messaging_access,
      drive_folders,
      drive_permissions,
      access_status
    ) VALUES (
      p_project_id,
      p_to_candidate_id,
      p_assignment_id,
      v_previous_access.has_drive_access,
      v_previous_access.has_kanban_access,
      v_previous_access.has_messaging_access,
      v_previous_access.drive_folders,
      v_previous_access.drive_permissions,
      'active'
    );
  END IF;
  
  -- Mettre à jour l'assignation avec le nouveau candidat
  UPDATE hr_resource_assignments
  SET 
    current_candidate_id = p_to_candidate_id,
    last_modified_at = now()
  WHERE 
    id = p_assignment_id;
  
  RETURN true;
END;
$$;

-- Indexes pour les performances
CREATE INDEX IF NOT EXISTS idx_resource_transitions_assignment ON resource_transitions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_resource_transitions_status ON resource_transitions(status);
CREATE INDEX IF NOT EXISTS idx_resource_transitions_project ON resource_transitions(project_id);

CREATE INDEX IF NOT EXISTS idx_project_access_rights_candidate ON project_access_rights(candidate_id);
CREATE INDEX IF NOT EXISTS idx_project_access_rights_project ON project_access_rights(project_id);
CREATE INDEX IF NOT EXISTS idx_project_access_rights_status ON project_access_rights(access_status);

CREATE INDEX IF NOT EXISTS idx_resource_change_history_project ON resource_change_history(project_id);
CREATE INDEX IF NOT EXISTS idx_resource_change_history_assignment ON resource_change_history(assignment_id);

-- RLS Policies
ALTER TABLE public.resource_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_access_rights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_change_history ENABLE ROW LEVEL SECURITY;

-- Policies pour resource_transitions
CREATE POLICY "Users can view their project transitions" ON public.resource_transitions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = resource_transitions.project_id 
    AND projects.owner_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.candidate_profiles cp
    WHERE (cp.id = resource_transitions.previous_candidate_id 
           OR cp.id = resource_transitions.new_candidate_id)
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage their project transitions" ON public.resource_transitions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = resource_transitions.project_id 
    AND projects.owner_id = auth.uid()
  )
);

-- Policies pour project_access_rights
CREATE POLICY "Users can view their access rights" ON public.project_access_rights
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = project_access_rights.project_id 
    AND projects.owner_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.candidate_profiles cp
    WHERE cp.id = project_access_rights.candidate_id
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Project owners can manage access rights" ON public.project_access_rights
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = project_access_rights.project_id 
    AND projects.owner_id = auth.uid()
  )
);

-- Policies pour resource_change_history
CREATE POLICY "Users can view their project history" ON public.resource_change_history
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = resource_change_history.project_id 
    AND projects.owner_id = auth.uid()
  )
);

CREATE POLICY "Project owners can create history entries" ON public.resource_change_history
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = resource_change_history.project_id 
    AND projects.owner_id = auth.uid()
  )
);

-- Triggers pour updated_at
CREATE TRIGGER update_project_access_rights_updated_at 
  BEFORE UPDATE ON public.project_access_rights 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for monitoring
ALTER PUBLICATION supabase_realtime ADD TABLE public.resource_transitions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_access_rights;