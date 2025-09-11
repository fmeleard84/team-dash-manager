-- Table pour stocker les FAQ
CREATE TABLE IF NOT EXISTS public.ai_faq (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category VARCHAR(100),
  tags TEXT[],
  is_active BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_by UUID REFERENCES auth.users(id)
);

-- Table pour stocker les prompts de l'assistant
CREATE TABLE IF NOT EXISTS public.ai_prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'system', 'context', 'behavior'
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_by UUID REFERENCES auth.users(id)
);

-- Table pour stocker l'historique des actions de l'assistant
CREATE TABLE IF NOT EXISTS public.ai_action_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action_type VARCHAR(100) NOT NULL, -- 'create_meeting', 'create_team', etc.
  action_data JSONB NOT NULL,
  result JSONB,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'success', 'failed'
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Index pour améliorer les performances
CREATE INDEX idx_ai_faq_active ON public.ai_faq(is_active);
CREATE INDEX idx_ai_faq_category ON public.ai_faq(category);
CREATE INDEX idx_ai_prompts_active ON public.ai_prompts(is_active);
CREATE INDEX idx_ai_prompts_type ON public.ai_prompts(type);
CREATE INDEX idx_ai_action_logs_user ON public.ai_action_logs(user_id);
CREATE INDEX idx_ai_action_logs_status ON public.ai_action_logs(status);

-- RLS Policies
ALTER TABLE public.ai_faq ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_action_logs ENABLE ROW LEVEL SECURITY;

-- FAQ: Tout le monde peut lire les FAQ actives
CREATE POLICY "FAQ visible pour tous" ON public.ai_faq
  FOR SELECT
  USING (is_active = true);

-- FAQ: Seuls les admins peuvent créer/modifier/supprimer
CREATE POLICY "Admins peuvent gérer FAQ" ON public.ai_faq
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Prompts: Seuls les admins peuvent voir et gérer
CREATE POLICY "Admins peuvent gérer prompts" ON public.ai_prompts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Action logs: Les utilisateurs peuvent voir leurs propres logs
CREATE POLICY "Users peuvent voir leurs logs" ON public.ai_action_logs
  FOR SELECT
  USING (user_id = auth.uid());

-- Action logs: Les admins peuvent tout voir
CREATE POLICY "Admins peuvent voir tous les logs" ON public.ai_action_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
CREATE TRIGGER update_ai_faq_updated_at
  BEFORE UPDATE ON public.ai_faq
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_prompts_updated_at
  BEFORE UPDATE ON public.ai_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insérer quelques FAQ par défaut
INSERT INTO public.ai_faq (question, answer, category, tags, order_index) VALUES
  ('Comment créer un nouveau projet ?', 'Pour créer un nouveau projet, cliquez sur le bouton "Nouveau projet" dans votre tableau de bord, remplissez les informations requises (nom, description, dates, budget) et composez votre équipe via l''interface ReactFlow.', 'Projets', ARRAY['projet', 'création', 'nouveau'], 1),
  ('Comment inviter des membres à mon équipe ?', 'Utilisez l''interface ReactFlow dans l''onglet "Équipe" de votre projet. Glissez-déposez les profils professionnels souhaités, configurez leurs compétences et séniorité, puis lancez la recherche de candidats.', 'Équipe', ARRAY['équipe', 'membres', 'invitation'], 2),
  ('Comment planifier une réunion ?', 'Accédez au Planning depuis le menu ou votre projet, cliquez sur une date pour créer un événement, définissez le type "Réunion", ajoutez les participants et configurez les rappels.', 'Planning', ARRAY['réunion', 'planning', 'événement'], 3),
  ('Comment utiliser le Kanban ?', 'Le Kanban est accessible depuis votre projet. Créez des tâches avec le bouton "+", assignez-les aux membres, définissez les priorités et glissez-déposez les cartes entre les colonnes pour changer leur statut.', 'Kanban', ARRAY['kanban', 'tâches', 'gestion'], 4),
  ('Comment partager des fichiers ?', 'Utilisez le Drive de votre projet pour uploader des fichiers par glisser-déposer. Les fichiers sont automatiquement partagés avec tous les membres de l''équipe.', 'Drive', ARRAY['fichiers', 'partage', 'drive'], 5);

-- Insérer des prompts par défaut
INSERT INTO public.ai_prompts (name, type, content, priority) VALUES
  ('System Prompt', 'system', 'Tu es un assistant intelligent pour la plateforme Team Dash Manager. Tu aides les utilisateurs à gérer leurs projets, équipes et tâches de manière efficace.', 1),
  ('Context Général', 'context', 'Team Dash Manager est une plateforme de gestion de projets collaborative avec des outils comme ReactFlow pour la composition d''équipes, Kanban pour les tâches, Planning pour les événements, Drive pour les fichiers et Wiki pour la documentation.', 2),
  ('Comportement', 'behavior', 'Sois professionnel mais amical. Réponds de manière concise et claire. Propose toujours des actions concrètes quand c''est pertinent. Si tu ne connais pas la réponse, dis-le honnêtement.', 3);