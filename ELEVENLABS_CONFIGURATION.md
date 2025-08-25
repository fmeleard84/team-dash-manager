# Configuration ElevenLabs pour le Mode Vocal

## Étapes pour configurer votre agent ElevenLabs

### 1. Créer un compte ElevenLabs
- Allez sur [ElevenLabs](https://elevenlabs.io/)
- Créez un compte gratuit ou connectez-vous

### 2. Créer un Agent Conversationnel
1. Allez dans [Conversational AI](https://elevenlabs.io/app/conversational-ai)
2. Cliquez sur "Create Agent"
3. Configurez votre agent :
   - **Name**: Par exemple "Recruteur IA"
   - **First Message**: "Bonjour ! Je suis votre évaluateur IA. Êtes-vous prêt à commencer le test de compétences ?"
   - **System Prompt**: 
   ```
   Tu es un recruteur professionnel francophone spécialisé dans l'évaluation technique.
   Pose des questions pertinentes pour évaluer les compétences du candidat.
   Sois encourageant et professionnel.
   Parle exclusivement en français.
   ```
   - **Language**: French
   - **Voice**: Choisissez une voix française

4. Dans les paramètres avancés :
   - **Response Model**: Choisissez un modèle (GPT-4 recommandé)
   - **Temperature**: 0.7
   - **Authentication**: Laissez sur "Private" pour plus de sécurité

5. Cliquez sur "Create Agent"

### 3. Récupérer l'Agent ID
1. Une fois l'agent créé, cliquez dessus
2. L'Agent ID se trouve dans l'URL ou dans les détails de l'agent
3. Il ressemble à : `agent_XXXXXXXXXXXXXXXXXXXXXXXXXX`

### 4. Obtenir votre API Key
1. Allez dans votre [Profile Settings](https://elevenlabs.io/app/settings/api-keys)
2. Cliquez sur "Create API Key"
3. Copiez la clé (elle commence par `sk_`)

### 5. Configurer le code
Ouvrez le fichier `src/components/candidate/VoiceChatElevenLabsSDK.tsx` et remplacez :

```typescript
const AGENT_ID = 'YOUR_AGENT_ID_HERE'; // Remplacez par votre Agent ID
const ELEVENLABS_API_KEY = 'YOUR_API_KEY_HERE'; // Remplacez par votre API Key
```

**Configuration actuelle** :

```typescript
const AGENT_ID = 'agent_01jz2etphrffp8j288md6wcbxh';
const ELEVENLABS_API_KEY = 'sk_78684f6ed063bb3803838d5ce932e5c38d0a308e542381ac';
```

### 6. Tester
1. Rechargez la page
2. Cliquez sur "Activer Mode Vocal"
3. Parlez avec votre agent !

## Dépannage

### Erreur "The AI agent you are trying to reach does not exist"
- Vérifiez que l'Agent ID est correct
- Assurez-vous que l'agent n'a pas été supprimé

### Erreur "Could not authorize the conversation"
- Vérifiez votre API Key
- Assurez-vous que l'agent est configuré comme "Private"

### L'agent ne parle pas français
- Modifiez le System Prompt de l'agent dans le dashboard ElevenLabs
- Choisissez une voix française

## Sécurité

⚠️ **IMPORTANT**: Ne commitez jamais vos clés API dans Git !

Pour la production, utilisez des variables d'environnement :
1. Créez un fichier `.env.local`
2. Ajoutez vos clés :
   ```
   VITE_ELEVENLABS_AGENT_ID=agent_XXXX
   VITE_ELEVENLABS_API_KEY=sk_XXXX
   ```
3. Modifiez le code pour utiliser :
   ```typescript
   const AGENT_ID = import.meta.env.VITE_ELEVENLABS_AGENT_ID;
   const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
   ```

## Ressources
- [Documentation ElevenLabs](https://elevenlabs.io/docs/conversational-ai)
- [Dashboard Agents](https://elevenlabs.io/app/conversational-ai)
- [API Keys](https://elevenlabs.io/app/settings/api-keys)