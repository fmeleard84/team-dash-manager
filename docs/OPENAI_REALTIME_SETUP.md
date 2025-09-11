# Configuration OpenAI Realtime API

## Prérequis

1. **Clé API OpenAI** avec accès à l'API Realtime
2. **Supabase** configuré et déployé

## Configuration

### 1. Configurer la clé API OpenAI dans Supabase

```bash
# Définir le secret dans Supabase (production)
npx supabase secrets set OPENAI_API_KEY=sk-your-openai-api-key
```

### 2. Déployer la fonction Edge

La fonction `generate-realtime-key` est déjà déployée et génère des clés éphémères pour l'API Realtime.

```bash
SUPABASE_ACCESS_TOKEN="your_token" \
SUPABASE_DB_PASSWORD="your_password" \
npx supabase functions deploy generate-realtime-key --project-ref your-project-ref
```

### 3. Utilisation dans l'application

L'assistant vocal est accessible via le bouton microphone dans le header du ClientDashboard.

## Architecture

```
Browser (Client) 
    ↓
Supabase Edge Function (generate-realtime-key)
    ↓
OpenAI API (génère clé éphémère)
    ↓
Browser (utilise clé éphémère)
    ↓
OpenAI Realtime API (WebRTC)
```

## Sécurité

- Les clés API OpenAI ne sont **jamais** exposées côté client
- Les clés éphémères expirent après 1 heure
- Chaque session génère une nouvelle clé éphémère

## Test local

Pour tester localement, vous pouvez générer une clé éphémère manuellement:

```bash
curl -X POST https://api.openai.com/v1/realtime/client_secrets \
   -H "Authorization: Bearer $OPENAI_API_KEY" \
   -H "Content-Type: application/json" \
   -d '{
     "session": {
       "type": "realtime",
       "model": "gpt-realtime"
     }
   }'
```

## Dépannage

### Erreur "UserError: Using the WebRTC connection requires an ephemeral client key"

Cette erreur indique que vous essayez d'utiliser une clé API normale au lieu d'une clé éphémère. Assurez-vous que:
1. La fonction Edge `generate-realtime-key` est déployée
2. La variable `OPENAI_API_KEY` est configurée dans Supabase
3. L'application récupère bien la clé éphémère avant de se connecter

### Erreur "Failed to generate ephemeral key"

Vérifiez que:
1. Votre clé API OpenAI a accès à l'API Realtime
2. La clé est correctement configurée dans Supabase secrets
3. Le modèle `gpt-realtime` est disponible sur votre compte

## Ressources

- [OpenAI Realtime API Documentation](https://platform.openai.com/docs/guides/realtime)
- [Voice Agents Quickstart](https://openai.github.io/openai-agents-js/guides/voice-agents/quickstart/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)