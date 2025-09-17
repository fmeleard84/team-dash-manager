#!/bin/bash

# Configuration rapide pour la production
# Ce script suppose que vous avez déjà les clés

set -e

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Configuration Rapide Production${NC}"
echo "===================================="
echo ""

# Demander juste le project ref pour commencer
echo -e "${YELLOW}Pour récupérer vos clés:${NC}"
echo "1. Allez sur: https://supabase.com/dashboard"
echo "2. Sélectionnez: team-dash-manager-prod"
echo "3. Dans l'URL vous verrez quelque chose comme:"
echo "   https://supabase.com/dashboard/project/[PROJECT_REF]/..."
echo ""
echo -e "${BLUE}Entrez le PROJECT_REF de votre projet:${NC}"
echo "(C'est la partie après /project/ dans l'URL)"
read -r PROJECT_REF

if [ -z "$PROJECT_REF" ]; then
    echo -e "${RED}❌ Project Ref requis${NC}"
    exit 1
fi

# Construire l'URL probable
PROJECT_URL="https://${PROJECT_REF}.supabase.co"

echo ""
echo -e "${YELLOW}📋 Maintenant, dans Settings > API, copiez:${NC}"
echo ""
echo -e "${BLUE}La clé 'anon public' (commence par eyJ...):${NC}"
read -r ANON_KEY

if [ -z "$ANON_KEY" ]; then
    echo -e "${RED}❌ Anon Key requise${NC}"
    exit 1
fi

# Mettre à jour .env.production
echo ""
echo -e "${YELLOW}📝 Configuration de l'environnement de production...${NC}"

cat > /opt/team-dash-manager-prod/.env.production << EOF
# PRODUCTION - Port 3000
VITE_PORT=3000
VITE_ENV=production

# Configuration Supabase Production
VITE_SUPABASE_URL=$PROJECT_URL
VITE_SUPABASE_ANON_KEY=$ANON_KEY

# Metadata
# Project: team-dash-manager-prod
# Project Ref: $PROJECT_REF
# Configured: $(date)
EOF

echo -e "${GREEN}✅ Fichier .env.production créé${NC}"

# Test rapide de connexion
echo ""
echo -e "${YELLOW}🔍 Test de connexion...${NC}"

cd /opt/team-dash-manager-prod

# Créer un test simple
cat > test-connection.mjs << 'EOF'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { config } from 'dotenv'

config({ path: '.env.production' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

console.log('Testing connection to:', process.env.VITE_SUPABASE_URL)

try {
  const { data, error } = await supabase.auth.getSession()
  if (error && error.message !== 'Auth session missing!') {
    console.error('❌ Erreur:', error.message)
    process.exit(1)
  }
  console.log('✅ Connexion réussie!')
} catch (err) {
  console.error('❌ Erreur de connexion:', err.message)
  process.exit(1)
}
EOF

# Installer dotenv si nécessaire
npm list dotenv >/dev/null 2>&1 || npm install dotenv --save-dev

# Tester
node test-connection.mjs 2>/dev/null && rm test-connection.mjs || {
    echo -e "${RED}⚠️  Vérifiez vos clés${NC}"
    rm test-connection.mjs
}

# Déployer les Edge Functions critiques
echo ""
echo -e "${YELLOW}📦 Déploiement des Edge Functions essentielles...${NC}"

cd /opt/team-dash-manager

# Liste des fonctions critiques pour la production
CRITICAL_FUNCTIONS=(
    "handle-new-user-simple"     # Création auto des profils
    "project-orchestrator"        # Gestion des projets
    "resource-booking"           # Booking des ressources
)

for func in "${CRITICAL_FUNCTIONS[@]}"; do
    if [ -d "supabase/functions/$func" ]; then
        echo -e "${BLUE}• Déploiement de $func...${NC}"
        SUPABASE_ACCESS_TOKEN="sbp_b8ec67e2a4f3a7922f6cfea023b2cf81a00a7d9e" \
        SUPABASE_DB_PASSWORD="Raymonde7510" \
        npx supabase functions deploy "$func" --project-ref "$PROJECT_REF" >/dev/null 2>&1 && \
            echo -e "${GREEN}  ✓ $func déployée${NC}" || \
            echo -e "${YELLOW}  ⚠️  $func peut nécessiter une configuration${NC}"
    fi
done

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Configuration de base terminée!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${RED}⚠️  ACTIONS REQUISES:${NC}"
echo ""
echo -e "${YELLOW}1. CRÉER LE WEBHOOK (obligatoire):${NC}"
echo "   • Aller sur: https://supabase.com/dashboard/project/$PROJECT_REF/database/webhooks"
echo "   • Créer un webhook:"
echo "     - Name: handle_new_user_simple"
echo "     - Table: auth.users"
echo "     - Events: INSERT"
echo "     - Type: Supabase Edge Functions"
echo "     - Edge Function: handle-new-user-simple"
echo ""
echo -e "${YELLOW}2. MIGRER LE SCHÉMA DE BASE:${NC}"
echo "   • Exporter depuis DEV: Table Editor > Export to SQL"
echo "   • Importer dans PROD: SQL Editor > Run"
echo ""
echo -e "${YELLOW}3. DÉPLOYER L'APPLICATION:${NC}"
echo "   ${GREEN}/opt/team-dash-manager/deploy.sh prod${NC}"
echo ""
echo -e "${BLUE}📍 URLs:${NC}"
echo "   • Production: http://vaya.rip:3000 (ou http://$(hostname -I | awk '{print $1}'):3000)"
echo "   • Supabase: https://supabase.com/dashboard/project/$PROJECT_REF"
echo ""
echo -e "${YELLOW}📊 Commandes utiles:${NC}"
echo "   • pm2 status                    # Voir le statut"
echo "   • pm2 logs team-dash-prod       # Voir les logs"
echo "   • pm2 restart team-dash-prod    # Redémarrer"
echo ""