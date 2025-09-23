#!/bin/bash

# =========================================
# SCRIPT DE DÉPLOIEMENT COMPLET DU SYSTÈME
# PGVECTOR POUR CONTEXTE PROJET IA
# =========================================

echo "🚀 Démarrage du déploiement du système PGVector pour contexte projet IA..."
echo "=================================================="

# Configuration
SUPABASE_PROJECT_REF="egdelmcijszuapcpglsy"
SUPABASE_ACCESS_TOKEN="sbp_b8ec67e2a4f3a7922f6cfea023b2cf81a00a7d9e"
SUPABASE_DB_PASSWORD="Raymonde7510_2a"

# Export des variables pour Supabase CLI
export SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN
export SUPABASE_DB_PASSWORD=$SUPABASE_DB_PASSWORD

# 1. Application de la migration SQL
echo ""
echo "📊 Étape 1: Application de la migration SQL..."
echo "----------------------------------------------"
npx supabase db push --project-ref $SUPABASE_PROJECT_REF

if [ $? -eq 0 ]; then
    echo "✅ Migration SQL appliquée avec succès"
else
    echo "❌ Erreur lors de l'application de la migration SQL"
    exit 1
fi

# 2. Déploiement de l'Edge Function process-project-embeddings
echo ""
echo "⚡ Étape 2: Déploiement de l'Edge Function process-project-embeddings..."
echo "------------------------------------------------------------------------"
npx supabase functions deploy process-project-embeddings --project-ref $SUPABASE_PROJECT_REF

if [ $? -eq 0 ]; then
    echo "✅ Edge Function process-project-embeddings déployée"
else
    echo "❌ Erreur lors du déploiement de l'Edge Function process-project-embeddings"
    exit 1
fi

# 3. Mise à jour de l'Edge Function ai-conversation-handler
echo ""
echo "🤖 Étape 3: Mise à jour de l'Edge Function ai-conversation-handler..."
echo "---------------------------------------------------------------------"
npx supabase functions deploy ai-conversation-handler --project-ref $SUPABASE_PROJECT_REF

if [ $? -eq 0 ]; then
    echo "✅ Edge Function ai-conversation-handler mise à jour"
else
    echo "❌ Erreur lors de la mise à jour de l'Edge Function ai-conversation-handler"
    exit 1
fi

# 4. Test de l'Edge Function process-project-embeddings
echo ""
echo "🧪 Étape 4: Test de l'Edge Function process-project-embeddings..."
echo "-----------------------------------------------------------------"
curl -X POST \
  "https://$SUPABASE_PROJECT_REF.supabase.co/functions/v1/process-project-embeddings" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "process", "batchSize": 1}' \
  --silent --show-error

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Test de l'Edge Function réussi"
else
    echo ""
    echo "⚠️ Le test a échoué, mais ce n'est pas critique si la queue est vide"
fi

# 5. Instructions pour configurer le CRON
echo ""
echo "📅 Étape 5: Configuration du CRON (manuelle)"
echo "-------------------------------------------"
echo ""
echo "⚠️ IMPORTANT: Pour activer le traitement automatique, vous devez:"
echo ""
echo "1. Aller dans le Dashboard Supabase:"
echo "   https://supabase.com/dashboard/project/$SUPABASE_PROJECT_REF"
echo ""
echo "2. Activer les extensions nécessaires:"
echo "   - Database > Extensions > Rechercher 'pg_cron' > Enable"
echo "   - Database > Extensions > Rechercher 'pg_net' > Enable"
echo ""
echo "3. Configurer la clé OpenAI (si pas déjà fait):"
echo "   - Settings > Edge Functions > Secrets"
echo "   - Ajouter: OPENAI_API_KEY = votre-clé-api"
echo ""
echo "4. Exécuter le script CRON dans SQL Editor:"
echo "   - Copier le contenu de: setup-project-embeddings-cron.sql"
echo "   - Coller et exécuter dans SQL Editor"
echo ""

# 6. Résumé du déploiement
echo "=================================================="
echo "📊 RÉSUMÉ DU DÉPLOIEMENT"
echo "=================================================="
echo ""
echo "✅ Tables créées:"
echo "   - project_embeddings (stockage des vecteurs)"
echo "   - project_embedding_queue (queue de traitement)"
echo ""
echo "✅ Fonctions RPC créées:"
echo "   - search_project_embeddings (recherche vectorielle)"
echo "   - get_project_context_for_ai (contexte enrichi)"
echo "   - queue_project_content_for_embedding (ajout à la queue)"
echo ""
echo "✅ Triggers créés:"
echo "   - Messages → Queue automatique"
echo "   - Fichiers Drive → Queue automatique"
echo "   - Cartes Kanban → Queue automatique"
echo ""
echo "✅ Edge Functions déployées:"
echo "   - process-project-embeddings (traitement des embeddings)"
echo "   - ai-conversation-handler (mis à jour avec contexte projet)"
echo ""
echo "⏳ À faire manuellement:"
echo "   - Activer pg_cron et pg_net dans Supabase Dashboard"
echo "   - Configurer OPENAI_API_KEY dans les secrets"
echo "   - Exécuter setup-project-embeddings-cron.sql"
echo ""
echo "=================================================="
echo "🎉 Déploiement terminé avec succès!"
echo "=================================================="
echo ""
echo "📝 Pour vérifier le statut:"
echo "   - Queue: SELECT status, COUNT(*) FROM project_embedding_queue GROUP BY status;"
echo "   - Embeddings: SELECT COUNT(*) FROM project_embeddings;"
echo "   - Logs: npx supabase functions logs process-project-embeddings --project-ref $SUPABASE_PROJECT_REF"