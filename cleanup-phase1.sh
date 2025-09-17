#!/bin/bash

echo "🧹 PHASE 1 - Nettoyage du code"
echo "================================"

# Créer un dossier de backup au cas où
BACKUP_DIR="_cleanup_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📁 Backup créé dans: $BACKUP_DIR"
echo ""

# Liste des fichiers VoiceChat à GARDER
KEEP_FILES=(
    "src/components/candidate/RealtimeQualificationAgentV2.tsx"
    "src/pages/CandidateSkillTestNew.tsx"
    "src/hooks/useRealtimeMessages.ts"
    "src/hooks/useRealtimeProjects.ts"
    "src/hooks/useRealtimeProjectsFixed.ts"
    "src/components/invoicing/InvoiceDetail.tsx"
    "src/components/invoicing/InvoiceList.tsx"
    "src/hooks/useInvoices.ts"
    "src/utils/generateTestInvoice.ts"
)

# Fichiers VoiceChat à SUPPRIMER
VOICE_FILES_TO_DELETE=(
    "src/components/VoiceChat.tsx"
    "src/components/VoiceChatSimple.tsx"
    "src/components/VoiceChatNative.tsx"
    "src/components/VoiceChatConversational.tsx"
    "src/components/VoiceChatElevenLabs.tsx"
    "src/components/VoiceChatElevenLabsSDK.tsx"
    "src/components/VoiceChatElevenLabsFinal.tsx"
    "src/components/candidate/VoiceChatSimple.tsx"
    "src/components/candidate/VoiceChatSDK.tsx"
    "src/components/candidate/VoiceChatStable.tsx"
    "src/components/candidate/VoiceChatDirect.tsx"
    "src/components/candidate/VoiceChatText.tsx"
    "src/components/candidate/VoiceConversation.tsx"
    "src/components/candidate/VoiceRecognition.tsx"
    "src/components/candidate/VoiceSynthesis.tsx"
    "src/components/candidate/VoiceChatElevenLabsSimple.tsx"
    "src/components/candidate/VoiceChatElevenLabsSimplified.tsx"
    "src/components/candidate/VoiceChatElevenLabsProper.tsx"
    "src/components/candidate/VoiceChatElevenLabsSDK.tsx"
    "src/components/candidate/VoiceChatElevenLabsWebSocket.tsx"
    "src/components/candidate/RealtimeVoiceChat.tsx"
    "src/components/candidate/RealtimeQualificationAgent.tsx"
    "src/components/client/EnhancedVoiceAssistant.tsx"
    "src/components/client/RealtimeAIChat.tsx"
    "src/components/client/RealtimeVoiceAgent.tsx"
    "src/components/client/RealtimeVoiceAgentDirect.tsx"
    "src/components/client/RealtimeVoiceAgentSimple.tsx"
    "src/ai-assistant/hooks/useRealtimeAssistant.ts"
    "src/pages/CandidateSkillTest.tsx"
    "src/pages/CandidateSkillTest-realtime.tsx"
)

# Fichiers backup/broken à SUPPRIMER
DEAD_FILES=(
    "src/ai-assistant/tools/project-tools.backup.ts.disabled"
    "src/hooks/useProjectUsers.backup.ts"
    "src/pages/CandidateSkillTest.tsx.broken"
)

echo "🗑️  Suppression des composants VoiceChat inutilisés..."
deleted_voice=0
for file in "${VOICE_FILES_TO_DELETE[@]}"; do
    if [ -f "$file" ]; then
        cp "$file" "$BACKUP_DIR/" 2>/dev/null
        rm "$file"
        echo "  ✓ Supprimé: $file"
        ((deleted_voice++))
    fi
done

echo ""
echo "🗑️  Suppression des fichiers morts (.backup, .broken, .disabled)..."
deleted_dead=0
for file in "${DEAD_FILES[@]}"; do
    if [ -f "$file" ]; then
        cp "$file" "$BACKUP_DIR/" 2>/dev/null
        rm "$file"
        echo "  ✓ Supprimé: $file"
        ((deleted_dead++))
    fi
done

echo ""
echo "📊 RÉSUMÉ:"
echo "  - Composants VoiceChat supprimés: $deleted_voice"
echo "  - Fichiers morts supprimés: $deleted_dead"
echo "  - Total supprimé: $((deleted_voice + deleted_dead)) fichiers"
echo ""
echo "✅ Phase 1 terminée ! Les fichiers sont sauvegardés dans $BACKUP_DIR"