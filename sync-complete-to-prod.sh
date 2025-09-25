#!/bin/bash

# Script complet de synchronisation Dev -> Production
# Usage: ./sync-complete-to-prod.sh

echo "🚀 SYNCHRONISATION COMPLÈTE DEV -> PRODUCTION"
echo "=============================================="
echo ""

# Configuration
DEV_PROJECT_REF="egdelmcijszuapcpglsy"
PROD_PROJECT_REF="nlesrzepybeeghhgjafc"
SUPABASE_ACCESS_TOKEN="sbp_b8ec67e2a4f3a7922f6cfea023b2cf81a00a7d9e"
SUPABASE_DB_PASSWORD="Raymonde7510_2a"
DEV_PATH="/opt/team-dash-manager"
PROD_PATH="/opt/team-dash-manager-prod"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}📊 Configuration :${NC}"
echo "  - DEV  : $DEV_PROJECT_REF"
echo "  - PROD : $PROD_PROJECT_REF"
echo "  - URL PROD : www.vaya.rip"
echo ""

# ==========================================
# 1. SYNCHRONISATION DU CODE
# ==========================================
echo -e "${YELLOW}📦 1. Synchronisation du code...${NC}"

# Créer le dossier de production s'il n'existe pas
if [ ! -d "$PROD_PATH" ]; then
    echo "Création du dossier de production..."
    mkdir -p $PROD_PATH
fi

# Synchroniser les fichiers (sauf node_modules et .env)
rsync -av --delete \
    --exclude 'node_modules' \
    --exclude '.env*' \
    --exclude 'dist' \
    --exclude '.git' \
    --exclude 'supabase/.temp' \
    --exclude '*.log' \
    --exclude '_archive_*' \
    --exclude 'test-*.mjs' \
    --exclude 'debug-*.mjs' \
    --exclude 'database-structure-*.json' \
    --exclude 'database-structure-*.sql' \
    $DEV_PATH/ $PROD_PATH/

echo -e "${GREEN}✅ Code synchronisé${NC}"

# ==========================================
# 2. CONFIGURATION PRODUCTION
# ==========================================
echo ""
echo -e "${YELLOW}⚙️  2. Configuration production...${NC}"

# Créer le fichier .env.production
cat > $PROD_PATH/.env.production << EOF
VITE_SUPABASE_URL=https://nlesrzepybeeghhgjafc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sZXNyemVweWJlZWdoaGdqYWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU4ODE4NjQsImV4cCI6MjA0MTQ1Nzg2NH0.vj94_BR5W0mOCmdnfEq6T1VUPmPR4zpjWaQJ-VCkWZY
NODE_ENV=production
EOF

# Copier le fichier .env.production en .env aussi
cp $PROD_PATH/.env.production $PROD_PATH/.env

echo -e "${GREEN}✅ Configuration créée${NC}"

# ==========================================
# 3. INSTALLATION DÉPENDANCES
# ==========================================
echo ""
echo -e "${YELLOW}📦 3. Installation des dépendances...${NC}"

cd $PROD_PATH
npm install --production=false

echo -e "${GREEN}✅ Dépendances installées${NC}"

# ==========================================
# 4. BUILD PRODUCTION
# ==========================================
echo ""
echo -e "${YELLOW}🏗️  4. Build de production...${NC}"

npm run build

echo -e "${GREEN}✅ Build terminé${NC}"

# ==========================================
# 5. DÉPLOIEMENT EDGE FUNCTIONS
# ==========================================
echo ""
echo -e "${YELLOW}☁️  5. Déploiement des Edge Functions en production...${NC}"

# Liste des Edge Functions à déployer
FUNCTIONS=(
    "handle-new-user-simple"
    "ai-conversation-handler"
    "save-ai-content-to-drive"
    "process-project-embeddings"
    "extract-file-content"
    "process-file-upload"
    "apply-pgvector-system"
)

for func in "${FUNCTIONS[@]}"; do
    echo -e "  📤 Déploiement de $func..."
    SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN \
    SUPABASE_DB_PASSWORD=$SUPABASE_DB_PASSWORD \
    npx supabase functions deploy $func --project-ref $PROD_PROJECT_REF 2>/dev/null

    if [ $? -eq 0 ]; then
        echo -e "     ${GREEN}✓${NC} $func déployée"
    else
        echo -e "     ${YELLOW}⚠${NC} $func - vérifier manuellement"
    fi
