-- Migration pour lier les ressources IA à leurs prompts système
-- Date: 19/09/2025

-- 1. Ajouter la colonne prompt_id à hr_profiles (liaison directe simple)
ALTER TABLE public.hr_profiles
ADD COLUMN IF NOT EXISTS prompt_id UUID REFERENCES public.prompts_ia(id) ON DELETE SET NULL;

-- 2. Créer une table de liaison pour plus de flexibilité (prompts multiples par IA)
CREATE TABLE IF NOT EXISTS public.ia_resource_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.hr_profiles(id) ON DELETE CASCADE,
  prompt_id UUID NOT NULL REFERENCES public.prompts_ia(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT true,
  context VARCHAR(100), -- Contexte d'utilisation du prompt (général, projet, équipe, etc.)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, prompt_id)
);

-- 3. Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_ia_resource_prompts_profile ON public.ia_resource_prompts(profile_id);
CREATE INDEX IF NOT EXISTS idx_ia_resource_prompts_prompt ON public.ia_resource_prompts(prompt_id);
CREATE INDEX IF NOT EXISTS idx_hr_profiles_prompt ON public.hr_profiles(prompt_id);

-- 4. Commentaires pour la documentation
COMMENT ON COLUMN public.hr_profiles.prompt_id IS 'Prompt principal de l''IA (liaison directe pour simplicité)';
COMMENT ON TABLE public.ia_resource_prompts IS 'Table de liaison pour associer plusieurs prompts à une ressource IA selon le contexte';
COMMENT ON COLUMN public.ia_resource_prompts.context IS 'Contexte d''utilisation : general, project, team, technical, creative, etc.';
COMMENT ON COLUMN public.ia_resource_prompts.is_primary IS 'Indique si c''est le prompt principal de cette IA';

-- 5. Créer quelques prompts IA de base s'ils n'existent pas
INSERT INTO public.prompts_ia (name, context, prompt, active, priority)
VALUES
  ('IA Rédacteur', 'ia_writer', 'Tu es un rédacteur IA spécialisé dans la création de contenu professionnel. Tu produis des documents structurés, clairs et adaptés au contexte du projet. Tu utilises un ton professionnel et tu structures toujours tes livrables avec des titres, sous-titres et sections bien définies.', true, 100),
  ('IA Chef de Projet', 'ia_project_manager', 'Tu es un chef de projet IA qui aide à organiser, planifier et suivre les projets. Tu crées des plannings, des roadmaps, des rapports d''avancement et tu aides à coordonner les équipes. Tu es méthodique, structuré et orienté résultats.', true, 100),
  ('IA Développeur', 'ia_developer', 'Tu es un développeur IA qui aide à concevoir des architectures techniques, écrire de la documentation technique, proposer des solutions et réviser du code. Tu es précis, technique et tu fournis toujours des exemples concrets.', true, 100),
  ('IA Designer', 'ia_designer', 'Tu es un designer IA qui aide à créer des concepts visuels, des maquettes, des chartes graphiques et des guidelines UX/UI. Tu es créatif, orienté utilisateur et tu fournis des descriptions détaillées de tes propositions visuelles.', true, 100),
  ('IA Analyste', 'ia_analyst', 'Tu es un analyste IA qui aide à analyser des données, créer des rapports, identifier des tendances et proposer des recommandations stratégiques. Tu es analytique, factuel et tu bases toujours tes conclusions sur des données concrètes.', true, 100)
ON CONFLICT DO NOTHING;

-- 6. Politiques RLS pour la nouvelle table
ALTER TABLE public.ia_resource_prompts ENABLE ROW LEVEL SECURITY;

-- Politique de lecture : tout le monde peut voir les associations
CREATE POLICY "ia_resource_prompts_select_policy" ON public.ia_resource_prompts
  FOR SELECT
  USING (true);

-- Politique d'écriture : seuls les admins peuvent modifier
CREATE POLICY "ia_resource_prompts_insert_policy" ON public.ia_resource_prompts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "ia_resource_prompts_update_policy" ON public.ia_resource_prompts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "ia_resource_prompts_delete_policy" ON public.ia_resource_prompts
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 7. Fonction pour récupérer le prompt actif d'une ressource IA
CREATE OR REPLACE FUNCTION get_ia_resource_prompt(resource_id UUID)
RETURNS TABLE (
  prompt_id UUID,
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

-- 8. Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ia_resource_prompts_updated_at
  BEFORE UPDATE ON public.ia_resource_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();