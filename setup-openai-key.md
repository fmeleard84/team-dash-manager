# Configuration de la clé API OpenAI pour le mode vocal

Pour activer le mode vocal dans le test de compétences, vous devez configurer votre clé API OpenAI dans Supabase.

## Étapes de configuration :

### 1. Obtenir une clé API OpenAI
- Allez sur [OpenAI Platform](https://platform.openai.com/)
- Créez un compte ou connectez-vous
- Allez dans API Keys
- Créez une nouvelle clé API

### 2. Ajouter la clé dans Supabase

#### Option A : Via le Dashboard Supabase (Recommandé)
1. Allez sur [Supabase Dashboard](https://supabase.com/dashboard/project/egdelmcijszuapcpglsy/functions)
2. Cliquez sur "Edge Functions" dans le menu
3. Sélectionnez la fonction `skill-test-ai`
4. Allez dans l'onglet "Secrets"
5. Ajoutez un nouveau secret :
   - Name: `OPENAI_API_KEY`
   - Value: `sk-...` (votre clé API)
6. Cliquez sur "Save"

#### Option B : Via la CLI Supabase
```bash
npx supabase secrets set OPENAI_API_KEY="sk-..." --project-ref egdelmcijszuapcpglsy
```

## Fonctionnalités activées :

Une fois la clé configurée, vous pourrez :
- 🎙️ **Enregistrer vos réponses vocales** : Utilise Whisper d'OpenAI pour la transcription
- 🔊 **Écouter les questions** : Utilise TTS d'OpenAI avec la voix "nova"
- 💬 **Mode hybride** : Basculer entre vocal et texte à tout moment

## Test du mode vocal :

1. Allez sur la page de test de compétences
2. Cliquez sur "Mode Vocal Désactivé" pour l'activer
3. Le badge "🎙️ OpenAI Voice • 🔊 TTS Activé" apparaîtra
4. Cliquez sur "Enregistrer la réponse" pour parler
5. Les réponses du bot seront automatiquement lues

## Notes :

- **Coûts** : L'utilisation de l'API OpenAI est payante
  - TTS : ~$0.015 par 1K caractères
  - Whisper : ~$0.006 par minute d'audio
- **Sécurité** : Ne partagez jamais votre clé API publiquement
- **Fallback** : Si la clé n'est pas configurée, le test fonctionne normalement en mode texte

## Dépannage :

Si le mode vocal ne fonctionne pas après configuration :
1. Vérifiez que la clé est bien enregistrée dans Supabase
2. Redéployez la fonction : `npx supabase functions deploy skill-test-ai`
3. Vérifiez les logs de la fonction dans le dashboard Supabase