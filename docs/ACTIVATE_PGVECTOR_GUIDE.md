# 🚀 Guide : Activer pgvector dans Supabase

## Méthode 1 : Via le Dashboard Supabase (Recommandé) ✅

### Étapes :

1. **Connectez-vous au Dashboard Supabase**
   ```
   https://supabase.com/dashboard/project/egdelmcijszuapcpglsy
   ```

2. **Allez dans Database → Extensions**
   - Dans le menu latéral gauche, cliquez sur **"Database"**
   - Puis cliquez sur **"Extensions"**

3. **Recherchez "vector"**
   - Dans la barre de recherche en haut, tapez : **vector**
   - Vous verrez apparaître : **"vector - vector data type and ivfflat and hnsw access methods"**

4. **Activez l'extension**
   - Cliquez sur le bouton **"Enable"** à droite
   - Attendez quelques secondes
   - Le statut passera à **"Enabled"** ✅

## Méthode 2 : Via SQL Editor 📝

Si la méthode 1 ne fonctionne pas :

1. **Allez dans SQL Editor**
   - Dashboard → **SQL Editor** (dans le menu latéral)

2. **Exécutez cette commande**
   ```sql
   -- Activer pgvector
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

3. **Cliquez sur "Run"** (ou Ctrl+Enter)

4. **Vérifiez l'installation**
   ```sql
   -- Vérifier que pgvector est installé
   SELECT * FROM pg_extension WHERE extname = 'vector';
   ```

## Méthode 3 : Via notre Edge Function 🤖

J'ai créé une fonction pour vous aider :

```bash
# Depuis votre terminal
curl -X POST https://egdelmcijszuapcpglsy.supabase.co/functions/v1/setup-vector-system \
  -H "Authorization: Bearer VOTRE_ANON_KEY" \
  -H "Content-Type: application/json"
```

Cette fonction vous dira si pgvector est installé et ce qu'il manque.

## 🔍 Vérification

Pour vérifier que pgvector est bien activé :

### Option A : Dashboard
1. Database → Extensions
2. Cherchez "vector"
3. Doit afficher **"Enabled"**

### Option B : SQL
```sql
-- Dans SQL Editor
SELECT 
    extname as extension,
    extversion as version,
    CASE 
        WHEN extname = 'vector' THEN '✅ Installé'
        ELSE '❌ Non trouvé'
    END as status
FROM pg_extension 
WHERE extname = 'vector';
```

### Option C : Test de création
```sql
-- Essayez de créer une colonne vector
CREATE TABLE test_vector (
    id serial PRIMARY KEY,
    embedding vector(3)
);

-- Si ça marche, pgvector est installé !
-- Supprimez la table de test
DROP TABLE IF EXISTS test_vector;
```

## ⚠️ Troubleshooting

### Erreur : "type vector does not exist"
→ pgvector n'est pas activé. Suivez la Méthode 1.

### Erreur : "permission denied to create extension"
→ Utilisez le Dashboard (Méthode 1) au lieu du SQL.

### Erreur : "extension vector is not available"
→ Contactez le support Supabase (rare, pgvector est standard).

## 📊 Après l'activation

Une fois pgvector activé, vous pouvez :

1. **Appliquer les migrations**
   ```bash
   npx supabase db push --project-ref egdelmcijszuapcpglsy
   ```

2. **Créer des tables avec embeddings**
   ```sql
   CREATE TABLE documentation_embeddings (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       content TEXT,
       embedding vector(1536)  -- OpenAI embeddings
   );
   ```

3. **Faire des recherches vectorielles**
   ```sql
   -- Recherche par similarité
   SELECT * FROM documentation_embeddings
   ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
   LIMIT 10;
   ```

## 🎯 Résumé Rapide

1. **Où** : Dashboard → Database → Extensions
2. **Quoi** : Chercher "vector"
3. **Action** : Cliquer "Enable"
4. **Temps** : 30 secondes

C'est tout ! 🎉