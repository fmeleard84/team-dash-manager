#!/bin/bash

# Script de déploiement pour Team Dash Manager
# Usage: ./deploy.sh [dev|prod|both]

set -e

ENV=${1:-both}
CURRENT_DIR=$(pwd)

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Team Dash Manager - Script de Déploiement${NC}"
echo "========================================"

# Fonction pour déployer dev
deploy_dev() {
    echo -e "${YELLOW}📦 Déploiement de l'environnement de développement...${NC}"

    cd /opt/team-dash-manager

    # Arrêter l'ancien processus si existant
    pm2 stop team-dash-dev 2>/dev/null || true

    # Pull des dernières modifications
    echo "Récupération des dernières modifications..."
    git pull origin main

    # Installation des dépendances
    echo "Installation des dépendances..."
    npm install

    # Démarrer avec PM2
    echo "Démarrage de l'application dev..."
    pm2 start ecosystem.config.cjs --only team-dash-dev

    echo -e "${GREEN}✅ Environnement de développement déployé sur port 8081${NC}"
}

# Fonction pour déployer prod
deploy_prod() {
    echo -e "${YELLOW}📦 Déploiement de l'environnement de production...${NC}"

    cd /opt/team-dash-manager-prod

    # Arrêter l'ancien processus si existant
    pm2 stop team-dash-prod 2>/dev/null || true

    # Pull des dernières modifications
    echo "Récupération des dernières modifications..."
    git pull origin main

    # Installation des dépendances
    echo "Installation des dépendances..."
    npm install

    # Build de production
    echo "Build de l'application..."
    npm run build

    # Démarrer avec PM2
    echo "Démarrage de l'application prod..."
    pm2 start /opt/team-dash-manager/ecosystem.config.cjs --only team-dash-prod

    echo -e "${GREEN}✅ Environnement de production déployé sur port 3000${NC}"
}

# Fonction pour sauvegarder la configuration PM2
save_pm2() {
    echo "Sauvegarde de la configuration PM2..."
    pm2 save
    pm2 startup systemd -u root --hp /root
}

# Vérifier PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}PM2 n'est pas installé. Installation...${NC}"
    npm install -g pm2
fi

# Déployer selon l'environnement demandé
case $ENV in
    dev)
        deploy_dev
        ;;
    prod)
        deploy_prod
        ;;
    both)
        deploy_dev
        deploy_prod
        ;;
    *)
        echo -e "${RED}Usage: $0 [dev|prod|both]${NC}"
        exit 1
        ;;
esac

# Sauvegarder la configuration PM2
save_pm2

# Afficher le statut
echo ""
echo -e "${GREEN}📊 Statut des applications:${NC}"
pm2 status

echo ""
echo -e "${GREEN}🎯 URLs d'accès:${NC}"
echo "  • Développement: http://localhost:8081 (ou dev.vaya.rip si DNS configuré)"
echo "  • Production: http://localhost:3000 (ou vaya.rip si DNS configuré)"
echo ""
echo -e "${YELLOW}💡 Commandes utiles:${NC}"
echo "  • pm2 status        - Voir le statut des apps"
echo "  • pm2 logs          - Voir tous les logs"
echo "  • pm2 logs team-dash-dev  - Logs dev uniquement"
echo "  • pm2 logs team-dash-prod - Logs prod uniquement"
echo "  • pm2 restart all   - Redémarrer toutes les apps"
echo "  • pm2 monit         - Monitoring en temps réel"

cd $CURRENT_DIR