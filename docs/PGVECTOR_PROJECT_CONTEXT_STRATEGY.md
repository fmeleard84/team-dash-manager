# 🧠 STRATÉGIE PGVECTOR POUR IA CANDIDATES PAR PROJET

## 📊 ANALYSE DE L'EXISTANT

### Infrastructure pgvector opérationnelle
- ✅ Extension pgvector activée
- ✅ Table `documentation_embeddings` avec vector(1536)
- ✅ Index HNSW pour recherche rapide
- ✅ Fonction RPC `search_faq_embeddings` fonctionnelle
- ✅ IA Header utilise déjà pgvector pour FAQ/Documentation

### Problème actuel
Les IA candidates n'ont accès qu'aux FAQ générales, pas au contexte spécifique du projet :
- ❌ Pas d'accès aux messages du projet
- ❌ Pas d'accès aux documents Drive du projet
- ❌ Pas d'accès aux cartes Kanban du projet
- ❌ Pas de mémoire des décisions prises

## 🎯 ARCHITECTURE PROPOSÉE

### 1. Table `project_embeddings` (nouvelle)
```sql
CREATE TABLE public.project_embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  content_type TEXT CHECK (content_type IN (
    'message',      -- Messages d'équipe
    'document',     -- Documents Drive
    'kanban_card',  -- Cartes Kanban
    'decision',     -- Décisions importantes
    'deliverable'   -- Livrables générés
  )),
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Indexation
  INDEX idx_project_embeddings_project (project_id),
  INDEX idx_project_embeddings_vector USING hnsw (embedding vector_cosine_ops)
);
```

### 2. Système de synchronisation automatique

#### Trigger sur les messages
```sql
CREATE TRIGGER sync_message_embeddings
  AFTER INSERT OR UPDATE ON messages
  FOR EACH ROW
  WHEN (NEW.thread_id IN (
    SELECT id FROM message_threads WHERE project_id IS NOT NULL
  ))
  EXECUTE FUNCTION queue_project_embedding();
```

#### Trigger sur les fichiers Drive
```sql
CREATE TRIGGER sync_drive_embeddings
  AFTER INSERT ON kanban_files
  FOR EACH ROW
  WHEN (NEW.project_id IS NOT NULL)
  EXECUTE FUNCTION queue_project_embedding();
```

### 3. Edge Function `process-project-embeddings`

Traite la queue et génère les embeddings avec contexte projet :
```typescript
// Enrichissement du contexte pour embedding
const enrichedContent = {
  content: item.content,
  project_id: item.project_id,
  type: item.content_type,
  metadata: {
    author: item.created_by,
    timestamp: item.created_at,
    context: await getProjectContext(item.project_id)
  }
};

// Génération embedding via OpenAI
const embedding = await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: JSON.stringify(enrichedContent)
});
```

## 🔄 FLUX D'INTÉGRATION IA CANDIDATE

### 1. Récupération du contexte projet
```typescript
// Dans ai-conversation-handler
async function getProjectContext(projectId: string, query: string) {
  // 1. Recherche vectorielle dans le contexte du projet
  const projectResults = await supabase.rpc('search_project_embeddings', {
    p_project_id: projectId,
    p_query: query,
    p_limit: 5,
    p_threshold: 0.7
  });

  // 2. Recherche dans les FAQ générales si pertinent
  const faqResults = await supabase.rpc('search_faq_embeddings', {
    query_text: query,
    similarity_threshold: 0.8,
    match_count: 3
  });

  // 3. Agrégation du contexte
  return {
    project_specific: projectResults,
    general_knowledge: faqResults,
    recent_messages: await getRecentMessages(projectId, 10),
    active_tasks: await getActiveKanbanCards(projectId)
  };
}
```

### 2. Prompt enrichi pour l'IA
```typescript
const systemPrompt = `
Vous êtes ${iaProfile.name} sur le projet "${project.title}".

