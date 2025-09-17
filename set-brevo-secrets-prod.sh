#!/bin/bash

echo "Configuration des secrets Brevo pour la production..."

# Les valeurs doivent être fournies en paramètre ou via fichier .env.local
if [ -z "$1" ]; then
    echo "Usage: ./set-brevo-secrets-prod.sh YOUR_BREVO_API_KEY"
    echo ""
    echo "Vous devez fournir votre clé API Brevo"
    echo "Trouvez-la sur: https://app.brevo.com/settings/keys/api"
    exit 1
fi

BREVO_API_KEY=$1

# Configuration des secrets
SUPABASE_ACCESS_TOKEN="sbp_b8ec67e2a4f3a7922f6cfea023b2cf81a00a7d9e" \
npx supabase secrets set BREVO_API_KEY="$BREVO_API_KEY" \
  --project-ref nlesrzepybeeghghjafc

SUPABASE_ACCESS_TOKEN="sbp_b8ec67e2a4f3a7922f6cfea023b2cf81a00a7d9e" \
npx supabase secrets set BREVO_FROM_EMAIL="hello@vaya.rip" \
  --project-ref nlesrzepybeeghghjafc

SUPABASE_ACCESS_TOKEN="sbp_b8ec67e2a4f3a7922f6cfea023b2cf81a00a7d9e" \
npx supabase secrets set BREVO_FROM_NAME="La Team Vaya" \
  --project-ref nlesrzepybeeghghjafc

echo "✅ Secrets Brevo configurés avec succès !"
echo ""
echo "Les secrets suivants ont été configurés :"
echo "- BREVO_API_KEY"
echo "- BREVO_FROM_EMAIL: hello@vaya.rip"
echo "- BREVO_FROM_NAME: La Team Vaya"