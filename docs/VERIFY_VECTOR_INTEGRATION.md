# 🔍 Comment Vérifier les Intégrations dans Supabase

## 📊 Vue d'ensemble rapide

### 1. **Dashboard Supabase - Table Editor**
1. Allez dans : **Dashboard Supabase** → **Table Editor**
2. Cherchez ces tables :
   - ✅ `faq_items` - Vos FAQs
   - ✅ `documentation_embeddings` - Les vecteurs générés
   - ✅ `embedding_sync_queue` - La queue de traitement
   - ✅ `prompts_ia` - Les prompts de l'IA

### 2. **Vérification Complète via SQL**

Copiez le contenu de `/verify-vector-integration.sql` dans :
- **Dashboard** → **SQL Editor** → **New Query**
- Cliquez **Run**

Vous verrez :
- ✅ Si pgvector est installé
- 📊 Nombre de FAQs créées
- 🔄 État de la queue de synchronisation
- 🎯 Nombre d'embeddings générés
- 🔍 Test de recherche vectorielle

## 🎯 Ce que vous devez voir

### ✅ **Système Fonctionnel**
```sql
-- Résultat attendu :
pgvector installé     : ✅ version 0.8.0
Tables créées        : ✅ 3/3
FAQs synchronisées   : ✅ 5/5
Embeddings générés   : ✅ 5 (1536 dimensions)
Queue en attente     : 0
Statut global        : ✅ Système opérationnel
```

### ⚠️ **Problèmes Possibles**

#### 1. "Pas d'embeddings"
```sql
FAQs synchronisées : 0/5
Embeddings générés : 0
```
**Solution** : Les triggers ne sont pas créés
→ Exécutez `/create-triggers.sql`

#### 2. "Queue bloquée"
```sql
Queue en attente : 5
Status : pending
```
**Solution** : Cliquez "Synchroniser Tout" dans l'interface

#### 3. "Embeddings sans vecteurs"
```sql
avec_vecteur : 0
sans_vecteur : 5
```
**Solution** : Clé OpenAI manquante ou invalide

## 🔬 Vérifications Détaillées

### 1. **Voir les FAQs et leur statut**
```sql
SELECT 
    question,
    CASE 
        WHEN embedding_synced_at IS NOT NULL THEN '✅ Synchronisé'
        ELSE '⏳ En attente'
    END as statut
FROM faq_items;
```

### 2. **Voir les embeddings générés**
```sql
SELECT 
    content_type,
    LEFT(content, 100) as apercu,
    array_length(embedding::real[], 1) as dimensions
FROM documentation_embeddings
WHERE embedding IS NOT NULL;
```

### 3. **Tester la recherche vectorielle**
```sql
-- Trouve les FAQs similaires à "comment créer un projet"
WITH query_embedding AS (
    SELECT embedding 
    FROM documentation_embeddings 
    WHERE content ILIKE '%créer%projet%' 
    LIMIT 1
)
SELECT 
    de.content,
    1 - (de.embedding <=> qe.embedding) as similarite
FROM documentation_embeddings de, query_embedding qe
WHERE de.embedding IS NOT NULL
ORDER BY de.embedding <=> qe.embedding
LIMIT 5;
```

## 🎨 Interface Visuelle

### Dans Table Editor, vous pouvez :

1. **Cliquer sur `faq_items`**
   - Voir toutes vos FAQs
   - Vérifier la colonne `embedding_synced_at`
   - ✅ = Date présente = Synchronisé
   - ❌ = NULL = En attente

2. **Cliquer sur `documentation_embeddings`**
   - Voir les embeddings générés
   - La colonne `embedding` contient le vecteur (1536 nombres)
   - `source_id` = ID de la FAQ correspondante

3. **Cliquer sur `embedding_sync_queue`**
   - Voir la queue de traitement
   - `status` = 'completed' ✅
   - `status` = 'pending' ⏳
   - `status` = 'failed' ❌

## 📈 Métriques Importantes

```sql
-- Dashboard de monitoring
SELECT 
    'Métriques Système' as titre,
    jsonb_build_object(
        'total_faqs', (SELECT COUNT(*) FROM faq_items),
        'faqs_synchronisees', (SELECT COUNT(*) FROM faq_items WHERE embedding_synced_at IS NOT NULL),
        'embeddings_actifs', (SELECT COUNT(*) FROM documentation_embeddings WHERE embedding IS NOT NULL),
        'taille_moyenne_vecteur', (SELECT AVG(array_length(embedding::real[], 1)) FROM documentation_embeddings WHERE embedding IS NOT NULL),
        'queue_en_attente', (SELECT COUNT(*) FROM embedding_sync_queue WHERE status = 'pending'),
        'derniere_sync', (SELECT MAX(processed_at) FROM embedding_sync_queue WHERE status = 'completed')
    ) as metriques;
```

## 🚀 Actions Rapides

### Forcer la resynchronisation de tout
```sql
-- Marquer toutes les FAQs comme non synchronisées
UPDATE faq_items SET embedding_synced_at = NULL;

-- Vider la queue
TRUNCATE embedding_sync_queue;

-- Puis cliquez "Synchroniser Tout" dans l'interface
```

### Nettoyer les anciens embeddings
```sql
-- Supprimer les embeddings orphelins
DELETE FROM documentation_embeddings
WHERE source_id NOT IN (SELECT id::TEXT FROM faq_items);
```

### Vérifier l'accès de l'IA
```sql
-- L'IA peut-elle voir les embeddings ?
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ L''IA a accès à ' || COUNT(*) || ' embeddings'
        ELSE '❌ Aucun embedding accessible'
    END as acces_ia
FROM documentation_embeddings
WHERE embedding IS NOT NULL
AND content_type = 'faq';
```

## 💡 Résumé

**L'IA a accès à la base vectorielle** quand :
1. ✅ pgvector est installé (version 0.8.0)
2. ✅ Les FAQs sont créées
3. ✅ Les embeddings sont générés (vecteurs de 1536 dimensions)
4. ✅ La table `documentation_embeddings` contient les vecteurs

**Pour vérifier rapidement** :
- Dashboard → SQL Editor → Collez le script de vérification → Run
- Si tout est vert (✅), l'IA peut utiliser vos FAQs !

## 🔗 Flux Complet

```
FAQ créée → Trigger → Queue → Edge Function → OpenAI API → Vecteur 1536D → Table embeddings → IA cherche
```

Chaque étape est vérifiable dans Supabase !