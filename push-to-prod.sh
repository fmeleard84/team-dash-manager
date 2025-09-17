#!/bin/bash

# Script pour pousser les changements de dev vers prod
# Usage: ./push-to-prod.sh

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Push vers Production - Team Dash Manager${NC}"
echo "============================================"
echo ""

# 1. Commit et push des changements dev
echo -e "${YELLOW}📝 Étape 1: Sauvegarde des changements en dev${NC}"
cd /opt/team-dash-manager

# Vérifier s'il y a des changements
if [[ -n $(git status -s) ]]; then
    echo "Changements détectés. Commit automatique..."
    git add .
    echo -e "${YELLOW}Message de commit (appuyer sur Enter pour message par défaut):${NC}"
    read -r commit_msg

    if [ -z "$commit_msg" ]; then
        commit_msg="🚀 Deploy: Mise à jour automatique depuis dev"
    fi

    git commit -m "$commit_msg"
    git push origin main
    echo -e "${GREEN}✅ Changements sauvegardés et poussés${NC}"
else
    echo "Aucun changement à commit"
fi

# 2. Synchroniser avec production
echo ""
echo -e "${YELLOW}📥 Étape 2: Synchronisation avec la production${NC}"
cd /opt/team-dash-manager-prod

# Pull des derniers changements
git pull origin main

# 3. Installation des dépendances si package.json a changé
if git diff HEAD~1 HEAD --name-only | grep -q "package.json"; then
    echo -e "${YELLOW}📦 Installation des nouvelles dépendances...${NC}"
    npm install
fi

# 4. Build de production
echo ""
echo -e "${YELLOW}🔨 Étape 3: Build de production${NC}"
npm run build

# 5. Redémarrer l'application de production
echo ""
echo -e "${YELLOW}♻️ Étape 4: Redémarrage de l'application de production${NC}"

# Vérifier si PM2 gère déjà l'app
if pm2 list | grep -q "team-dash-prod"; then
    pm2 restart team-dash-prod
    echo -e "${GREEN}✅ Application de production redémarrée${NC}"
else
    pm2 start /opt/team-dash-manager/ecosystem.config.cjs --only team-dash-prod
    echo -e "${GREEN}✅ Application de production démarrée${NC}"
fi

# 6. Sauvegarder la configuration PM2
pm2 save

# 7. Afficher le statut final
echo ""
echo -e "${GREEN}📊 Statut des applications:${NC}"
pm2 status

echo ""
echo -e "${GREEN}🎉 Déploiement terminé avec succès!${NC}"
echo ""
echo -e "${BLUE}📍 URLs d'accès:${NC}"
echo "  • Production: http://vaya.rip:3000"
echo "  • Développement: http://localhost:8081"
echo ""
echo -e "${YELLOW}💡 Vérification des logs:${NC}"
echo "  • pm2 logs team-dash-prod --lines 50"
echo ""

# Optionnel: Afficher les derniers logs de production
echo -e "${YELLOW}📜 Derniers logs de production:${NC}"
pm2 logs team-dash-prod --nostream --lines 10