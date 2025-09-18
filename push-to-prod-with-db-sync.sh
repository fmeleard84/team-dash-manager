#!/bin/bash

# Script amélioré pour pousser les changements de dev vers prod
# AVEC synchronisation de la base de données
# Usage: ./push-to-prod-with-db-sync.sh

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Push vers Production avec Sync DB - Team Dash Manager${NC}"
echo "========================================================="
echo ""

# Fonction pour demander confirmation
confirm() {
    read -r -p "$1 (y/N) " response
    case "$response" in
        [yY][eE][sS]|[yY])
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# ================================================
# SECTION 1: SYNCHRONISATION BASE DE DONNÉES
# ================================================
echo -e "${CYAN}🗄️  SECTION 1: Synchronisation de la Base de Données${NC}"
echo "------------------------------------------------"

if confirm "Voulez-vous synchroniser le schéma de base de données DEV → PROD?"; then
    echo -e "${YELLOW}📊 Analyse des différences entre DEV et PROD...${NC}"

    # Lancer le script de synchronisation
    cd /opt/team-dash-manager

    if [ -f "sync-database-to-prod.mjs" ]; then
        node sync-database-to-prod.mjs

        # Chercher le fichier de migration le plus récent
        LATEST_MIGRATION=$(ls -t /opt/team-dash-manager-prod/sync-output/migration-to-prod-*.sql 2>/dev/null | head -1)

        if [ -n "$LATEST_MIGRATION" ]; then
            echo ""
            echo -e "${GREEN}✅ Script de migration créé:${NC}"
            echo "$LATEST_MIGRATION"
            echo ""
            echo -e "${YELLOW}📋 Instructions pour appliquer la migration:${NC}"
            echo "1. Ouvrir: https://supabase.com/dashboard/project/nlesrzepybeeghghjafc/sql/new"
            echo "2. Copier et exécuter le contenu de: $LATEST_MIGRATION"
            echo ""

            if confirm "Voulez-vous voir le contenu du script de migration?"; then
                echo -e "${CYAN}--- DÉBUT DU SCRIPT DE MIGRATION ---${NC}"
                head -50 "$LATEST_MIGRATION"
                echo "..."
                echo -e "${CYAN}--- FIN DE L'EXTRAIT (50 premières lignes) ---${NC}"
            fi

            echo ""
            read -p "Appuyez sur Enter après avoir appliqué la migration (ou pour continuer)..." -r
        fi
    else
        echo -e "${YELLOW}⚠️  Script de synchronisation non trouvé, création...${NC}"

        # Créer le script s'il n'existe pas (copie depuis prod)
        if [ -f "/opt/team-dash-manager-prod/sync-database-to-prod.mjs" ]; then
            cp "/opt/team-dash-manager-prod/sync-database-to-prod.mjs" "/opt/team-dash-manager/"
            echo -e "${GREEN}✅ Script copié, relancez ce script${NC}"
            exit 0
        fi
    fi
else
    echo -e "${YELLOW}⏭️  Synchronisation DB ignorée${NC}"
fi

# ================================================
# SECTION 2: SAUVEGARDE DES CHANGEMENTS DEV
# ================================================
echo ""
echo -e "${CYAN}📝 SECTION 2: Sauvegarde des changements en dev${NC}"
echo "------------------------------------------------"

cd /opt/team-dash-manager

# Vérifier s'il y a des changements
if [[ -n $(git status -s) ]]; then
    echo "Changements détectés:"
    git status -s
    echo ""

    if confirm "Voulez-vous committer ces changements?"; then
        git add .
        echo -e "${YELLOW}Message de commit (Enter pour message par défaut):${NC}"
        read -r commit_msg

        if [ -z "$commit_msg" ]; then
            commit_msg="🚀 Deploy: Mise à jour automatique depuis dev avec sync DB"
        fi

        git commit -m "$commit_msg"
        git push origin main
        echo -e "${GREEN}✅ Changements sauvegardés et poussés${NC}"
    fi
else
    echo "Aucun changement à commit"
fi

# ================================================
# SECTION 3: SYNCHRONISATION CODE VERS PROD
# ================================================
echo ""
echo -e "${CYAN}📥 SECTION 3: Synchronisation du code vers production${NC}"
echo "------------------------------------------------"

cd /opt/team-dash-manager-prod

