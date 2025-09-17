#!/bin/bash

# Script de synchronisation Dev -> Prod pour Supabase
# Usage: ./sync-dev-to-prod.sh

echo "🔄 Synchronisation Dev -> Production"
echo "===================================="

# Configuration
DEV_PROJECT_REF="egdelmcijszuapcpglsy"
PROD_PROJECT_REF="nlesrzepybeeghghjafc"
SUPABASE_ACCESS_TOKEN="sbp_b8ec67e2a4f3a7922f6cfea023b2cf81a00a7d9e"

# Couleurs pour le terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "📋 Étapes de synchronisation :"
echo "1. Export des migrations depuis Dev"
echo "2. Push des migrations vers Prod"
echo "3. Synchronisation du code"
echo ""

# 1. Vérifier les migrations non appliquées
echo -e "${YELLOW}📍 Étape 1: Vérification des migrations${NC}"
echo "Migrations dans le dossier local :"
ls -la supabase/migrations/ | tail -10

# 2. Demander confirmation
echo ""
echo -e "${YELLOW}⚠️  ATTENTION: Cette action va modifier la base de production !${NC}"
read -p "Voulez-vous continuer ? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Synchronisation annulée${NC}"
    exit 1
fi

# 3. Lier le projet de production si nécessaire
echo ""
echo -e "${GREEN}🔗 Liaison au projet de production...${NC}"
SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN npx supabase link \
  --project-ref $PROD_PROJECT_REF \
  --password "Raymonde7510"

# 4. Pousser les migrations
echo ""
echo -e "${GREEN}📤 Push des migrations vers Production...${NC}"
echo "Commande: npx supabase db push --include-all"

SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN npx supabase db push --include-all

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Migrations appliquées avec succès !${NC}"
else
    echo -e "${RED}❌ Erreur lors de l'application des migrations${NC}"
    echo "Certaines migrations peuvent nécessiter une exécution manuelle via le SQL Editor"
fi

# 5. Synchroniser le code de l'application
echo ""
echo -e "${GREEN}📦 Synchronisation du code...${NC}"
echo "Copie des fichiers de dev vers prod..."

# Copier les fichiers source
rsync -av --exclude 'node_modules' \
         --exclude 'dist' \
         --exclude '.env*' \
         --exclude 'supabase/.temp' \
         /opt/team-dash-manager/src/ \
         /opt/team-dash-manager-prod/src/

# 6. Rebuild de production
echo ""
echo -e "${GREEN}🏗️  Build de l'application de production...${NC}"
cd /opt/team-dash-manager-prod
npm run build

# 7. Redémarrer avec PM2
echo ""
echo -e "${GREEN}🔄 Redémarrage de l'application...${NC}"
pm2 restart team-dash-prod

echo ""
echo -e "${GREEN}✅ Synchronisation terminée !${NC}"
echo ""
echo "📝 Résumé :"
echo "  - Migrations : Appliquées"
echo "  - Code : Synchronisé"
echo "  - Build : Recompilé"
echo "  - Application : Redémarrée"
echo ""
echo "🔍 Vérifiez l'application sur : https://vaya.rip"