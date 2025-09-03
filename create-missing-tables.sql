-- Créer les tables manquantes pour le système de modification de ressources

-- 1. Table pour suivre les transitions de ressources
CREATE TABLE IF NOT EXISTS public.resource_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    assignment_id UUID NOT NULL REFERENCES public.hr_resource_assignments(id) ON DELETE CASCADE,
    transition_type TEXT NOT NULL CHECK (transition_type IN ('profile_change', 'seniority_change', 'skill_update')),
    
    -- État précédent
    previous_candidate_id UUID REFERENCES public.candidate_profiles(id),
    previous_profile_id UUID REFERENCES public.hr_profiles(id),
    previous_seniority TEXT,
    previous_languages TEXT[],
    previous_expertises TEXT[],
    
    -- Nouvel état
    new_candidate_id UUID REFERENCES public.candidate_profiles(id),
    new_profile_id UUID REFERENCES public.hr_profiles(id),
    new_seniority TEXT,
    new_languages TEXT[],
    new_expertises TEXT[],
    
    -- Métadonnées
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    completed_at TIMESTAMPTZ
);

-- 2. Table pour gérer les droits d'accès aux projets
CREATE TABLE IF NOT EXISTS public.project_access_rights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
    access_type TEXT NOT NULL CHECK (access_type IN ('full', 'read_only', 'revoked')),
    
    -- Types d'accès spécifiques
    kanban_access BOOLEAN DEFAULT true,
    drive_access BOOLEAN DEFAULT true,
    messaging_access BOOLEAN DEFAULT true,
    
    -- Métadonnées
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    granted_by UUID REFERENCES auth.users(id),
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES auth.users(id),
    revoke_reason TEXT,
    
    UNIQUE(project_id, candidate_id)
);

-- 3. Table pour l'historique des changements
CREATE TABLE IF NOT EXISTS public.resource_change_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    assignment_id UUID NOT NULL REFERENCES public.hr_resource_assignments(id) ON DELETE CASCADE,
    change_type TEXT NOT NULL,
    change_details JSONB,
    
    -- Qui a fait le changement
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Impact
    candidates_affected INTEGER DEFAULT 0,
    notifications_sent INTEGER DEFAULT 0
);

-- 4. Ajouter les colonnes manquantes à hr_resource_assignments si elles n'existent pas
DO $$ 
BEGIN
    -- Ajouter current_candidate_id si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'hr_resource_assignments' 
        AND column_name = 'current_candidate_id'
    ) THEN
        ALTER TABLE public.hr_resource_assignments 
        ADD COLUMN current_candidate_id UUID REFERENCES public.candidate_profiles(id);
    END IF;

    -- Ajouter modification_in_progress si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'hr_resource_assignments' 
        AND column_name = 'modification_in_progress'
    ) THEN
        ALTER TABLE public.hr_resource_assignments 
        ADD COLUMN modification_in_progress BOOLEAN DEFAULT false;
    END IF;

    -- Ajouter last_modified_at si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'hr_resource_assignments' 
        AND column_name = 'last_modified_at'
    ) THEN
        ALTER TABLE public.hr_resource_assignments 
        ADD COLUMN last_modified_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 5. Créer les index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_resource_transitions_project ON resource_transitions(project_id);
CREATE INDEX IF NOT EXISTS idx_resource_transitions_assignment ON resource_transitions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_resource_transitions_status ON resource_transitions(status);
CREATE INDEX IF NOT EXISTS idx_project_access_rights_project ON project_access_rights(project_id);
CREATE INDEX IF NOT EXISTS idx_project_access_rights_candidate ON project_access_rights(candidate_id);
CREATE INDEX IF NOT EXISTS idx_resource_change_history_project ON resource_change_history(project_id);

-- 6. Activer RLS sur les nouvelles tables
ALTER TABLE resource_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_access_rights ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_change_history ENABLE ROW LEVEL SECURITY;

-- 7. Créer les politiques RLS basiques
-- Pour resource_transitions
CREATE POLICY "Admins can view all transitions" ON resource_transitions
    FOR SELECT USING (true);

CREATE POLICY "Admins can create transitions" ON resource_transitions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update transitions" ON resource_transitions
    FOR UPDATE USING (true);

-- Pour project_access_rights
CREATE POLICY "View access rights" ON project_access_rights
    FOR SELECT USING (true);

CREATE POLICY "Manage access rights" ON project_access_rights
    FOR ALL USING (true);

-- Pour resource_change_history
CREATE POLICY "View change history" ON resource_change_history
    FOR SELECT USING (true);

CREATE POLICY "Create change history" ON resource_change_history
    FOR INSERT WITH CHECK (true);

-- 8. Activer le realtime pour ces nouvelles tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.resource_transitions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_access_rights;
ALTER PUBLICATION supabase_realtime ADD TABLE public.resource_change_history;

-- 9. Vérifier que tout est créé
SELECT 
    tablename,
    CASE 
        WHEN tablename IN ('resource_transitions', 'project_access_rights', 'resource_change_history')
        THEN '✅ Créée'
        ELSE '✅ Existante'
    END as statut
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'resource_transitions',
    'project_access_rights', 
    'resource_change_history',
    'hr_resource_assignments'
)
ORDER BY tablename;