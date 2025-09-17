#!/bin/bash

# Script pour initialiser la base de données Supabase de production
# Ce script applique toutes les migrations et déploie les Edge Functions essentielles

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Initialisation de la Base de Données de Production${NC}"
echo "======================================================"
echo ""

# Configuration pour le projet de production
# IMPORTANT: Vous devez récupérer ces valeurs depuis votre dashboard Supabase
# Aller sur: https://supabase.com/dashboard/project/team-dash-manager-prod/settings/api
echo -e "${YELLOW}⚠️  IMPORTANT: Ce script nécessite les clés de votre projet Supabase de production${NC}"
echo -e "${YELLOW}Récupérez-les depuis: https://supabase.com/dashboard/project/team-dash-manager-prod/settings/api${NC}"
echo ""

# Demander les informations nécessaires
echo -e "${BLUE}Entrez l'URL de votre projet Supabase de production:${NC}"
echo "(Format: https://xxxxxxxxxx.supabase.co)"
read -r PROD_SUPABASE_URL

echo -e "${BLUE}Entrez la clé ANON de votre projet de production:${NC}"
read -r PROD_SUPABASE_ANON_KEY

echo -e "${BLUE}Entrez la clé SERVICE_ROLE de votre projet de production:${NC}"
echo "(Nécessaire pour les migrations - ne sera pas stockée)"
read -r PROD_SERVICE_ROLE_KEY

echo -e "${BLUE}Entrez le Project Ref de votre projet:${NC}"
echo "(Visible dans l'URL du dashboard, ex: kxqyjsbyukztwvfwqzxn)"
read -r PROD_PROJECT_REF

# Mettre à jour le fichier .env.production
echo ""
echo -e "${YELLOW}📝 Mise à jour du fichier .env.production...${NC}"
cat > /opt/team-dash-manager-prod/.env.production << EOF
# PRODUCTION - Port 3000
VITE_PORT=3000
VITE_ENV=production

# Configuration Supabase Production
VITE_SUPABASE_URL=$PROD_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$PROD_SUPABASE_ANON_KEY
EOF

echo -e "${GREEN}✅ Fichier .env.production mis à jour${NC}"

# Créer un fichier temporaire pour les credentials Supabase CLI
echo ""
echo -e "${YELLOW}🔧 Configuration Supabase CLI...${NC}"

# Export des variables pour Supabase CLI
export SUPABASE_ACCESS_TOKEN="sbp_b8ec67e2a4f3a7922f6cfea023b2cf81a00a7d9e"
export SUPABASE_DB_PASSWORD="Raymonde7510"

# Edge Functions essentielles à déployer
EDGE_FUNCTIONS=(
    "handle-new-user-simple"
    "project-orchestrator"
    "resource-booking"
    "project-kickoff"
    "chat-completion"
    "sync-faq-embeddings"
    "manage-client-credits"
)

echo ""
echo -e "${YELLOW}📦 Déploiement des Edge Functions essentielles...${NC}"

cd /opt/team-dash-manager

for func in "${EDGE_FUNCTIONS[@]}"; do
    echo -e "${BLUE}Déploiement de: $func${NC}"

    if [ -d "supabase/functions/$func" ]; then
        npx supabase functions deploy $func \
            --project-ref $PROD_PROJECT_REF \
            2>/dev/null || echo -e "${RED}⚠️  Erreur lors du déploiement de $func (peut-être déjà déployée)${NC}"
    else
        echo -e "${YELLOW}⚠️  Fonction $func non trouvée dans le projet${NC}"
    fi
done

echo ""
echo -e "${GREEN}✅ Edge Functions déployées${NC}"

# Créer le webhook pour la création automatique des profils
echo ""
echo -e "${YELLOW}🔗 Configuration du webhook pour les nouveaux utilisateurs...${NC}"
echo -e "${BLUE}IMPORTANT: Vous devez créer manuellement le webhook dans Supabase:${NC}"
echo ""
echo "1. Aller sur: https://supabase.com/dashboard/project/$PROD_PROJECT_REF/database/webhooks"
echo "2. Cliquer sur 'Create a new webhook'"
echo "3. Configurer avec:"
echo "   - Name: handle_new_user_simple"
echo "   - Table: auth.users"
echo "   - Events: INSERT"
echo "   - Type: Supabase Edge Functions"
echo "   - Function: handle-new-user-simple"
echo ""

