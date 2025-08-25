# Solutions Audio Bidirectionnelles de Qualité

## 🎯 Meilleures Options (hormis OpenAI)

### 1. **ElevenLabs + Deepgram** (Recommandé) ⭐
- **TTS**: ElevenLabs - Voix ultra-réalistes, émotions naturelles
- **STT**: Deepgram - Streaming temps réel, très précis en français
- **Coût**: ~$0.18/1K caractères (TTS) + $0.0059/minute (STT)
- **Qualité**: ⭐⭐⭐⭐⭐

### 2. **Azure Cognitive Services** 
- **TTS**: Neural voices très naturelles
- **STT**: Reconnaissance continue avec ponctuation
- **Avantages**: SDK JavaScript complet, intégration facile
- **Coût**: ~$16/million caractères + $1/heure audio

### 3. **Google Cloud Speech**
- **TTS**: WaveNet voices de haute qualité  
- **STT**: Streaming bidirectionnel natif
- **Avantages**: Latence très faible
- **Coût**: ~$16/million caractères

### 4. **AssemblyAI + Play.ht**
- **TTS**: Play.ht - Voix clonées personnalisables
- **STT**: AssemblyAI - Excellente précision
- **Avantages**: API simple, webhooks temps réel

## 🚀 Solution Implémentée : Web Speech API (Gratuite)

Pour l'instant, j'ai configuré la **Web Speech API native** du navigateur qui offre :

✅ **Avantages**:
- Gratuit et illimité
- Pas de configuration API
- Latence quasi-nulle
- Support multi-langues

❌ **Limites**:
- Voix moins naturelles que les solutions payantes
- Dépend du navigateur (Chrome/Edge recommandés)
- Pas de personnalisation avancée

## 💡 Pour Upgrader vers ElevenLabs + Deepgram

### 1. Obtenir les clés API
```bash
# ElevenLabs
https://elevenlabs.io/sign-up
# -> Dashboard -> API Keys

# Deepgram  
https://console.deepgram.com/signup
# -> API Keys -> Create Key
```

### 2. Ajouter dans Supabase
```bash
npx supabase secrets set ELEVENLABS_API_KEY="your-key" --project-ref egdelmcijszuapcpglsy
npx supabase secrets set DEEPGRAM_API_KEY="your-key" --project-ref egdelmcijszuapcpglsy
```

### 3. Code d'implémentation

```typescript
// TTS avec ElevenLabs
const elevenLabsTTS = async (text: string) => {
  const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/voice-id/stream', {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      }
    })
  });
  
  return response.arrayBuffer();
};

// STT avec Deepgram (WebSocket)
const deepgramSTT = () => {
  const ws = new WebSocket(
    `wss://api.deepgram.com/v1/listen?language=fr&model=nova-2&punctuate=true`,
    ['token', DEEPGRAM_KEY]
  );
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.transcript) {
      onTranscription(data.transcript);
    }
  };
  
  // Envoyer l'audio en chunks
  mediaRecorder.ondataavailable = (e) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(e.data);
    }
  };
};
```

## 🎤 Expérience Utilisateur Idéale

1. **Un seul bouton** : Active/Désactive le mode vocal
2. **Écoute continue** : Détection automatique de la parole
3. **Interruption intelligente** : Le bot s'arrête si l'utilisateur parle
4. **Feedback visuel** : Indicateurs d'écoute et de traitement
5. **Mode push-to-talk optionnel** : Pour les environnements bruyants

## 📊 Comparaison Qualité/Prix

| Solution | Qualité Voix | Latence | Prix/mois* | Bidirectionnel |
|----------|-------------|---------|------------|----------------|
| OpenAI | ⭐⭐⭐⭐ | ~500ms | $50-100 | ✅ (Realtime API) |
| ElevenLabs+Deepgram | ⭐⭐⭐⭐⭐ | ~300ms | $30-60 | ✅ |
| Azure | ⭐⭐⭐⭐ | ~400ms | $20-40 | ✅ |
| Google Cloud | ⭐⭐⭐⭐ | ~350ms | $25-45 | ✅ |
| Web Speech API | ⭐⭐⭐ | ~100ms | Gratuit | ✅ |

*Estimation pour ~1000 conversations/mois

## 🔧 Recommandation

Pour votre cas d'usage (test de compétences avec conversation fluide) :

1. **Court terme** : Web Speech API (déjà configurée, gratuite)
2. **Production** : ElevenLabs + Deepgram pour une qualité professionnelle
3. **Enterprise** : Azure Cognitive Services pour la fiabilité et le support

Le mode vocal actuel fonctionne et peut être amélioré progressivement selon vos besoins et budget.