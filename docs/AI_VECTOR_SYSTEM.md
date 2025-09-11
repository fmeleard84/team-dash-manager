# Système de Base Vectorielle pour l'Assistant IA

## 🎯 Vue d'ensemble

Le système de base vectorielle permet à l'assistant IA de rechercher sémantiquement dans les FAQs et autres contenus, offrant des réponses plus pertinentes et contextuelles.

## 🏗️ Architecture

### Tables principales

1. **`documentation_embeddings`**
   - Stocke les vecteurs d'embeddings (1536 dimensions - OpenAI)
   - Types de contenu : FAQ, documentation, client_info, project_info, wiki
   - Index HNSW pour recherche vectorielle performante

2. **`ai_faq`**
   - Questions/réponses avec tags et catégories
   - Synchronisation automatique avec la base vectorielle

3. **`sync_queue`**
   - File d'attente pour synchronisation asynchrone
   - Suivi des erreurs et statuts

## 🔄 Flux de synchronisation

### Automatique (Triggers)
1. **Création/Modification FAQ** → Trigger `trigger_faq_sync_queue`
2. **Ajout à la queue** → Table `sync_queue`
3. **Traitement asynchrone** → Edge Function `sync-faq-embeddings`

### Manuelle (Admin)
- Bouton "Synchroniser vectoriel" dans l'interface admin
- Synchronise toutes les FAQs actives en une fois

## 🚀 Utilisation

### Pour les administrateurs

1. **Créer/Modifier des FAQs**
   - Aller dans `/admin/assistant`
   - Onglet "FAQ"
   - Les FAQs sont automatiquement vectorisées

2. **Synchronisation manuelle**
   - Cliquer sur "Synchroniser vectoriel"
   - Utile après import en masse ou problèmes

3. **Vérifier la synchronisation**
   - Colonne `last_sync_at` dans la table `ai_faq`
   - Logs dans `sync_queue`

### Pour l'IA

L'assistant utilise automatiquement la recherche vectorielle pour :
- Trouver les FAQs pertinentes
- Enrichir le contexte des réponses
- Suggérer des questions similaires

## 🔧 Configuration

### Variables d'environnement requises
```env
OPENAI_API_KEY=sk-...  # Dans Supabase Vault
```

### Edge Functions déployées
- `sync-faq-embeddings` : Synchronisation des FAQs
- `apply-faq-sync-migration` : Migration initiale

## 📊 Métriques et monitoring

### Vérifier l'état de synchronisation
```sql
-- FAQs non synchronisées
SELECT * FROM ai_faq 
WHERE last_sync_at IS NULL 
OR last_sync_at < updated_at;

-- Queue de synchronisation
SELECT * FROM sync_queue 
WHERE status = 'pending' 
ORDER BY created_at DESC;

-- Embeddings par type
SELECT content_type, COUNT(*) 
FROM documentation_embeddings 
GROUP BY content_type;
```

### Recherche vectorielle
```sql
-- Recherche sémantique (depuis Edge Function)
SELECT * FROM search_documentation(
  query_embedding := '[...]'::vector,
  match_threshold := 0.7,
  match_count := 5,
  filter_type := 'faq'
);
```

## 🔍 Fonctionnalités avancées

### Types de contenu supportés
- **`faq`** : Questions fréquentes
- **`documentation`** : Documentation technique
- **`client_info`** : Informations clients
- **`project_info`** : Détails des projets
- **`wiki`** : Pages wiki

### Recherche hybride
Le système combine :
1. **Recherche vectorielle** : Similarité sémantique
2. **Recherche textuelle** : Mots-clés exacts
3. **Filtres métadonnées** : Catégories, tags

## 🐛 Dépannage

### FAQs non vectorisées
1. Vérifier la clé OpenAI dans Supabase Vault
2. Lancer synchronisation manuelle
3. Vérifier les logs : `npx supabase functions logs sync-faq-embeddings`

### Performances lentes
1. Vérifier l'index HNSW : `documentation_embeddings_embedding_idx`
2. Limiter `match_count` dans les recherches
3. Augmenter `match_threshold` pour plus de précision

### Erreurs de synchronisation
```bash
# Voir les logs
SUPABASE_ACCESS_TOKEN="..." npx supabase functions logs sync-faq-embeddings --limit 20

# Relancer la synchronisation
node -e "
import('@supabase/supabase-js').then(({createClient}) => {
  const supabase = createClient('URL', 'KEY');
  supabase.functions.invoke('sync-faq-embeddings').then(console.log);
});
"
```

## 📚 Ressources

- [Documentation OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Supabase Vector Search](https://supabase.com/docs/guides/ai/vector-columns)

## ✅ Checklist de déploiement

- [ ] Clé OpenAI configurée dans Supabase Vault
- [ ] Extension pgvector activée
- [ ] Tables de base créées (`documentation_embeddings`, `sync_queue`)
- [ ] Edge Functions déployées
- [ ] Migration des triggers appliquée
- [ ] Test de synchronisation manuelle réussi
- [ ] Vérification des embeddings créés