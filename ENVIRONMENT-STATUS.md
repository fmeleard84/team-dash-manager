# 📊 État des Environnements - Team Dash Manager
Date: 17/09/2025 - 11h45

## 🟢 État Global : OPÉRATIONNEL

### 🔧 Environnement de Développement
- **Status**: ✅ En ligne
- **URL**: http://localhost:8081
- **Base Supabase**: `egdelmcijszuapcpglsy`
- **Process PM2**: team-dash-dev (PID: 1617211)
- **Port**: 8081
- **GitHub**: main branch - synchronized

### 🌐 Environnement de Production
- **Status**: ✅ En ligne
- **URL**: https://vaya.rip (port 3000)
- **Base Supabase**: `nlesrzepybeeghghjafc`
- **Process PM2**: team-dash-prod (2 instances cluster)
- **Port**: 3000
- **Nginx**: Proxy configuré et actif
- **GitHub**: main branch - synchronized

## 📁 Structure des Fichiers

### Répertoires
```
/opt/team-dash-manager/          # DEV
/opt/team-dash-manager-prod/     # PROD
```

### Configuration
```
.env.local.example    # Template pour les variables d'environnement
.gitignore           # Mis à jour pour exclure fichiers sensibles
ecosystem.config.cjs # Configuration PM2
vite.config.ts       # Port 3000 configuré pour preview
```

## 🔐 Sécurité

### Fichiers Sensibles Protégés
- ✅ Toutes les clés API retirées du code
- ✅ .gitignore mis à jour
- ✅ Scripts sécurisés créés (sans clés en dur)
- ✅ Variables d'environnement isolées

### Fichiers à NE PAS Commiter
- .env.local
- .env.development
- .env.production
- audit-report-*.json
- Tout fichier contenant SERVICE_KEY

## 🗄️ Base de Données

### Cohérence DEV/PROD
- ✅ 27 tables vérifiées et présentes
- ✅ Politiques RLS actives et alignées
- ⚠️ 2 colonnes à ajouter en PROD (migration SQL appliquée)
  - `hr_resource_assignments.calculated_price`
  - `hr_profiles.skills`

### Edge Functions Déployées (PROD)
1. handle-new-user-simple
2. apply-hr-migration-prod
3. fix-hr-profiles-prod
4. fix-production-hr-tables
5. check-and-fix-columns
6. apply-column-migration

## 🛠️ Scripts de Maintenance

### Audit et Vérification
```bash
node audit-dev-prod-safe.mjs     # Audit de cohérence (sécurisé)
node test-candidate-access-prod.mjs  # Test accès candidat
node run-column-check-prod.mjs   # Vérification colonnes
```

### Déploiement
```bash
./push-to-prod.sh               # Sync DEV → PROD
pm2 restart team-dash-dev       # Redémarrer DEV
pm2 restart team-dash-prod      # Redémarrer PROD
```

## 📝 Actions Récentes (17/09/2025)

### Corrections Appliquées
1. ✅ Résolution erreur 400 sur hr_resource_assignments
2. ✅ Correction 502 Bad Gateway (configuration port Vite)
3. ✅ Alignement des schémas DEV/PROD
4. ✅ Sécurisation du code (suppression clés API)
5. ✅ Sauvegarde GitHub complète

### Modifications Code
- `vite.config.ts`: Ajout configuration preview port 3000
- `CandidateMissionRequests.tsx`: Retrait calculated_price
- `.gitignore`: Ajout fichiers sensibles
- `CLAUDE.md`: Documentation mise à jour

## 🚀 Prochaines Étapes Recommandées

1. **Court terme**
   - [ ] Vérifier le webhook handle-new-user-simple en PROD
   - [ ] Tester l'onboarding complet d'un nouveau candidat
   - [ ] Valider les performances avec 2 instances cluster

2. **Moyen terme**
   - [ ] Mettre en place un pipeline CI/CD
   - [ ] Créer un environnement de staging
   - [ ] Automatiser les migrations SQL

3. **Long terme**
   - [ ] Monitoring et alerting
   - [ ] Backups automatiques
   - [ ] Tests automatisés

## 📞 Informations de Contact

### Accès Serveur
- Host: 95.216.204.226
- Utilisateur: root
- Méthode: SSH

### GitHub
- Repository: https://github.com/fmeleard84/team-dash-manager
- Branch: main (unique pour DEV et PROD)

### PM2 Dashboard
```bash
pm2 monit  # Monitoring temps réel
pm2 logs   # Logs consolidés
```

## ✅ Checklist de Santé

- [x] Serveurs DEV et PROD en ligne
- [x] Bases de données accessibles
- [x] Nginx configuré correctement
- [x] PM2 avec auto-restart configuré
- [x] GitHub synchronisé
- [x] Fichiers sensibles protégés
- [x] Documentation à jour

---
*Dernière mise à jour: 17/09/2025 11:45*
*Par: Assistant Claude*