CONTEXTE DU PROJET:
${contextualInfo.project_specific.map(item => item.content).join('\n')}

MESSAGES RÉCENTS DE L'ÉQUIPE:
${contextualInfo.recent_messages.map(m => `${m.sender}: ${m.content}`).join('\n')}

TÂCHES EN COURS:
${contextualInfo.active_tasks.map(t => `- ${t.title}: ${t.status}`).join('\n')}

INSTRUCTIONS SPÉCIFIQUES:
${iaProfile.prompt}

Répondez en tenant compte du contexte ci-dessus.
`;
```

## 🚀 PLAN D'IMPLÉMENTATION

### Phase 1 : Infrastructure (Immédiat)
1. ✅ Tables Drive créées (FAIT)
2. Créer table `project_embeddings`
3. Créer fonction RPC `search_project_embeddings`
4. Créer triggers de synchronisation

### Phase 2 : Synchronisation (Court terme)
1. Edge Function `process-project-embeddings`
2. Queue de traitement avec retry
3. Monitoring des embeddings générés

### Phase 3 : Intégration IA (Moyen terme)
1. Modifier `ai-conversation-handler` pour utiliser le contexte projet
2. Enrichir les prompts avec contexte vectoriel
3. Ajouter mémoire conversationnelle par thread

### Phase 4 : Optimisations (Long terme)
1. Cache des embeddings fréquents
2. Compression des vieux embeddings
3. Analyse de pertinence automatique

## 💡 AVANTAGES DE CETTE APPROCHE

### Pour les IA candidates
- ✅ Contexte complet du projet
- ✅ Mémoire des discussions passées
- ✅ Compréhension des décisions prises
- ✅ Capacité à référencer des documents

### Pour les utilisateurs
- ✅ IA plus pertinentes et contextualisées
- ✅ Réponses cohérentes avec l'historique
- ✅ Suggestions basées sur le travail réel
- ✅ Continuité entre sessions

### Pour le système
- ✅ Réutilisation de pgvector existant
- ✅ Architecture scalable
- ✅ Isolation par projet (sécurité)
- ✅ Performance optimisée avec HNSW

## 🔒 SÉCURITÉ & ISOLATION

### RLS sur `project_embeddings`
```sql
-- Lecture : membres du projet uniquement
CREATE POLICY "read_project_embeddings" ON project_embeddings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM hr_resource_assignments
      WHERE project_id = project_embeddings.project_id
      AND candidate_id = auth.uid()
      AND booking_status = 'accepted'
    )
    OR EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_embeddings.project_id
      AND owner_id = auth.uid()
    )
  );
```

### Isolation des données
- Chaque projet a ses propres embeddings
- Pas de fuite d'information entre projets
- Les IA ne voient que leur projet assigné

## 📈 MÉTRIQUES DE SUCCÈS

- Temps de réponse IA < 3s
- Pertinence contextuelle > 85%
- Utilisation mémoire < 100MB par projet
- Satisfaction utilisateur > 4.5/5

## 🛠️ COMMANDES DE DÉPLOIEMENT

```bash
# 1. Créer les tables et fonctions
psql $DATABASE_URL -f migrations/create_project_embeddings.sql

# 2. Déployer l'Edge Function
npx supabase functions deploy process-project-embeddings \
  --project-ref egdelmcijszuapcpglsy

# 3. Configurer le CRON (toutes les 2 minutes)
SELECT cron.schedule(
  'process-project-embeddings',
  '*/2 * * * *',
  $$SELECT process_embedding_queue('project')$$
);
```

## ✅ RECOMMANDATION FINALE

**Je recommande l'implémentation immédiate de la Phase 1** pour :
1. Permettre aux IA d'avoir accès au contexte complet du projet
2. Améliorer drastiquement la pertinence des réponses
3. Créer une base solide pour l'évolution future

Cette architecture est **compatible avec l'existant**, **scalable**, et **sécurisée**.