#!/bin/bash

echo "Test de connexion à la base de données Supabase"
echo "=============================================="
echo ""

# Nouveau mot de passe
NEW_PASSWORD="Raymonde7510_2a"
OLD_PASSWORD="R@ymonde7510_2a"

# Test avec le nouveau mot de passe
echo "Test 1: Nouveau mot de passe (Raymonde7510_2a)"
export PGPASSWORD="$NEW_PASSWORD"
psql "postgresql://postgres.egdelmcijszuapcpglsy@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" -c "SELECT COUNT(*) FROM projects;" 2>&1 | head -5

echo ""
echo "Test 2: Ancien mot de passe (R@ymonde7510_2a)"
export PGPASSWORD="$OLD_PASSWORD"
psql "postgresql://postgres.egdelmcijszuapcpglsy@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" -c "SELECT COUNT(*) FROM projects;" 2>&1 | head -5