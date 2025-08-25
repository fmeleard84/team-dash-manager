# Configuration ElevenLabs Conversational AI

## 🚨 Configuration Requise

Pour utiliser le mode vocal avec ElevenLabs Conversational AI, vous devez :

### 1. Créer un Agent Conversationnel

1. Connectez-vous sur [ElevenLabs](https://elevenlabs.io)
2. Allez dans [Conversational AI](https://elevenlabs.io/app/conversational-ai)
3. Cliquez sur "Create Agent"
4. Configurez votre agent :
   - **Name**: "Test de Compétences IA"
   - **System Prompt**: Configurez le comportement de votre agent
   - **Voice**: Choisissez une voix française
   - **Language**: French
   - **First Message**: Message d'accueil de l'agent

### 2. Récupérer l'Agent ID

1. Une fois l'agent créé, cliquez dessus
2. Copiez l'Agent ID (format: `abc123def456...`)
3. Remplacez `your-agent-id-here` dans le fichier :
   - `/src/components/candidate/VoiceChatElevenLabsSDK.tsx`

### 3. Configuration de l'Agent

Dans les paramètres de l'agent, activez :
- **Advanced > Client Events** : Activez les événements nécessaires
- **Authentication** : Laissez désactivé pour un agent public (tests)

## 🔧 Problèmes Actuels et Solutions

### Problème 1: Voix Multiples qui se Superposent
**Cause**: Le composant actuel utilise l'API TTS simple au lieu du SDK conversationnel.
**Solution**: Utiliser le SDK `@elevenlabs/react` avec `useConversation`.

### Problème 2: Micro qui ne se Réactive pas
**Cause**: La reconnaissance vocale native et ElevenLabs entrent en conflit.
**Solution**: Le SDK gère automatiquement le turn-taking (tour de parole).

### Problème 3: Conversation qui se Coupe
**Cause**: Gestion manuelle de la reconnaissance vocale.
**Solution**: Le SDK maintient une connexion WebRTC stable.

## 📦 Installation des Dépendances

```bash
# Si pas déjà installé
npm install @elevenlabs/react
```

## 🎯 Utilisation Correcte du SDK

```tsx
import { useConversation } from '@elevenlabs/react';

const conversation = useConversation({
  onConnect: () => console.log('Connected'),
  onDisconnect: () => console.log('Disconnected'),
  onMessage: (message) => {
    // message.type peut être :
    // - 'user_transcript': Transcription de l'utilisateur
    // - 'agent_response': Réponse de l'agent
    // - 'audio': Audio de l'agent (géré automatiquement)
  },
  onError: (error) => console.error(error)
});

// Démarrer la conversation
await conversation.startSession({
  agentId: 'your-agent-id',
  userId: 'optional-user-id'
});

// Arrêter la conversation
await conversation.endSession();
```

## ✅ Avantages du SDK vs API Simple

| Fonctionnalité | API Simple (Actuel) | SDK Conversationnel |
|----------------|-------------------|-------------------|
| Turn-taking | Manuel (problématique) | Automatique |
| Latence | Élevée (~2-3s) | Faible (<500ms) |
| Gestion audio | Manuelle (queues) | Automatique |
| Interruptions | Difficiles | Natives |
| Stabilité | Variable | Excellente |
| WebRTC | Non | Oui |

## 🔄 Migration du Code

### Avant (Problématique)
```tsx
// Reconnaissance vocale native
const recognition = new SpeechRecognition();
// TTS séparé
fetch('https://api.elevenlabs.io/v1/text-to-speech/...')
// Gestion manuelle des états
```

### Après (Solution)
```tsx
// Tout est géré par le SDK
const conversation = useConversation();
await conversation.startSession({ agentId });
// Le SDK gère automatiquement :
// - La reconnaissance vocale
// - La synthèse vocale
// - Le turn-taking
// - Les interruptions
```

## 📝 Notes Importantes

1. **Agent ID**: Sans un agent ID valide, le mode vocal ne fonctionnera pas.
2. **Microphone**: L'accès au microphone est requis.
3. **WebRTC**: Utilise WebRTC pour une latence minimale.
4. **Turn-taking**: L'agent détecte automatiquement quand vous avez fini de parler.

## 🚀 Prochaines Étapes

1. Créez votre agent sur ElevenLabs
2. Remplacez l'Agent ID dans le code
3. Testez avec le nouveau composant `VoiceChatElevenLabsSDK`
4. Supprimez l'ancien composant `VoiceChatElevenLabsSimplified`