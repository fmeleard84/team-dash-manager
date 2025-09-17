# 🔧 Correction Email Production - 17/09/2025

## 🔴 Problèmes Identifiés

### 1. **Application utilisait la base de DEV en production**
- **Fichier** : `/src/integrations/supabase/client.ts`
- **Problème** : URLs hardcodées pointant vers `egdelmcijszuapcpglsy` (DEV)
- **Impact** : Les emails étaient envoyés depuis la base DEV, pas PROD

### 2. **URLs de redirection incorrectes**
- **Fichier** : `/src/pages/Register.tsx`
- **Problème** : Redirection vers `http://95.216.204.226:8081` (port DEV)
- **Impact** : Liens dans les emails pointaient vers le mauvais environnement

## ✅ Corrections Appliquées

### 1. **Configuration Supabase Client**
```typescript
// AVANT (hardcodé)
const SUPABASE_URL = "https://egdelmcijszuapcpglsy.supabase.co";

// APRÈS (variables d'environnement)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://egdelmcijszuapcpglsy.supabase.co";
```

### 2. **URLs de Redirection**
```typescript
// Fonction getAppUrl() améliorée
// Détecte automatiquement l'environnement :
// - Production : https://vaya.rip
// - Développement : http://localhost:8081
```

## 📋 Configuration Requise

### Dashboard Supabase Production

1. **Authentication → URL Configuration**
   - Site URL : `https://vaya.rip`
   - Redirect URLs :
     - `https://vaya.rip`
     - `https://vaya.rip/auth/callback`

2. **Authentication → Email Templates**
   - Vérifier que les templates utilisent `{{ .SiteURL }}` (pas d'URL hardcodée)

3. **Authentication → SMTP Settings**
   ✅ Déjà configuré avec Brevo :
   - Host : smtp-relay.brevo.com
   - Port : 587
   - Username : fmeleard@gmail.com
   - From : hello@vaya.rip

## 🔍 Comment Vérifier

### Test d'inscription :
1. Allez sur https://vaya.rip
2. Inscrivez-vous comme candidat
3. Vérifiez l'email reçu :
   - **Expéditeur** : `hello@vaya.rip` (La Team Vaya)
   - **Lien** : Doit pointer vers `https://vaya.rip/auth/confirm?...`
   - **Provider** : Brevo (vérifier les headers de l'email)

### Vérification Headers Email
Dans Gmail/Outlook, voir "Afficher l'original" :
- Rechercher : `X-Mailin-Tag` ou `X-SIB-ID` (indique Brevo)
- Si vous voyez `X-Postmark` ou références à Supabase = problème

## 📁 Fichiers Modifiés

1. `/opt/team-dash-manager-prod/src/integrations/supabase/client.ts`
   - Utilisation des variables d'environnement

2. `/opt/team-dash-manager-prod/src/pages/Register.tsx`
   - Fonction `getAppUrl()` améliorée
   - Détection automatique de l'environnement

3. `/opt/team-dash-manager-prod/.env.production`
   - Contient les bonnes clés de production

## ⚠️ Points d'Attention

1. **NE PAS** modifier `.env.production` (déjà correct)
2. **NE PAS** commiter les clés API sur GitHub
3. **TOUJOURS** utiliser les variables d'environnement

## 🚀 Commandes Utiles

```bash
# Rebuilder après modifications
npm run build

# Redémarrer production
pm2 restart team-dash-prod

# Vérifier les logs
pm2 logs team-dash-prod --lines 100

# Vérifier quelle base est utilisée (dans la console du navigateur)
# Ouvrir https://vaya.rip, F12, Console :
# Taper : localStorage.getItem('supabase.auth.token')
# Le token décodé montre le "ref" de la base utilisée
```

## ✅ Résultat Attendu

Après ces corrections :
1. ✅ L'application utilise la base PROD (`nlesrzepybeeghghjafc`)
2. ✅ Les emails sont envoyés via Brevo (SMTP configuré)
3. ✅ Les liens pointent vers `https://vaya.rip`
4. ✅ L'expéditeur est `hello@vaya.rip`

---
*Corrections appliquées le 17/09/2025 par Claude*