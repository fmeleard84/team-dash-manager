-- Migration pour le module IA Team
-- Date: 19/09/2025

-- 1. Ajouter la colonne prompt_id à hr_profiles
ALTER TABLE public.hr_profiles
ADD COLUMN IF NOT EXISTS prompt_id UUID REFERENCES public.prompts_ia(id) ON DELETE SET NULL;

-- 2. Créer la table de liaison ia_resource_prompts
CREATE TABLE IF NOT EXISTS public.ia_resource_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.hr_profiles(id) ON DELETE CASCADE,
  prompt_id UUID NOT NULL REFERENCES public.prompts_ia(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT true,
  context VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, prompt_id)
);

-- 3. Activer RLS sur la nouvelle table
ALTER TABLE public.ia_resource_prompts ENABLE ROW LEVEL SECURITY;

-- 4. Politiques RLS
CREATE POLICY IF NOT EXISTS "ia_resource_prompts_select"
  ON public.ia_resource_prompts FOR SELECT
  USING (true);

CREATE POLICY IF NOT EXISTS "ia_resource_prompts_admin_only"
  ON public.ia_resource_prompts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 5. Index pour optimisation
CREATE INDEX IF NOT EXISTS idx_ia_prompts_profile ON public.ia_resource_prompts(profile_id);
CREATE INDEX IF NOT EXISTS idx_ia_prompts_prompt ON public.ia_resource_prompts(prompt_id);
CREATE INDEX IF NOT EXISTS idx_hr_profiles_prompt ON public.hr_profiles(prompt_id);

-- 6. Insérer les prompts IA de base
INSERT INTO public.prompts_ia (name, context, prompt, active, priority)
VALUES
  ('IA Rédacteur', 'ia_writer', 'Tu es un rédacteur IA spécialisé dans la création de contenu professionnel. Tu produis des documents structurés, clairs et adaptés au contexte du projet.', true, 100),
  ('IA Chef de Projet', 'ia_project_manager', 'Tu es un chef de projet IA qui aide à organiser, planifier et suivre les projets. Tu crées des plannings et rapports d''avancement.', true, 100),
  ('IA Développeur', 'ia_developer', 'Tu es un développeur IA qui aide à concevoir des architectures techniques et écrire de la documentation technique.', true, 100),
  ('IA Designer', 'ia_designer', 'Tu es un designer IA qui aide à créer des concepts visuels et des guidelines UX/UI.', true, 100),
  ('IA Analyste', 'ia_analyst', 'Tu es un analyste IA qui aide à analyser des données et créer des rapports.', true, 100)
ON CONFLICT (name) DO NOTHING;

-- 7. Message de confirmation
SELECT 'Migration IA Team appliquée avec succès' as message;