# Guide d'utilisation des outils Supabase

## ✅ Problèmes résolus

### 1. **psql est maintenant installé**
- Accès direct à la base de données PostgreSQL
- Exécution de SQL sans passer par l'API

### 2. **Outils créés pour simplifier les interventions**

#### a) Script bash simple : `supabase-sql-helper.sh`
```bash
# Exécuter une requête SQL
./supabase-sql-helper.sh "SELECT * FROM profiles LIMIT 5;"

# Exécuter un UPDATE
./supabase-sql-helper.sh "UPDATE profiles SET updated_at = now() WHERE id = 'xxx';"
```

#### b) Helper Node.js complet : `supabase-helper.js`
```bash
# Exécuter une requête SQL
node supabase-helper.js sql "SELECT COUNT(*) FROM candidate_profiles;"

# Exécuter un fichier SQL
node supabase-helper.js file FIX_CANDIDATE_REGISTRATION.sql

# Tester la connexion
node supabase-helper.js test

# Afficher l'aide
node supabase-helper.js help
```

### 3. **Configuration centralisée**
Le fichier `.env.supabase` contient toutes les informations de connexion.

## 📝 Comment appliquer des correctifs SQL maintenant

### Option 1 : Directement avec psql
```bash
PGPASSWORD="R@ymonde7510_2a" psql -h aws-0-eu-west-3.pooler.supabase.com -p 6543 -U postgres.egdelmcijszuapcpglsy -d postgres -c "VOTRE_SQL_ICI"
```

### Option 2 : Avec le helper bash
```bash
./supabase-sql-helper.sh "VOTRE_SQL_ICI"
```

### Option 3 : Avec le helper Node.js
```bash
node supabase-helper.js sql "VOTRE_SQL_ICI"
```

### Option 4 : Pour un fichier SQL complet
```bash
# Avec psql directement
PGPASSWORD="R@ymonde7510_2a" psql -h aws-0-eu-west-3.pooler.supabase.com -p 6543 -U postgres.egdelmcijszuapcpglsy -d postgres < fichier.sql

# Avec le helper Node.js
node supabase-helper.js file fichier.sql
```

## 🔐 Fonction exec_sql créée dans la base

Une fonction `exec_sql` a été créée dans votre base de données. Elle permet d'exécuter du SQL dynamiquement via l'API Supabase, mais elle est limitée aux admins pour des raisons de sécurité.

## ⚠️ Problème des migrations non résolu

Les migrations locales et distantes sont désynchronisées. Pour l'instant, utilisez directement psql ou les helpers pour appliquer les changements SQL.

## 🚀 Exemple concret : Correction du problème d'inscription des candidats

Le problème a été résolu avec :
```bash
node supabase-helper.js file FIX_CANDIDATE_REGISTRATION.sql
```

## 📌 Pour les futures interventions

Je peux maintenant :
1. ✅ Exécuter directement du SQL avec psql
2. ✅ Appliquer des correctifs depuis des fichiers SQL
3. ✅ Tester et valider les modifications
4. ✅ Créer et modifier des tables, fonctions, triggers, etc.

Il suffit de me demander d'appliquer un correctif et j'utiliserai ces outils automatiquement.