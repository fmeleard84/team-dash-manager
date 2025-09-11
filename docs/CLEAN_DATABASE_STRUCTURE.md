# Structure de Base de Données Nettoyée

## ✅ Tables Utilisées (Bonnes RLS)

### 1. **FAQ : `faq_items`**
- ✅ Table originale avec RLS correctes
- ✅ Policies fonctionnelles pour admin
- ✅ Indicateur de synchronisation vectorielle
- ❌ ~~`ai_faq`~~ (supprimée - doublon)

### 2. **Prompts : `prompts_ia`**
- ✅ Table originale avec RLS correctes  
- ✅ Structure complète avec contextes
- ✅ Policies fonctionnelles pour admin
- ❌ ~~`ai_prompts`~~ (supprimée - doublon)

### 3. **Logs : `ai_action_logs`**
- ✅ Table conservée pour historique des actions

### 4. **Base Vectorielle : `documentation_embeddings`**
- ✅ Stockage des embeddings OpenAI
- ✅ Synchronisation automatique des FAQs
- ✅ Index HNSW pour recherche performante

## 🔧 Configuration Correcte

### FAQ (`faq_items`)
```sql
-- Structure
- id: UUID
- question: TEXT
- answer: TEXT
- category: TEXT
- tags: TEXT[]
- is_published: BOOLEAN (au lieu de is_active)
- order_index: INTEGER
- embedding_synced_at: TIMESTAMPTZ (indicateur de sync)
```

### Prompts (`prompts_ia`)
```sql
-- Structure
- id: TEXT (PRIMARY KEY)
- name: TEXT
- context: TEXT (general, team-composition, etc.)
- prompt: TEXT (contenu du prompt)
- active: BOOLEAN
- priority: INTEGER (0-10)
- variables: JSONB
```

## 🚀 Utilisation dans le Code

### Component Admin
```typescript
// src/components/admin/AIAssistantManager.tsx
- Table FAQ: faq_items
- Table Prompts: prompts_ia
- Champs adaptés (is_published, active, prompt)
```

### Hook IA Realtime
```typescript
// src/ai-assistant/hooks/useRealtimeAssistant.ts
- Récupère prompts depuis prompts_ia
- Filtre par active = true
- Utilise le champ 'prompt' (pas 'content')
```

### Synchronisation Vectorielle
```typescript
// supabase/functions/sync-faq-embeddings
- Lit depuis faq_items
- Écrit dans documentation_embeddings
- Met à jour embedding_synced_at
```

## ✅ Vérification RLS

### Pour les FAQs
```sql
-- Lecture publique des FAQs publiées
CREATE POLICY "FAQ items visible pour tous" ON faq_items
  FOR SELECT USING (is_published = true);

-- Gestion admin
CREATE POLICY "Admins peuvent gérer FAQ items" ON faq_items
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );
```

### Pour les Prompts
```sql
-- Lecture pour authentifiés
CREATE POLICY "prompts_ia_read_policy" ON prompts_ia
  FOR SELECT USING (auth.role() = 'authenticated');

-- Écriture admin seulement
CREATE POLICY "prompts_ia_write_policy" ON prompts_ia
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

## 🎯 Résumé

| Fonctionnalité | Table Correcte | Table Supprimée |
|----------------|---------------|-----------------|
| FAQ | `faq_items` | ~~`ai_faq`~~ |
| Prompts | `prompts_ia` | ~~`ai_prompts`~~ |
| Logs | `ai_action_logs` | - |
| Embeddings | `documentation_embeddings` | - |

## 📝 Notes Importantes

1. **Ne PAS recréer** les tables supprimées
2. **Toujours utiliser** les tables listées ci-dessus
3. **RLS déjà configurées** - pas besoin de les modifier
4. **L'IA utilise automatiquement** les prompts de `prompts_ia`
5. **Synchronisation vectorielle** fonctionne avec `faq_items`

## 🔍 Commandes de Vérification

```bash
# Vérifier les tables FAQ/Prompts
psql $DATABASE_URL -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND (table_name LIKE '%faq%' OR table_name LIKE '%prompt%');"

# Vérifier les policies
psql $DATABASE_URL -c "SELECT tablename, policyname FROM pg_policies WHERE tablename IN ('faq_items', 'prompts_ia');"
```