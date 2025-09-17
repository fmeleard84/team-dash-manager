# 📦 Guide de Déploiement - Team Dash Manager

## 🏗️ Architecture

Le projet est configuré avec deux environnements séparés sur le même serveur :

- **Développement** : `/opt/team-dash-manager` (port 8081)
- **Production** : `/opt/team-dash-manager-prod` (port 3000)

Chaque environnement utilise sa propre base de données Supabase.

## 🚀 Configuration Initiale

### 1. Environnement de Développement

```bash
cd /opt/team-dash-manager
# Fichier .env.development déjà configuré
# Base de données : Supabase de développement actuelle
```

### 2. Environnement de Production

**⚠️ IMPORTANT : Vous devez créer un nouveau projet Supabase pour la production**

1. Aller sur [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Créer un nouveau projet (ex: `team-dash-manager-prod`)
3. Récupérer l'URL et la clé ANON
4. Mettre à jour le fichier `/opt/team-dash-manager-prod/.env.production` :

```bash
cd /opt/team-dash-manager-prod
nano .env.production

# Remplacer les valeurs placeholders par vos vraies clés :
VITE_SUPABASE_URL=https://YOUR_PRODUCTION_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PRODUCTION_ANON_KEY
```

## 📝 Scripts de Déploiement

### 1. Script de Déploiement Complet

```bash
# Déployer les deux environnements
/opt/team-dash-manager/deploy.sh both

# Déployer uniquement dev
/opt/team-dash-manager/deploy.sh dev

# Déployer uniquement prod
/opt/team-dash-manager/deploy.sh prod
```

### 2. Push de Dev vers Prod

Pour pousser vos changements de développement vers la production :

```bash
/opt/team-dash-manager/push-to-prod.sh
```

Ce script va :
1. Commiter et pusher les changements dev
2. Synchroniser avec le dossier de production
3. Builder l'application
4. Redémarrer avec PM2

## 🔧 Gestion avec PM2

### Commandes Utiles

```bash
# Voir le statut des applications
pm2 status

# Logs en temps réel
pm2 logs

# Logs spécifiques
pm2 logs team-dash-dev
pm2 logs team-dash-prod

# Redémarrer une application
pm2 restart team-dash-dev
pm2 restart team-dash-prod

# Arrêter une application
pm2 stop team-dash-dev
pm2 stop team-dash-prod

# Monitoring en temps réel
pm2 monit
```

### Configuration PM2

Le fichier `ecosystem.config.js` contient la configuration pour les deux environnements :

- **team-dash-dev** : Mode développement avec hot-reload
- **team-dash-prod** : Mode production avec clustering (2 instances)

## 🌐 Accès aux Applications

### Sans configuration DNS

- **Développement** : http://SERVER_IP:8081
- **Production** : http://SERVER_IP:3000

### Avec configuration DNS (vaya.rip)

Si vous configurez les DNS pour pointer vers votre serveur :

- **Production** : http://vaya.rip:3000
- **Développement** : http://dev.vaya.rip:8081

**Note** : Le port 80 est occupé par Docker. Pour un accès sans port, vous devrez :
1. Soit arrêter Docker et utiliser Nginx
2. Soit configurer un reverse proxy avec Docker
3. Soit utiliser un autre port comme actuellement

## 🔄 Workflow de Développement

### 1. Développement Local

```bash
cd /opt/team-dash-manager
# Faire vos modifications
# L'application se recharge automatiquement (port 8081)
```

### 2. Test en Local

Accéder à http://localhost:8081 pour tester vos changements

### 3. Push vers Production

```bash
# Quand vous êtes satisfait, pusher vers prod
/opt/team-dash-manager/push-to-prod.sh
```

### 4. Vérification Production

Accéder à http://localhost:3000 (ou vaya.rip:3000)

## 🐛 Debugging

### Vérifier les Logs

```bash
# Logs PM2
pm2 logs team-dash-prod --lines 100

# Logs système
tail -f /opt/team-dash-manager-prod/logs/prod-error.log
tail -f /opt/team-dash-manager-prod/logs/prod-out.log
```

### Problèmes Courants

1. **Port déjà utilisé**
   ```bash
   # Vérifier qui utilise le port
   lsof -i :3000
   lsof -i :8081
   ```

2. **PM2 ne démarre pas**
   ```bash
   # Réinitialiser PM2
   pm2 kill
   pm2 start ecosystem.config.js
   ```

3. **Build échoue**
   ```bash
   # Nettoyer et reconstruire
   cd /opt/team-dash-manager-prod
   rm -rf node_modules dist
   npm install
   npm run build
   ```

## 🔐 Sécurité

### Points d'Attention

1. **Ne jamais commiter les fichiers .env**
2. **Utiliser des clés différentes pour dev et prod**
3. **Sauvegarder régulièrement la base de production**
4. **Activer les logs pour audit**

### Backup de la Base

Pour Supabase, activer les backups automatiques dans le dashboard de votre projet de production.

## 📊 Monitoring

### PM2 Monitoring

```bash
# Interface de monitoring
pm2 monit

# Métriques détaillées
pm2 info team-dash-prod
```

### Logs Centralisés

Les logs sont stockés dans :
- Dev : `/opt/team-dash-manager/logs/`
- Prod : `/opt/team-dash-manager-prod/logs/`

## 🆘 Support

En cas de problème :

1. Vérifier les logs PM2 : `pm2 logs`
2. Vérifier les logs système : `journalctl -xe`
3. Vérifier l'état des services : `pm2 status`
4. Consulter la documentation Supabase pour les erreurs d'API

---

**Note** : N'oubliez pas de créer votre projet Supabase de production et de mettre à jour les variables d'environnement avant le premier déploiement en production !