done

# ==========================================
# 6. PM2 CONFIGURATION
# ==========================================
echo ""
echo -e "${YELLOW}🔄 6. Configuration PM2...${NC}"

# Créer ecosystem.config.cjs pour production
cat > $PROD_PATH/ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: 'team-dash-prod',
    script: 'npm',
    args: 'run preview',
    cwd: '/opt/team-dash-manager-prod',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    watch: false,
    instances: 1,
    autorestart: true,
    max_memory_restart: '1G'
  }]
}
EOF

# Démarrer ou redémarrer avec PM2
pm2 stop team-dash-prod 2>/dev/null
pm2 delete team-dash-prod 2>/dev/null
pm2 start $PROD_PATH/ecosystem.config.cjs --only team-dash-prod

echo -e "${GREEN}✅ PM2 configuré et démarré${NC}"

# ==========================================
# 7. NGINX CONFIGURATION
# ==========================================
echo ""
echo -e "${YELLOW}🌐 7. Configuration Nginx...${NC}"

# Créer la configuration Nginx si elle n'existe pas
if [ ! -f /etc/nginx/sites-available/vaya.rip ]; then
    sudo tee /etc/nginx/sites-available/vaya.rip > /dev/null << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name vaya.rip www.vaya.rip;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

    sudo ln -sf /etc/nginx/sites-available/vaya.rip /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx
    echo -e "${GREEN}✅ Nginx configuré${NC}"
else
    echo -e "${GREEN}✓ Nginx déjà configuré${NC}"
fi

# ==========================================
# 8. VÉRIFICATION FINALE
# ==========================================
echo ""
echo -e "${BLUE}🔍 8. Vérifications finales...${NC}"

# Vérifier que PM2 fonctionne
pm2_status=$(pm2 show team-dash-prod | grep status | awk '{print $4}')
if [[ "$pm2_status" == "online" ]]; then
    echo -e "  ${GREEN}✓${NC} Application en ligne"
else
    echo -e "  ${RED}✗${NC} Application hors ligne"
fi

# Vérifier l'accès HTTP
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ "$response" == "200" ] || [ "$response" == "304" ]; then
    echo -e "  ${GREEN}✓${NC} Serveur répond (HTTP $response)"
else
    echo -e "  ${RED}✗${NC} Serveur ne répond pas (HTTP $response)"
fi

# ==========================================
# RÉSUMÉ
# ==========================================
echo ""
echo "=============================================="
echo -e "${GREEN}✅ SYNCHRONISATION TERMINÉE !${NC}"
echo "=============================================="
echo ""
echo "📝 Résumé :"
echo "  ✓ Code synchronisé de $DEV_PATH"
echo "  ✓ Build de production créé"
echo "  ✓ Edge Functions déployées"
echo "  ✓ PM2 configuré et démarré"
echo "  ✓ Nginx configuré"
echo ""
echo "🌐 Accès :"
echo "  - URL : http://www.vaya.rip"
echo "  - Port : 3000"
echo "  - Base : Production (nlesrzepybeeghhgjafc)"
echo ""
echo "📊 Commandes utiles :"
echo "  - pm2 logs team-dash-prod    # Voir les logs"
echo "  - pm2 restart team-dash-prod # Redémarrer"
echo "  - pm2 status                 # Statut"
echo ""

# ==========================================
# ACTIONS MANUELLES RESTANTES
# ==========================================
echo -e "${YELLOW}⚠️  Actions manuelles requises :${NC}"
echo ""
echo "1. Dans le Dashboard Supabase PRODUCTION (nlesrzepybeeghhgjafc) :"
echo "   - Exécuter le script SQL : setup-pgvector-complete.sql"
echo "   - Configurer la clé OpenAI dans Settings > Edge Functions"
echo "   - Vérifier les webhooks et triggers"
echo ""
echo "2. Tester le site sur : http://www.vaya.rip"
echo ""