#!/bin/bash

# Script pour pousser sur GitHub
# Nécessite un Personal Access Token GitHub valide

echo "📤 Push vers GitHub..."
echo ""
echo "Pour pousser les changements sur GitHub, vous devez :"
echo ""
echo "1. Créer un Personal Access Token sur GitHub :"
echo "   https://github.com/settings/tokens/new"
echo "   - Cochez 'repo' pour les permissions"
echo "   - Notez le token généré"
echo ""
echo "2. Utiliser cette commande avec votre token :"
echo ""
echo "git remote set-url origin https://fmeleard84:VOTRE_TOKEN@github.com/fmeleard84/team-dash-manager.git"
echo "git push origin main"
echo ""
echo "OU"
echo ""
echo "3. Ajouter votre clé SSH publique à GitHub :"
echo "   https://github.com/settings/keys"
echo ""
echo "Votre clé publique :"
echo "---"
cat ~/.ssh/id_ed25519.pub
echo "---"
echo ""
echo "Puis utiliser :"
echo "git push origin main"
echo ""
echo "📝 Status actuel :"
git status --short
echo ""
echo "📦 Dernier commit :"
git log -1 --oneline