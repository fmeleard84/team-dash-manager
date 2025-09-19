# 🔐 Mise à jour du Mot de Passe PostgreSQL - Résumé

## Date : 19/09/2025

### ✅ Changement Effectué

- **Ancien mot de passe** : `R@ymonde7510_2a` (avec caractère @)
- **Nouveau mot de passe** : `Raymonde7510_2a` (sans caractère @)

### 📝 Raison du Changement

Le caractère `@` dans l'ancien mot de passe causait des problèmes avec les URLs de connexion PostgreSQL, rendant difficile l'utilisation de psql et des scripts de migration.

### 📂 Fichiers Mis à Jour (10 fichiers)

1. ✅ `CLAUDE.md` - Documentation principale
2. ✅ `apply-migration-direct.mjs` - Script de migration IA
3. ✅ `sync-database-to-prod.mjs` - Synchronisation BDD
4. ✅ `apply-rls-fix.mjs` - Corrections RLS
5. ✅ `apply-archive-migration.js` - Migration archivage
6. ✅ `supabase-sql-helper.sh` - Helper SQL
7. ✅ `check-admin-user.sql` - Vérification admin
8. ✅ `docs/VECTOR_DB_STATUS.md` - Documentation Vector DB
9. ✅ `supabase/functions/check-and-fix-qualification-rls/index.ts`
10. ✅ `supabase/functions/fix-qualification-table/index.ts`
11. ✅ `supabase/functions/fix-time-tracking-rls/index.ts`

### ⚠️ Important à Noter

1. **Les Edge Functions** utilisant les clés API (ANON_KEY, SERVICE_ROLE_KEY) ne sont **PAS affectées** par ce changement.

2. **La base de production** (`nlesrzepybeeghghjafc`) utilise un mot de passe différent (`Raymonde7510`) et n'est pas affectée.

3. **Les connexions directes PostgreSQL** (psql, pg client) doivent maintenant utiliser le nouveau mot de passe.

### 🚀 Commandes de Déploiement Mises à Jour

```bash
# Déployer une Edge Function (DEV)
SUPABASE_ACCESS_TOKEN="sbp_b8ec67e2a4f3a7922f6cfea023b2cf81a00a7d9e" \
SUPABASE_DB_PASSWORD="Raymonde7510_2a" \
npx supabase functions deploy [function-name] --project-ref egdelmcijszuapcpglsy

# Connexion PostgreSQL directe
psql "postgresql://postgres.egdelmcijszuapcpglsy:Raymonde7510_2a@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
```

### ✅ État du Système

- Toutes les Edge Functions continuent de fonctionner normalement
- Les scripts de migration ont été mis à jour
- La documentation a été mise à jour
- Le système est pleinement opérationnel

### 📌 À Retenir

Si vous devez créer de nouveaux scripts nécessitant une connexion PostgreSQL directe, utilisez toujours :
- **Mot de passe** : `Raymonde7510_2a`
- **Sans le caractère @** pour éviter les problèmes d'URL encoding