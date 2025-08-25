#!/bin/bash

EMAIL="fmeleard+ressource_7@gmail.com"
SUPABASE_URL="https://egdelmcijszuapcpglsy.supabase.co"

echo "=== Vérification du candidat: $EMAIL ==="
echo ""

# Récupérer le candidat par email (utilise le RPC public si disponible)
echo "Recherche du candidat..."

# Pour debug, vérifions que la sauvegarde fonctionne en affichant les derniers logs
echo ""
echo "=== Vérification des logs récents d'onboarding ==="
echo "Consultez les logs dans la console du navigateur pour voir si:"
echo "1. 'Saving test results to database:' apparaît"
echo "2. 'Test results saved successfully' ou une erreur apparaît"
echo ""
echo "Les résultats devraient être dans la table 'candidate_qualification_results'"
echo "avec les colonnes:"
echo "  - candidate_id: UUID du candidat"
echo "  - test_answers: JSONB avec les réponses"
echo "  - score: INTEGER (score obtenu)"
echo "  - qualification_status: 'qualified', 'pending' ou 'rejected'"