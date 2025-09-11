-- Script SQL pour créer toutes les tables nécessaires au système vectoriel
-- À exécuter dans SQL Editor de Supabase

-- 1. Vérifier que pgvector est installé
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Table pour les prompts IA (déjà créée mais au cas où)
CREATE TABLE IF NOT EXISTS prompts_ia (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  context TEXT NOT NULL CHECK (context IN ('general', 'team-composition', 'project-management', 'technical', 'meeting', 'task-management')),
  prompt TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0 CHECK (priority >= 0 AND priority <= 10),
  variables JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- 3. Table FAQ
CREATE TABLE IF NOT EXISTS faq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,
  tags TEXT[],
  is_published BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  embedding_synced_at TIMESTAMPTZ,
  embedding_version INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Table pour stocker les embeddings
CREATE TABLE IF NOT EXISTS documentation_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  content_type TEXT CHECK (content_type IN ('faq', 'documentation', 'client_info', 'project_info', 'wiki')),
  metadata JSONB DEFAULT '{}',
  embedding vector(1536), -- OpenAI embeddings
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  source_id TEXT,
  source_table TEXT
);

-- 5. Index pour la recherche vectorielle
CREATE INDEX IF NOT EXISTS documentation_embeddings_embedding_idx 
ON documentation_embeddings USING hnsw (embedding vector_cosine_ops);

-- 6. Table de synchronisation
CREATE TABLE IF NOT EXISTS embedding_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table TEXT NOT NULL,
  source_id TEXT NOT NULL,
  action TEXT CHECK (action IN ('insert', 'update', 'delete')),
  content TEXT,
  metadata JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  UNIQUE(source_table, source_id, action, status)
);

-- 7. Index pour la queue
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON embedding_sync_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_sync_queue_source ON embedding_sync_queue(source_table, source_id);

-- 8. Insérer les prompts par défaut
INSERT INTO prompts_ia (id, name, context, prompt, active, priority) VALUES
('general', 'Assistant Général', 'general', 
'Tu es l''assistant vocal intelligent de Team Dash Manager, une plateforme de gestion de projets avec matching de ressources humaines.

IDENTITÉ :
- Nom : Assistant Team Dash
- Rôle : Assistant personnel pour la gestion de projets et d''équipes
- Personnalité : Professionnel, efficace, proactif et amical

CAPACITÉS PRINCIPALES :
1. Expliquer le fonctionnement de n''importe quelle partie de la plateforme
2. Composer des équipes optimales via ReactFlow
3. Créer et gérer des réunions dans le planning
4. Ajouter et suivre des tâches dans le Kanban
5. Naviguer et guider dans l''interface
6. Répondre aux questions sur l''état des projets', true, 0),

('team-composition', 'Composition d''Équipe', 'team-composition',
'CONTEXTE SPÉCIFIQUE : Composition d''équipe dans ReactFlow

Tu assistes l''utilisateur pour composer l''équipe optimale pour son projet.

EXPERTISE DOMAINE :
- Profils métiers tech : Développeur (Frontend/Backend/Fullstack/Mobile), DevOps, Data Scientist, UX/UI Designer
- Profils gestion : Chef de projet, Product Owner, Scrum Master, Business Analyst
- Niveaux séniorité : Junior (0-2 ans), Medior (2-5 ans), Senior (5-10 ans), Expert (10+ ans)', true, 1)
ON CONFLICT (id) DO NOTHING;

-- 9. Créer une FAQ d'exemple
INSERT INTO faq_items (question, answer, category, tags) VALUES
('Comment créer un nouveau projet ?', 
'Pour créer un nouveau projet, cliquez sur le bouton "Nouveau Projet" dans votre dashboard client. Remplissez les informations requises : titre, description, dates, et budget. Ensuite, utilisez l''interface ReactFlow pour composer votre équipe idéale.', 
'Projets', 
ARRAY['projet', 'création', 'guide']),

('Qu''est-ce que le statut "attente-team" ?',
'Le statut "attente-team" indique que votre projet attend que tous les candidats sélectionnés acceptent leur mission. Une fois que toute l''équipe a confirmé, le projet passera automatiquement en statut "play" et les outils collaboratifs seront activés.',
'Projets',
ARRAY['statut', 'équipe', 'workflow']),

('Comment fonctionne le matching de candidats ?',
'Le système match automatiquement les candidats selon 5 critères : profil métier, niveau de séniorité, langues parlées, expertises techniques, et disponibilité. Seuls les candidats qualifiés et disponibles recevront une notification pour votre projet.',
'Matching',
ARRAY['matching', 'candidats', 'recrutement'])
ON CONFLICT DO NOTHING;

-- 10. Vérifier que tout est créé
SELECT 
  'Tables créées avec succès !' as message,
  (SELECT COUNT(*) FROM prompts_ia) as prompts_count,
  (SELECT COUNT(*) FROM faq_items) as faq_count,
  EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') as pgvector_installed;