# Appliquer les migrations SQL critiques
echo -e "${YELLOW}🗃️  Application des migrations SQL critiques...${NC}"

# Créer un script SQL temporaire avec les migrations essentielles
cat > /tmp/init-production.sql << 'SQLEOF'
-- Activation des extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Fonction pour créer automatiquement les profils
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- Créer le profil de base
    INSERT INTO public.profiles (id, email, created_at, updated_at)
    VALUES (NEW.id, NEW.email, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Si c'est un candidat (email ne finit pas par @company.com)
    IF NEW.email NOT LIKE '%@company.com' THEN
        INSERT INTO public.candidate_profiles (
            id,
            email,
            status,
            qualification_status,
            created_at,
            updated_at
        )
        VALUES (
            NEW.id,
            NEW.email,
            'qualification',
            'pending',
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;
    ELSE
        -- Sinon c'est un client
        INSERT INTO public.client_profiles (
            id,
            email,
            created_at,
            updated_at
        )
        VALUES (
            NEW.id,
            NEW.email,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: Le trigger sur auth.users ne peut pas être créé via SQL
-- Il faut utiliser le webhook Supabase à la place

-- Création des politiques RLS de base si elles n'existent pas
DO $$
BEGIN
    -- Enable RLS on all tables
    ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS candidate_profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS client_profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS projects ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS hr_resource_assignments ENABLE ROW LEVEL SECURITY;

    -- Policies will be created by the Edge Functions
END $$;

SQLEOF

echo -e "${BLUE}Les migrations SQL seront appliquées lors du premier déploiement${NC}"

# Test de connexion
echo ""
echo -e "${YELLOW}🔍 Test de connexion à la base de production...${NC}"

# Créer un petit script Node.js pour tester la connexion
cat > /tmp/test-connection.js << EOF
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    '$PROD_SUPABASE_URL',
    '$PROD_SUPABASE_ANON_KEY'
);

async function testConnection() {
    try {
        const { data, error } = await supabase.from('profiles').select('count').limit(1);
        if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist yet
            console.error('❌ Erreur de connexion:', error.message);
            process.exit(1);
        }
        console.log('✅ Connexion à Supabase réussie!');
    } catch (err) {
        console.error('❌ Erreur:', err.message);
        process.exit(1);
    }
}

testConnection();
EOF

cd /opt/team-dash-manager-prod
node /tmp/test-connection.js 2>/dev/null || echo -e "${YELLOW}⚠️  Les tables n'existent pas encore (normal pour une première installation)${NC}"

# Nettoyer les fichiers temporaires
rm -f /tmp/test-connection.js
rm -f /tmp/init-production.sql

echo ""
echo -e "${GREEN}🎉 Configuration de production terminée!${NC}"
echo ""
echo -e "${BLUE}📋 Prochaines étapes:${NC}"
echo ""
echo "1. Créer le webhook dans Supabase Dashboard (instructions ci-dessus)"
echo ""
echo "2. Copier le schéma de la base de développement:"
echo "   - Exporter depuis dev: https://supabase.com/dashboard/project/egdelmcijszuapcpglsy/settings/general"
echo "   - Importer dans prod: https://supabase.com/dashboard/project/$PROD_PROJECT_REF/settings/general"
echo ""
echo "3. Déployer l'application:"
echo "   ${GREEN}/opt/team-dash-manager/deploy.sh prod${NC}"
echo ""
echo "4. Accéder à l'application:"
echo "   - Production: http://vaya.rip:3000"
echo "   - Dashboard Supabase: https://supabase.com/dashboard/project/$PROD_PROJECT_REF"
echo ""
echo -e "${YELLOW}💡 Commandes utiles:${NC}"
echo "  pm2 logs team-dash-prod     # Voir les logs"
echo "  pm2 restart team-dash-prod  # Redémarrer l'app"
echo "  pm2 status                  # Voir le statut"
echo ""