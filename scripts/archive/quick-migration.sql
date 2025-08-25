-- Migration rapide pour l'onboarding candidat
-- Ajouter les colonnes manquantes à candidate_profiles

ALTER TABLE candidate_profiles 
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS billing_type TEXT CHECK (billing_type IN ('company', 'micro')),
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS siret TEXT;

-- Mettre à jour les candidats existants
UPDATE candidate_profiles 
SET onboarding_step = 0 
WHERE onboarding_step IS NULL;

-- Créer des index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_onboarding_step 
ON candidate_profiles (onboarding_step);

CREATE INDEX IF NOT EXISTS idx_candidate_profiles_qualification_status 
ON candidate_profiles (qualification_status);

-- Créer la table des résultats de tests
CREATE TABLE IF NOT EXISTS candidate_qualification_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    test_answers JSONB NOT NULL DEFAULT '{}',
    score INTEGER DEFAULT 0,
    qualification_status TEXT CHECK (qualification_status IN ('qualified', 'pending', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_candidate_qualification_results_candidate_id 
ON candidate_qualification_results (candidate_id);

CREATE INDEX IF NOT EXISTS idx_candidate_qualification_results_status 
ON candidate_qualification_results (qualification_status);

-- Activer RLS sur la nouvelle table
ALTER TABLE candidate_qualification_results ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour candidate_qualification_results
DROP POLICY IF EXISTS "Candidats peuvent voir leurs résultats de tests" ON candidate_qualification_results;
CREATE POLICY "Candidats peuvent voir leurs résultats de tests"
    ON candidate_qualification_results FOR SELECT
    USING (
        candidate_id IN (
            SELECT cp.id FROM candidate_profiles cp 
            WHERE cp.email = auth.email()
        )
    );

DROP POLICY IF EXISTS "Candidats peuvent créer leurs résultats de tests" ON candidate_qualification_results;
CREATE POLICY "Candidats peuvent créer leurs résultats de tests"
    ON candidate_qualification_results FOR INSERT
    WITH CHECK (
        candidate_id IN (
            SELECT cp.id FROM candidate_profiles cp 
            WHERE cp.email = auth.email()
        )
    );

DROP POLICY IF EXISTS "Candidats peuvent modifier leurs résultats de tests" ON candidate_qualification_results;
CREATE POLICY "Candidats peuvent modifier leurs résultats de tests"
    ON candidate_qualification_results FOR UPDATE
    USING (
        candidate_id IN (
            SELECT cp.id FROM candidate_profiles cp 
            WHERE cp.email = auth.email()
        )
    );

DROP POLICY IF EXISTS "Admins peuvent tout voir sur les résultats de tests" ON candidate_qualification_results;
CREATE POLICY "Admins peuvent tout voir sur les résultats de tests"
    ON candidate_qualification_results FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.email = auth.email() 
            AND profiles.role = 'admin'
        )
    );

-- Fonction pour matcher candidats et projets
CREATE OR REPLACE FUNCTION get_matching_projects_for_candidate(
    candidate_profile_id UUID,
    candidate_expertise_ids UUID[]
)
RETURNS TABLE (
    project_id UUID,
    title TEXT,
    description TEXT,
    project_date DATE,
    client_budget NUMERIC,
    match_score INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as project_id,
        p.title,
        p.description,
        p.project_date,
        p.client_budget,
        -- Score de correspondance basé sur les expertises communes
        (
            SELECT COUNT(*)::INTEGER 
            FROM hr_resource_assignments hra
            WHERE hra.project_id = p.id
            AND EXISTS (
                SELECT 1 FROM candidate_expertises ce 
                WHERE ce.candidate_id = candidate_profile_id
                AND ce.expertise_id = ANY(candidate_expertise_ids)
            )
        ) as match_score
    FROM projects p
    WHERE p.status = 'pause' -- Projets en attente d'équipe
    AND EXISTS (
        -- Vérifier qu'il y a des assignments sans candidat assigné
        SELECT 1 FROM hr_resource_assignments hra
        WHERE hra.project_id = p.id
        AND hra.booking_status = 'pending'
    )
    ORDER BY match_score DESC, p.created_at DESC
    LIMIT 10;
END;
$$;

-- Commentaires pour documenter les nouveaux champs
COMMENT ON COLUMN candidate_profiles.onboarding_step IS 'Étape actuelle de l''onboarding (0-8)';
COMMENT ON COLUMN candidate_profiles.billing_type IS 'Type de facturation: company ou micro';
COMMENT ON COLUMN candidate_profiles.company_name IS 'Nom de l''entreprise si billing_type = company';
COMMENT ON COLUMN candidate_profiles.siret IS 'Numéro SIRET si billing_type = company';
COMMENT ON TABLE candidate_qualification_results IS 'Résultats des tests de qualification des candidats';
COMMENT ON FUNCTION get_matching_projects_for_candidate IS 'Fonction pour trouver les projets correspondant au profil d''un candidat';