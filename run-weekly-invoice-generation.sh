#!/bin/bash

echo "🚀 Génération des factures hebdomadaires..."
echo ""

curl -X POST https://egdelmcijszuapcpglsy.supabase.co/functions/v1/generate-weekly-invoices \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMzMxMTg2MCwiZXhwIjoyMDM4ODg3ODYwfQ.TRL9Bci_P8ijPA0Ll34kVD-B15e6MJZpSdCpGaHfv9U" \
  -H "Content-Type: application/json" | python3 -m json.tool

echo ""
echo "✅ Génération terminée !"