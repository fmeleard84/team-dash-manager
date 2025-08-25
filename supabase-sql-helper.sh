#!/bin/bash

# Script helper pour exécuter facilement des commandes SQL dans Supabase
# Usage: ./supabase-sql-helper.sh "SELECT * FROM profiles LIMIT 1;"

# Configuration
PGHOST="aws-0-eu-west-3.pooler.supabase.com"
PGPORT="6543"
PGUSER="postgres.egdelmcijszuapcpglsy"
PGDATABASE="postgres"
export PGPASSWORD="R@ymonde7510_2a"

# Couleurs pour l'output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Vérifier qu'une requête SQL est fournie
if [ -z "$1" ]; then
    echo -e "${RED}❌ Erreur: Aucune requête SQL fournie${NC}"
    echo "Usage: $0 \"VOTRE_REQUETE_SQL\""
    echo "Exemple: $0 \"SELECT * FROM profiles LIMIT 1;\""
    exit 1
fi

SQL_QUERY="$1"

# Afficher la requête qui va être exécutée
echo -e "${YELLOW}🔧 Exécution de la requête SQL:${NC}"
echo "$SQL_QUERY"
echo ""

# Exécuter la requête
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "$SQL_QUERY"

# Vérifier le code de retour
if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✅ Requête exécutée avec succès!${NC}"
else
    echo -e "\n${RED}❌ Erreur lors de l'exécution de la requête${NC}"
    exit 1
fi