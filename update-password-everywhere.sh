#!/bin/bash

echo "🔄 Mise à jour du mot de passe dans tous les fichiers..."
echo "=================================================="
echo ""

OLD_PASSWORD="R@ymonde7510_2a"
NEW_PASSWORD="Raymonde7510_2a"

# Liste des fichiers à mettre à jour
FILES=(
    "apply-migration-direct.mjs"
    "sync-database-to-prod.mjs"
    "apply-rls-fix.mjs"
    "apply-archive-migration.js"
    "supabase-sql-helper.sh"
    "check-admin-user.sql"
    "docs/VECTOR_DB_STATUS.md"
    "supabase/functions/check-and-fix-qualification-rls/index.ts"
    "supabase/functions/fix-qualification-table/index.ts"
    "supabase/functions/fix-time-tracking-rls/index.ts"
)

# Compteur
updated=0
errors=0

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -n "Mise à jour de $file... "

        # Créer une sauvegarde
        cp "$file" "$file.bak.password"

        # Remplacer le mot de passe
        sed -i "s/${OLD_PASSWORD}/${NEW_PASSWORD}/g" "$file"

        if [ $? -eq 0 ]; then
            echo "✅"
            ((updated++))
        else
            echo "❌"
            ((errors++))
            # Restaurer la sauvegarde en cas d'erreur
            mv "$file.bak.password" "$file"
        fi
    else
        echo "⚠️  Fichier non trouvé: $file"
    fi
done

echo ""
echo "===== Résumé ====="
echo "✅ Fichiers mis à jour: $updated"
echo "❌ Erreurs: $errors"
echo ""

# Nettoyer les sauvegardes
echo "Suppression des fichiers de sauvegarde..."
find . -name "*.bak.password" -delete

echo ""
echo "📝 NOTE IMPORTANTE:"
echo "Le mot de passe PostgreSQL a été mis à jour de:"
echo "  Ancien: R@ymonde7510_2a (avec @)"
echo "  Nouveau: Raymonde7510_2a (sans @)"
echo ""
echo "Les Edge Functions utilisent les clés API et ne sont pas affectées."
echo "Seules les connexions directes PostgreSQL sont impactées."