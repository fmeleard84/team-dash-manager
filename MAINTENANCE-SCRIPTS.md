# 📚 Scripts de Maintenance - Team Dash Manager

## 🔍 Scripts d'Audit et Diagnostic

### `audit-dev-prod-safe.mjs`
**Description**: Compare les bases DEV et PROD pour vérifier la cohérence
```bash
# Configuration requise (variables d'environnement ou .env.local)
export DEV_SUPABASE_ANON_KEY="..."
export PROD_SUPABASE_ANON_KEY="..."

# Exécution
node audit-dev-prod-safe.mjs
```
**Vérifie**:
- Tables présentes (27 tables critiques)
- Structure des colonnes
- Politiques RLS
- Différences entre DEV et PROD

### `check-tables-dev-prod.mjs`
**Description**: Vérification rapide des tables principales
```bash
node check-tables-dev-prod.mjs
```

### `check-kanban-content.mjs`
**Description**: Analyse le contenu des tableaux Kanban
```bash
export SUPABASE_SERVICE_KEY="..."
node check-kanban-content.mjs
```

### `check-supabase-config.mjs`
**Description**: Vérifie la configuration Supabase
```bash
node check-supabase-config.mjs
```

## 🚀 Scripts de Déploiement

### `push-to-prod.sh`
**Description**: Synchronise le code DEV vers PROD
```bash
./push-to-prod.sh
```
**Actions**:
1. Sauvegarde l'environnement PROD
2. Copie le code DEV → PROD
3. Préserve les fichiers de configuration PROD
4. Reconstruit l'application
5. Redémarre PM2

### `deploy.sh`
**Description**: Déploiement complet DEV et/ou PROD
```bash
./deploy.sh dev    # Déployer DEV uniquement
./deploy.sh prod   # Déployer PROD uniquement
./deploy.sh both   # Déployer les deux
```

### `quick-setup-prod.sh`
**Description**: Configuration rapide de production
```bash
./quick-setup-prod.sh
```

### `configure-production.sh`
**Description**: Configuration initiale de production
```bash
./configure-production.sh
```

## 🗄️ Scripts de Base de Données

### `init-production-db.mjs`
**Description**: Initialise la base de données de production
```bash
node init-production-db.mjs
```

### `sync-dev-to-prod.sh`
**Description**: Synchronise le schéma DEV vers PROD
```bash
./sync-dev-to-prod.sh
```

### `setup-production-db.sh`
**Description**: Configure la base de données production
```bash
./setup-production-db.sh
```

## ✉️ Scripts de Test Email

### `test-real-email.mjs`
**Description**: Test d'envoi d'email via Brevo
```bash
node test-real-email.mjs
```

### `test-production-email.mjs`
**Description**: Test email en environnement production
```bash
node test-production-email.mjs
```

### `test-production-signup.mjs`
**Description**: Test d'inscription en production
```bash
node test-production-signup.mjs
```

## 🛠️ Commandes PM2

### Gestion des Processus
```bash
# Statut
pm2 status

# Démarrer
pm2 start ecosystem.config.cjs --only team-dash-dev
pm2 start ecosystem.config.cjs --only team-dash-prod

# Redémarrer
pm2 restart team-dash-dev
pm2 restart team-dash-prod

# Arrêter
pm2 stop team-dash-dev
pm2 stop team-dash-prod

# Logs
pm2 logs team-dash-dev --lines 100
pm2 logs team-dash-prod --lines 100

# Monitoring
pm2 monit

# Sauvegarder la configuration
pm2 save
pm2 startup
```

## 📦 Commandes NPM

### Développement
```bash
# Installer les dépendances
npm install

# Démarrer en mode développement
npm run dev

# Build pour production
npm run build

# Preview production build
npm run preview

# Tests
npm test

# Linting
npm run lint
```

## 🔧 Commandes Supabase

### Edge Functions
```bash
# Déployer une fonction (DEV)
SUPABASE_ACCESS_TOKEN="sbp_..." \
SUPABASE_DB_PASSWORD="..." \
npx supabase functions deploy [function-name] --project-ref egdelmcijszuapcpglsy

# Déployer une fonction (PROD)
SUPABASE_ACCESS_TOKEN="sbp_..." \
SUPABASE_DB_PASSWORD="..." \
npx supabase functions deploy [function-name] --project-ref nlesrzepybeeghghjafc

# Voir les logs
SUPABASE_ACCESS_TOKEN="sbp_..." \
npx supabase functions logs [function-name] --project-ref [ref] --limit 10

# Lister les fonctions
SUPABASE_ACCESS_TOKEN="sbp_..." \
npx supabase functions list --project-ref [ref]
```

### Base de Données
```bash
# Export du schéma
SUPABASE_ACCESS_TOKEN="sbp_..." \
npx supabase db dump --schema public -f schema.sql

# Push des migrations
SUPABASE_ACCESS_TOKEN="sbp_..." \
SUPABASE_DB_PASSWORD="..." \
npx supabase db push --project-ref [ref]

# Link au projet
SUPABASE_ACCESS_TOKEN="sbp_..." \
npx supabase link --project-ref [ref]
```

## 🐧 Commandes Système

### Nginx
```bash
# Vérifier la configuration
sudo nginx -t

# Recharger
sudo nginx -s reload

# Status
sudo systemctl status nginx

# Logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Ports et Processus
```bash
# Voir les ports utilisés
sudo lsof -i :8081  # DEV
sudo lsof -i :3000  # PROD

# Tuer un processus par port
sudo kill -9 $(sudo lsof -t -i:8081)

# Vérifier les connexions
netstat -tlnp
```

### Git
```bash
# Status
git status

# Sauvegarder les changements
git add .
git commit -m "Description"
git push

# Stash temporaire
git stash
git stash pop

# Vérifier les branches
git branch -a

# Logs
git log --oneline -10
```

## 📊 Variables d'Environnement Requises

### Pour les Scripts d'Audit
```bash
DEV_SUPABASE_URL=https://egdelmcijszuapcpglsy.supabase.co
DEV_SUPABASE_ANON_KEY=...

PROD_SUPABASE_URL=https://nlesrzepybeeghghjafc.supabase.co
PROD_SUPABASE_ANON_KEY=...

SUPABASE_SERVICE_KEY=...  # Pour certains scripts avancés
```

### Pour les Edge Functions
```bash
SUPABASE_ACCESS_TOKEN=sbp_...
SUPABASE_DB_PASSWORD_DEV=...
SUPABASE_DB_PASSWORD_PROD=...
```

## 🔒 Sécurité

**IMPORTANT**:
- Ne jamais commiter `.env.local`
- Ne jamais hardcoder les clés dans les scripts
- Utiliser `.env.local.example` comme template
- Toutes les clés sensibles dans les variables d'environnement

## 📝 Notes

- Les scripts `.mjs` nécessitent Node.js 18+
- Les scripts `.sh` nécessitent bash
- PM2 doit être installé globalement (`npm install -g pm2`)
- Toujours faire un backup avant les opérations critiques

---
*Dernière mise à jour: 17/09/2025*
*Documentation des scripts de maintenance*