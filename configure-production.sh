#!/bin/bash

# Script simple pour configurer la production avec Supabase
# Password: Raymonde7510

set -e

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Configuration Supabase Production${NC}"
echo "====================================="
echo ""
echo -e "${YELLOW}📋 Instructions:${NC}"
echo "1. Ouvrez: https://supabase.com/dashboard"
echo "2. Sélectionnez votre projet: team-dash-manager-prod"
echo "3. Allez dans Settings > API"
echo "4. Copiez les valeurs demandées ci-dessous"
echo ""

# Demander les clés
echo -e "${BLUE}Project URL (ex: https://abcdefghij.supabase.co):${NC}"
read -r PROJECT_URL

echo -e "${BLUE}Anon/Public Key (commence par eyJ...):${NC}"
read -r ANON_KEY

echo -e "${BLUE}Project Ref (visible dans l'URL, ex: abcdefghij):${NC}"
read -r PROJECT_REF

# Mettre à jour .env.production
echo ""
echo -e "${YELLOW}📝 Mise à jour de .env.production...${NC}"

cat > /opt/team-dash-manager-prod/.env.production << EOF
# PRODUCTION - Port 3000
VITE_PORT=3000
VITE_ENV=production

# Configuration Supabase Production
VITE_SUPABASE_URL=$PROJECT_URL
VITE_SUPABASE_ANON_KEY=$ANON_KEY

# Project Ref pour les déploiements
# PROJECT_REF=$PROJECT_REF
EOF

echo -e "${GREEN}✅ Configuration mise à jour${NC}"

# Déployer les Edge Functions essentielles
echo ""
echo -e "${YELLOW}📦 Déploiement des Edge Functions...${NC}"

cd /opt/team-dash-manager

# Functions critiques
FUNCTIONS=(
    "handle-new-user-simple"
    "project-orchestrator"
    "resource-booking"
)

for func in "${FUNCTIONS[@]}"; do
    if [ -d "supabase/functions/$func" ]; then
        echo -e "${BLUE}Déploiement: $func${NC}"
        SUPABASE_ACCESS_TOKEN="sbp_b8ec67e2a4f3a7922f6cfea023b2cf81a00a7d9e" \
        SUPABASE_DB_PASSWORD="Raymonde7510" \
        npx supabase functions deploy $func --project-ref $PROJECT_REF 2>/dev/null || true
    fi
done

echo ""
echo -e "${GREEN}✅ Configuration terminée!${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT - Configuration du Webhook:${NC}"
echo ""
echo "1. Allez sur: https://supabase.com/dashboard/project/$PROJECT_REF/database/webhooks"
echo "2. Créez un nouveau webhook avec:"
echo "   • Name: handle_new_user_simple"
echo "   • Table: auth.users"
echo "   • Events: INSERT"
echo "   • Type: Supabase Edge Functions"
echo "   • Function: handle-new-user-simple"
echo ""
echo -e "${BLUE}📋 Prochaine étape:${NC}"
echo "Copier le schéma de dev vers prod (via Dashboard Supabase)"
echo "Puis lancer: ${GREEN}/opt/team-dash-manager/deploy.sh prod${NC}"