# Guide de Configuration - Team Dash Manager

## 🚀 Installation Rapide

### 1. Cloner le repository
```bash
git clone https://github.com/fmeleard84/team-dash-manager.git
cd team-dash-manager
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configuration Environnement

#### Créer le fichier .env
```bash
cp .env.local .env
```

Ou créer manuellement un fichier `.env` à la racine avec :
```env
VITE_SUPABASE_URL=https://egdelmcijszuapcpglsy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U
```

### 4. Démarrer le serveur de développement
```bash
npm run dev
```

Le site sera accessible sur : https://localhost:8081

## 🔧 Résolution de Problèmes

### Erreur : ENOENT: no such file or directory, open '/.env'
**Solution** : Créer le fichier `.env` à la racine du projet (voir étape 3)

### Port 8081 déjà utilisé
**Solution** :
```bash
pkill -f vite
npm run dev
```

### Certificats HTTPS manquants
Les certificats sont dans `/certs`. Si manquants, générer avec :
```bash
mkdir certs
openssl req -x509 -newkey rsa:4096 -nodes -keyout certs/key.pem -out certs/cert.pem -days 365 -subj '/CN=localhost'
```

## 📁 Structure des Fichiers d'Environnement

- `.env` : Configuration principale (créé à partir de .env.local)
- `.env.local` : Template de configuration locale
- `.env.local.example` : Exemple avec toutes les variables possibles
- `.env.production` : Configuration production (ne pas commiter)

## 🚨 Important

- Ne jamais commiter le fichier `.env` (il est dans .gitignore)
- Les clés Supabase de développement sont publiques, utiliser des clés différentes en production
- Pour la production, configurer les variables d'environnement directement sur le serveur

## 📚 Documentation Complète

Voir `/llm` dans l'application pour la documentation technique complète.