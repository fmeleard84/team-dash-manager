-- Script SQL pour corriger les politiques RLS de candidate_qualification_results
-- À exécuter dans le Dashboard Supabase > SQL Editor

-- 1. Créer la table si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.candidate_qualification_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    candidate_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
    test_type VARCHAR(50) NOT NULL DEFAULT 'qualification',
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    total_questions INTEGER NOT NULL DEFAULT 0,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    questions JSONB DEFAULT '[]'::jsonb,
    answers JSONB DEFAULT '[]'::jsonb,
    test_duration INTEGER,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Créer les index si ils n'existent pas
CREATE INDEX IF NOT EXISTS idx_qualification_candidate
ON public.candidate_qualification_results(candidate_id);

CREATE INDEX IF NOT EXISTS idx_qualification_created
ON public.candidate_qualification_results(created_at DESC);

-- 3. Activer RLS
ALTER TABLE public.candidate_qualification_results ENABLE ROW LEVEL SECURITY;

-- 4. Supprimer toutes les anciennes politiques
DROP POLICY IF EXISTS "candidates_view_own_results" ON public.candidate_qualification_results;
DROP POLICY IF EXISTS "candidates_insert_own_results" ON public.candidate_qualification_results;
DROP POLICY IF EXISTS "candidates_update_own_results" ON public.candidate_qualification_results;
DROP POLICY IF EXISTS "candidates_own_results" ON public.candidate_qualification_results;
DROP POLICY IF EXISTS "admins_full_access" ON public.candidate_qualification_results;
DROP POLICY IF EXISTS "admins_all_access" ON public.candidate_qualification_results;
DROP POLICY IF EXISTS "clients_view_assigned_candidates" ON public.candidate_qualification_results;
DROP POLICY IF EXISTS "clients_view_their_candidates" ON public.candidate_qualification_results;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.candidate_qualification_results;
DROP POLICY IF EXISTS "authenticated_read_policy" ON public.candidate_qualification_results;
DROP POLICY IF EXISTS "anon_read_policy" ON public.candidate_qualification_results;

-- 5. Créer les nouvelles politiques propres

-- Politique pour les candidats : accès total à leurs propres résultats
CREATE POLICY "candidates_own_results" ON public.candidate_qualification_results
FOR ALL
TO authenticated
USING (candidate_id = auth.uid())
WITH CHECK (candidate_id = auth.uid());

-- Politique pour les admins : accès total
CREATE POLICY "admins_all_access" ON public.candidate_qualification_results
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Politique pour les clients : lecture seule des candidats assignés à leurs projets
CREATE POLICY "clients_view_their_candidates" ON public.candidate_qualification_results
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.hr_resource_assignments hra
        JOIN public.projects p ON p.id = hra.project_id
        WHERE hra.candidate_id = candidate_qualification_results.candidate_id
        AND p.owner_id = auth.uid()
    )
);

-- 6. Accorder les permissions nécessaires
GRANT SELECT, INSERT, UPDATE ON public.candidate_qualification_results TO authenticated;
GRANT ALL ON public.candidate_qualification_results TO service_role;

-- 7. Vérification finale
SELECT
    'Table créée/vérifiée' as status,
    COUNT(*) as nb_policies
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'candidate_qualification_results';