-- Solution simplifiée pour corriger l'erreur 406
-- À exécuter dans Supabase Dashboard > SQL Editor

-- 1. D'abord, vérifier que la table existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'candidate_qualification_results') THEN
        CREATE TABLE public.candidate_qualification_results (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            candidate_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
            test_type VARCHAR(50) NOT NULL DEFAULT 'qualification',
            score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
            total_questions INTEGER NOT NULL DEFAULT 0,
            correct_answers INTEGER NOT NULL DEFAULT 0,
            questions JSONB DEFAULT '[]'::jsonb,
            answers JSONB DEFAULT '[]'::jsonb,
            test_duration INTEGER,
            completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Créer les index
        CREATE INDEX idx_qualification_candidate ON public.candidate_qualification_results(candidate_id);
        CREATE INDEX idx_qualification_created ON public.candidate_qualification_results(created_at DESC);
    END IF;
END $$;

-- 2. Désactiver temporairement RLS pour nettoyer
ALTER TABLE public.candidate_qualification_results DISABLE ROW LEVEL SECURITY;

-- 3. Supprimer TOUTES les politiques existantes
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'candidate_qualification_results'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.candidate_qualification_results', pol.policyname);
    END LOOP;
END $$;

-- 4. Créer une seule politique simple et permissive pour tous les utilisateurs authentifiés
-- Cette politique permet à tout utilisateur connecté de voir et modifier ses propres résultats
CREATE POLICY "authenticated_users_own_data"
ON public.candidate_qualification_results
FOR ALL
USING (
    auth.uid() IS NOT NULL AND (
        -- Le candidat peut voir ses propres résultats
        candidate_id = auth.uid()
        OR
        -- Ou c'est un admin
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
        OR
        -- Ou c'est un client qui a ce candidat dans un projet
        EXISTS (
            SELECT 1
            FROM public.projects p
            JOIN public.hr_resource_assignments hra ON hra.project_id = p.id
            WHERE p.owner_id = auth.uid()
            AND hra.candidate_id = candidate_qualification_results.candidate_id
        )
    )
)
WITH CHECK (
    -- Pour l'insertion et la mise à jour, seul le candidat lui-même peut modifier
    candidate_id = auth.uid()
    OR
    -- Ou un admin
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- 5. Réactiver RLS
ALTER TABLE public.candidate_qualification_results ENABLE ROW LEVEL SECURITY;

-- 6. S'assurer que les permissions sont correctes
GRANT ALL ON public.candidate_qualification_results TO authenticated;
GRANT ALL ON public.candidate_qualification_results TO service_role;
GRANT ALL ON public.candidate_qualification_results TO anon;

-- 7. Vérification finale
SELECT
    'Configuration terminée' as message,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'candidate_qualification_results') as nb_policies,
    (SELECT relrowsecurity FROM pg_class WHERE relname = 'candidate_qualification_results') as rls_enabled;