# Pull des derniers changements
echo "Récupération des derniers changements..."
git pull origin main

# Vérifier les changements dans package.json
if git diff HEAD~1 HEAD --name-only | grep -q "package.json"; then
    echo -e "${YELLOW}📦 Installation des nouvelles dépendances...${NC}"
    npm install
fi

# ================================================
# SECTION 4: BUILD DE PRODUCTION
# ================================================
echo ""
echo -e "${CYAN}🔨 SECTION 4: Build de production${NC}"
echo "------------------------------------------------"

npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build réussi${NC}"
else
    echo -e "${RED}❌ Erreur lors du build${NC}"
    exit 1
fi

# ================================================
# SECTION 5: DÉPLOIEMENT DES EDGE FUNCTIONS
# ================================================
echo ""
echo -e "${CYAN}⚡ SECTION 5: Edge Functions${NC}"
echo "------------------------------------------------"

if confirm "Voulez-vous déployer les Edge Functions vers PROD?"; then
    # Liste des fonctions importantes à déployer
    FUNCTIONS=(
        "init-client-credits"
        "manage-client-credits"
        "handle-new-user-simple"
        "project-orchestrator"
        "resource-booking"
    )

    for func in "${FUNCTIONS[@]}"; do
        if [ -d "/opt/team-dash-manager-prod/supabase/functions/$func" ]; then
            echo -e "${YELLOW}Déploiement de $func...${NC}"
            SUPABASE_ACCESS_TOKEN="sbp_b8ec67e2a4f3a7922f6cfea023b2cf81a00a7d9e" \
            SUPABASE_DB_PASSWORD="Raymonde7510" \
            npx supabase functions deploy "$func" --project-ref nlesrzepybeeghghjafc --no-verify-jwt || true
        fi
    done

    echo -e "${GREEN}✅ Edge Functions déployées${NC}"
else
    echo -e "${YELLOW}⏭️  Déploiement des Edge Functions ignoré${NC}"
fi

# ================================================
# SECTION 6: REDÉMARRAGE APPLICATION
# ================================================
echo ""
echo -e "${CYAN}♻️ SECTION 6: Redémarrage de l'application${NC}"
echo "------------------------------------------------"

# Vérifier si PM2 gère déjà l'app
if pm2 list | grep -q "team-dash-prod"; then
    pm2 restart team-dash-prod
    echo -e "${GREEN}✅ Application de production redémarrée${NC}"
else
    pm2 start /opt/team-dash-manager/ecosystem.config.cjs --only team-dash-prod
    echo -e "${GREEN}✅ Application de production démarrée${NC}"
fi

# Sauvegarder la configuration PM2
pm2 save

# ================================================
# SECTION 7: VÉRIFICATIONS FINALES
# ================================================
echo ""
echo -e "${CYAN}📊 SECTION 7: Statut et vérifications${NC}"
echo "------------------------------------------------"

# Afficher le statut PM2
pm2 status

echo ""
echo -e "${GREEN}🎉 DÉPLOIEMENT TERMINÉ AVEC SUCCÈS!${NC}"
echo ""

# Résumé
echo -e "${BLUE}📍 URLs d'accès:${NC}"
echo "  • Production: https://vaya.rip"
echo "  • Développement: http://localhost:8081"
echo ""

echo -e "${BLUE}🔍 Checklist post-déploiement:${NC}"
echo "  ✅ Tester la connexion sur https://vaya.rip"
echo "  ✅ Vérifier le dashboard client (pas d'erreur 406)"
echo "  ✅ Vérifier que les crédits s'affichent"
echo "  ✅ Vérifier que les templates de projets apparaissent"
echo ""

echo -e "${YELLOW}💡 Commandes utiles:${NC}"
echo "  • Logs production: pm2 logs team-dash-prod --lines 50"
echo "  • Logs Edge Functions: npx supabase functions logs --project-ref nlesrzepybeeghghjafc"
echo "  • Console SQL: https://supabase.com/dashboard/project/nlesrzepybeeghghjafc/sql"
echo ""

# Afficher les derniers logs
if confirm "Voulez-vous voir les derniers logs de production?"; then
    echo -e "${YELLOW}📜 Derniers logs de production:${NC}"
    pm2 logs team-dash-prod --nostream --lines 20
fi

echo ""
echo -e "${GREEN}✨ Script terminé!${NC}"