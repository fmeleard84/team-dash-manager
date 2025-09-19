-- Migration pour le module IA Team (Version compatible avec prompts_ia.id TEXT)
-- Date: 19/09/2025

-- 1. Ajouter la colonne prompt_id à hr_profiles (TEXT pour correspondre à prompts_ia.id)
ALTER TABLE public.hr_profiles
ADD COLUMN IF NOT EXISTS prompt_id TEXT REFERENCES public.prompts_ia(id) ON DELETE SET NULL;

-- 2. Créer la table de liaison ia_resource_prompts (avec prompt_id TEXT)
CREATE TABLE IF NOT EXISTS public.ia_resource_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.hr_profiles(id) ON DELETE CASCADE,
  prompt_id TEXT NOT NULL REFERENCES public.prompts_ia(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT true,
  context VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, prompt_id)
);

-- 3. Activer RLS sur la nouvelle table
ALTER TABLE public.ia_resource_prompts ENABLE ROW LEVEL SECURITY;

-- 4. Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "ia_resource_prompts_select" ON public.ia_resource_prompts;
DROP POLICY IF EXISTS "ia_resource_prompts_admin_insert" ON public.ia_resource_prompts;
DROP POLICY IF EXISTS "ia_resource_prompts_admin_update" ON public.ia_resource_prompts;
DROP POLICY IF EXISTS "ia_resource_prompts_admin_delete" ON public.ia_resource_prompts;

-- 5. Créer les nouvelles politiques RLS
CREATE POLICY "ia_resource_prompts_select"
  ON public.ia_resource_prompts
  FOR SELECT
  USING (true);

CREATE POLICY "ia_resource_prompts_admin_insert"
  ON public.ia_resource_prompts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "ia_resource_prompts_admin_update"
  ON public.ia_resource_prompts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "ia_resource_prompts_admin_delete"
  ON public.ia_resource_prompts
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 6. Créer les index pour optimisation
CREATE INDEX IF NOT EXISTS idx_ia_prompts_profile ON public.ia_resource_prompts(profile_id);
CREATE INDEX IF NOT EXISTS idx_ia_prompts_prompt ON public.ia_resource_prompts(prompt_id);
CREATE INDEX IF NOT EXISTS idx_hr_profiles_prompt ON public.hr_profiles(prompt_id);

-- 7. Générer des IDs uniques pour les prompts IA
DO $$
DECLARE
  v_prompt_id TEXT;
BEGIN
  -- IA Rédacteur
  v_prompt_id := 'ia_writer_' || gen_random_uuid()::text;
  INSERT INTO public.prompts_ia (id, name, context, prompt, active, priority)
  SELECT v_prompt_id, 'IA Rédacteur', 'ia_writer',
    'Tu es un rédacteur IA spécialisé dans la création de contenu professionnel. Tu produis des documents structurés, clairs et adaptés au contexte du projet. Tu utilises un ton professionnel et tu structures toujours tes livrables avec des titres, sous-titres et sections bien définies.',
    true, 100
  WHERE NOT EXISTS (SELECT 1 FROM public.prompts_ia WHERE name = 'IA Rédacteur');

  -- IA Chef de Projet
  v_prompt_id := 'ia_project_manager_' || gen_random_uuid()::text;
  INSERT INTO public.prompts_ia (id, name, context, prompt, active, priority)
  SELECT v_prompt_id, 'IA Chef de Projet', 'ia_project_manager',
    'Tu es un chef de projet IA qui aide à organiser, planifier et suivre les projets. Tu crées des plannings, des roadmaps, des rapports d''avancement et tu aides à coordonner les équipes. Tu es méthodique, structuré et orienté résultats.',
    true, 100
  WHERE NOT EXISTS (SELECT 1 FROM public.prompts_ia WHERE name = 'IA Chef de Projet');

  -- IA Développeur
  v_prompt_id := 'ia_developer_' || gen_random_uuid()::text;
  INSERT INTO public.prompts_ia (id, name, context, prompt, active, priority)
  SELECT v_prompt_id, 'IA Développeur', 'ia_developer',
    'Tu es un développeur IA qui aide à concevoir des architectures techniques, écrire de la documentation technique, proposer des solutions et réviser du code. Tu es précis, technique et tu fournis toujours des exemples concrets.',
    true, 100
  WHERE NOT EXISTS (SELECT 1 FROM public.prompts_ia WHERE name = 'IA Développeur');

  -- IA Designer
  v_prompt_id := 'ia_designer_' || gen_random_uuid()::text;
  INSERT INTO public.prompts_ia (id, name, context, prompt, active, priority)
  SELECT v_prompt_id, 'IA Designer', 'ia_designer',
    'Tu es un designer IA qui aide à créer des concepts visuels, des maquettes, des chartes graphiques et des guidelines UX/UI. Tu es créatif, orienté utilisateur et tu fournis des descriptions détaillées de tes propositions visuelles.',
    true, 100
  WHERE NOT EXISTS (SELECT 1 FROM public.prompts_ia WHERE name = 'IA Designer');

  -- IA Analyste
  v_prompt_id := 'ia_analyst_' || gen_random_uuid()::text;
  INSERT INTO public.prompts_ia (id, name, context, prompt, active, priority)
  SELECT v_prompt_id, 'IA Analyste', 'ia_analyst',
    'Tu es un analyste IA qui aide à analyser des données, créer des rapports, identifier des tendances et proposer des recommandations stratégiques. Tu es analytique, factuel et tu bases toujours tes conclusions sur des données concrètes.',
    true, 100
  WHERE NOT EXISTS (SELECT 1 FROM public.prompts_ia WHERE name = 'IA Analyste');
END $$;

-- 8. Fonction helper pour récupérer le prompt d'une ressource IA
CREATE OR REPLACE FUNCTION get_ia_resource_prompt(resource_id UUID)
RETURNS TABLE (
  prompt_id TEXT,
  prompt_name TEXT,
  prompt_content TEXT,
  prompt_context TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id as prompt_id,
    p.name as prompt_name,
    p.prompt as prompt_content,
    p.context as prompt_context
  FROM public.hr_profiles hp
  LEFT JOIN public.prompts_ia p ON hp.prompt_id = p.id
  WHERE hp.id = resource_id
    AND hp.is_ai = true
    AND p.active = true
  LIMIT 1;
END;
$$;

-- 9. Vérification finale
SELECT
  'Migration IA Team appliquée avec succès !' as message,
  COUNT(*) as prompts_count
FROM public.prompts_ia
WHERE context IN ('ia_writer', 'ia_project_manager', 'ia_developer', 'ia_designer', 'ia_analyst');