-- Script SQL pour créer les tables de gestion des transitions de ressources
-- Compatible avec la structure existante

-- 1. Table pour tracker les transitions de ressources
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
  notification_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id)
);

-- 2. Table pour les accès projet (Drive, Kanban, Messagerie)
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
  drive_folders TEXT[],
  drive_permissions TEXT DEFAULT 'read',
  
  -- État des accès
  access_status TEXT NOT NULL DEFAULT 'active' CHECK (access_status IN ('active', 'revoked', 'pending_transfer', 'transferred')),
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  transferred_to UUID REFERENCES public.candidate_profiles(id),
  transferred_at TIMESTAMPTZ,
  
  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Table d'historique des changements
CREATE TABLE IF NOT EXISTS public.resource_change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES public.hr_resource_assignments(id) ON DELETE SET NULL,
  
  -- Type de changement
  change_type TEXT NOT NULL CHECK (change_type IN (
    'profile_replaced',
    'seniority_changed',  -- Changé car c'est toujours un remplacement
    'skills_added',
    'skills_removed',
    'candidate_replaced'
  )),
  
  -- Détails du changement
  from_state JSONB NOT NULL,
  to_state JSONB NOT NULL,
  
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

-- 4. Ajouter les colonnes manquantes à hr_resource_assignments (si elles n'existent pas)
ALTER TABLE public.hr_resource_assignments 
ADD COLUMN IF NOT EXISTS current_candidate_id UUID REFERENCES public.candidate_profiles(id);

ALTER TABLE public.hr_resource_assignments 
ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.hr_resource_assignments 
ADD COLUMN IF NOT EXISTS modification_in_progress BOOLEAN DEFAULT false;

-- 5. Créer les indexes pour les performances
CREATE INDEX IF NOT EXISTS idx_resource_transitions_assignment ON resource_transitions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_resource_transitions_status ON resource_transitions(status);
CREATE INDEX IF NOT EXISTS idx_resource_transitions_project ON resource_transitions(project_id);

CREATE INDEX IF NOT EXISTS idx_project_access_rights_candidate ON project_access_rights(candidate_id);
CREATE INDEX IF NOT EXISTS idx_project_access_rights_project ON project_access_rights(project_id);
CREATE INDEX IF NOT EXISTS idx_project_access_rights_status ON project_access_rights(access_status);

CREATE INDEX IF NOT EXISTS idx_resource_change_history_project ON resource_change_history(project_id);
CREATE INDEX IF NOT EXISTS idx_resource_change_history_assignment ON resource_change_history(assignment_id);

-- 6. Enable RLS
ALTER TABLE public.resource_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_access_rights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_change_history ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies (drop existing first to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their project transitions" ON public.resource_transitions;
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

DROP POLICY IF EXISTS "Users can manage their project transitions" ON public.resource_transitions;
CREATE POLICY "Users can manage their project transitions" ON public.resource_transitions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = resource_transitions.project_id 
    AND projects.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can view their access rights" ON public.project_access_rights;
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

DROP POLICY IF EXISTS "Project owners can manage access rights" ON public.project_access_rights;
CREATE POLICY "Project owners can manage access rights" ON public.project_access_rights
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = project_access_rights.project_id 
    AND projects.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can view their project history" ON public.resource_change_history;
CREATE POLICY "Users can view their project history" ON public.resource_change_history
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = resource_change_history.project_id 
    AND projects.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Project owners can create history entries" ON public.resource_change_history;
CREATE POLICY "Project owners can create history entries" ON public.resource_change_history
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = resource_change_history.project_id 
    AND projects.owner_id = auth.uid()
  )
);

-- 8. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.resource_transitions;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.project_access_rights;

-- 9. Add trigger for updated_at on project_access_rights
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_project_access_rights_updated_at 
  BEFORE UPDATE ON public.project_access_rights 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();