-- Ajouter une colonne candidate_id aux hr_resource_assignments
-- pour identifier quel candidat spécifique est assigné à cette mission

ALTER TABLE public.hr_resource_assignments 
ADD COLUMN IF NOT EXISTS candidate_id UUID REFERENCES public.candidate_profiles(id);

-- Créer un index pour les performances
CREATE INDEX IF NOT EXISTS idx_hr_resource_assignments_candidate_id 
ON public.hr_resource_assignments(candidate_id);

-- Mettre à jour les politiques RLS pour inclure candidate_id
-- Les candidats ne peuvent voir que leurs propres assignments
CREATE POLICY "Candidates can view their own assignments" ON public.hr_resource_assignments
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT user_id FROM candidate_profiles WHERE id = candidate_id
        )
    );

COMMENT ON COLUMN public.hr_resource_assignments.candidate_id IS 'The specific candidate assigned to this resource requirement';