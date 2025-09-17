import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Volume2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

// Configuration ElevenLabs
const AGENT_ID = 'agent_01jz2etphrffp8j288md6wcbxh';
const ELEVENLABS_API_KEY = 'sk_78684f6ed063bb3803838d5ce932e5c38d0a308e542381ac';

interface VoiceChatStableProps {
  onTranscription?: (text: string) => void;
  onBotResponse?: (text: string) => void;
  isEnabled: boolean;
  onToggle: () => void;
}

// Instance globale pour éviter les connexions multiples
let globalWebSocket: WebSocket | null = null;
let isConnecting = false;

export function VoiceChatStable({ 
  onTranscription, 
  onBotResponse,
  isEnabled, 
  onToggle
}: VoiceChatStableProps) {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const cleanupRef = useRef<boolean>(false);

  // Fonction de nettoyage centralisée
  const cleanup = useCallback(() => {
    console.log('🧹 Nettoyage des ressources...');
    
    // Arrêter le processeur audio
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    // Fermer le contexte audio
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Arrêter le stream média
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // Fermer le WebSocket s'il existe
    if (globalWebSocket && globalWebSocket.readyState === WebSocket.OPEN) {
      console.log('🔌 Fermeture du WebSocket');
      globalWebSocket.close();
      globalWebSocket = null;
    }

    isConnecting = false;
    setStatus('idle');
    setConversationId(null);
  }, []);

  const connectToAgent = useCallback(async () => {
    // Vérifier qu'on n'est pas déjà en train de se connecter
    if (isConnecting || globalWebSocket?.readyState === WebSocket.OPEN) {
      console.log('⚠️ Connexion déjà en cours ou établie');
      return;
    }

    isConnecting = true;
    setStatus('connecting');

    try {
      // 1. Demander l'accès au microphone
      console.log('🎤 Demande d\'accès au microphone...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      mediaStreamRef.current = stream;
      console.log('✅ Microphone autorisé');

      // 2. Obtenir l'URL signée
      console.log('🔐 Obtention de l\'URL signée...');
      const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${AGENT_ID}`,
        {
          method: 'GET',
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Erreur API:', errorData);
        throw new Error(`Erreur API: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ URL signée obtenue');

      // 3. Créer la connexion WebSocket
      console.log('🔗 Création du WebSocket...');
      const ws = new WebSocket(data.signed_url);
      globalWebSocket = ws;

      // 4. Configurer les événements WebSocket
      ws.onopen = () => {
        console.log('✅ WebSocket connecté');
        setStatus('connected');
        setConversationId(data.conversation_id || 'active');
        toast.success('Connexion vocale établie');
        
        // Envoyer un message d'initialisation
        ws.send(JSON.stringify({
          type: 'conversation_initiation',
          conversation_config_override: {
            agent: {
              language: 'fr',
              prompt: {
                prompt: "Tu es un recruteur professionnel francophone. Parle exclusivement en français."
              }
            }
          }
        }));
        
        // Démarrer l'envoi audio après connexion
        setTimeout(() => {
          startAudioStreaming(ws, stream);
        }, 100);
      };

      ws.onmessage = (event) => {
        try {
          // Vérifier si c'est un blob audio
          if (event.data instanceof Blob) {
            console.log('🔊 Audio blob reçu:', event.data.size, 'bytes');
            playAudioBlob(event.data);
            return;
          }

          // Sinon, traiter comme JSON
          const message = JSON.parse(event.data);
          console.log('📨 Message:', message.type, message);
          
          // Gérer les différents types de messages ElevenLabs
          switch(message.type) {
            case 'conversation_initiation_metadata':
              console.log('🎯 Métadonnées de conversation reçues');
              break;
              
            case 'user_transcript':
            case 'user_transcription_update':
              if (message.text && onTranscription) {
                console.log('🎤 Transcription utilisateur:', message.text);
                onTranscription(message.text);
              }
              break;
              
            case 'agent_response':
            case 'agent_response_update':
              if (message.text && onBotResponse) {
                console.log('🤖 Réponse agent:', message.text);
                onBotResponse(message.text);
              }
              break;
              
            case 'audio':
            case 'audio_chunk':
              if (message.audio_event?.audio) {
                // Audio encodé en base64
                const audioBlob = base64ToBlob(message.audio_event.audio, 'audio/mpeg');
                playAudioBlob(audioBlob);
              } else if (message.audio) {
                const audioBlob = base64ToBlob(message.audio, 'audio/mpeg');
                playAudioBlob(audioBlob);
              }
              break;
              
            case 'interruption':
              console.log('⚠️ Interruption détectée');
              break;
              
            case 'ping':
              // Répondre au ping pour maintenir la connexion
              ws.send(JSON.stringify({ type: 'pong' }));
              break;
              
            default:
              console.log('📦 Message non traité:', message.type);
          }
        } catch (e) {
          console.log('Message brut non-JSON:', event.data);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ Erreur WebSocket:', error);
        setStatus('error');
        toast.error('Erreur de connexion');
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket fermé:', event.code, event.reason);
        if (!cleanupRef.current) {
          cleanup();
        }
      };

    } catch (error) {
      console.error('❌ Erreur connexion:', error);
      toast.error('Impossible de démarrer la conversation');
      cleanup();
    }
  }, [cleanup, onTranscription, onBotResponse]);

  // Fonction pour démarrer le streaming audio
  const startAudioStreaming = (ws: WebSocket, stream: MediaStream) => {
    try {
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          // Convertir en PCM 16-bit
          const pcm16 = float32ToPCM16(inputData);
          
          // Convertir en base64 pour l'envoi
          const base64Audio = arrayBufferToBase64(pcm16);
          
          // Envoyer comme message JSON selon le format ElevenLabs
          ws.send(JSON.stringify({
            type: 'audio',
            audio: base64Audio
          }));
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
      console.log('🎙️ Streaming audio démarré');
    } catch (error) {
      console.error('❌ Erreur streaming audio:', error);
    }
  };

  // Convertir ArrayBuffer en base64
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // Convertir Float32 en PCM16
  const float32ToPCM16 = (float32Array: Float32Array): ArrayBuffer => {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    let offset = 0;
    for (let i = 0; i < float32Array.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer;
  };

  // Convertir base64 en Blob
  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  };

  // Jouer un blob audio
  const playAudioBlob = async (blob: Blob) => {
    try {
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audio.play();
      audio.onended = () => URL.revokeObjectURL(audioUrl);
    } catch (error) {
      console.error('❌ Erreur lecture audio:', error);
    }
  };

  // Gérer l'activation/désactivation
  useEffect(() => {
    if (isEnabled) {
      cleanupRef.current = false;
      connectToAgent();
    } else {
      cleanupRef.current = true;
      cleanup();
    }

    return () => {
      cleanupRef.current = true;
      cleanup();
    };
  }, [isEnabled, connectToAgent, cleanup]);

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={onToggle}
        variant={isEnabled ? "default" : "outline"}
        size="sm"
        className={isEnabled ? "bg-gradient-to-r from-purple-600 to-pink-600" : ""}
        disabled={status === 'connecting'}
      >
        {isEnabled ? (
          <>
            <Mic className="w-4 h-4 mr-2 animate-pulse" />
            Mode Vocal Actif
          </>
        ) : (
          <>
            <MicOff className="w-4 h-4 mr-2" />
            Activer Mode Vocal
          </>
        )}
      </Button>
      
      {isEnabled && (
        <div className="flex items-center gap-2">
          {status === 'connecting' && (
            <Badge variant="secondary" className="bg-yellow-500 text-white">
              <AlertCircle className="w-3 h-3 mr-1 animate-spin" />
              Connexion...
            </Badge>
          )}
          {status === 'connected' && (
            <Badge variant="secondary" className="bg-green-500 text-white">
              <Volume2 className="w-3 h-3 mr-1 animate-pulse" />
              Connecté
            </Badge>
          )}
          {status === 'error' && (
            <Badge variant="secondary" className="bg-red-500 text-white">
              ❌ Erreur
            </Badge>
          )}
          
          {conversationId && conversationId !== 'active' && (
            <span className="text-xs text-gray-500">
              ID: {conversationId.slice(0, 8)}...
            </span>
          )}
        </div>
      )}
    </div>
  );
}