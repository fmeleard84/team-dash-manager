import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Volume2, VolumeX, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

// Configuration ElevenLabs
const AGENT_ID = 'agent_01jz2etphrffp8j288md6wcbxh';
const ELEVENLABS_API_KEY = 'sk_78684f6ed063bb3803838d5ce932e5c38d0a308e542381ac';

interface VoiceChatTextProps {
  isEnabled: boolean;
  onToggle: () => void;
  textToSpeak?: string; // Le texte à faire dire à l'IA
  onBotResponse?: (text: string) => void;
}

export function VoiceChatText({ 
  isEnabled, 
  onToggle,
  textToSpeak,
  onBotResponse
}: VoiceChatTextProps) {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioQueueRef = useRef<Blob[]>([]);
  const isPlayingRef = useRef(false);
  const hasConnectedRef = useRef(false);

  // Jouer l'audio en file d'attente
  const playNextAudio = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    
    isPlayingRef.current = true;
    const blob = audioQueueRef.current.shift()!;
    
    try {
      console.log('🔊 Lecture audio:', blob.size, 'bytes');
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        isPlayingRef.current = false;
        // Jouer le prochain audio
        if (audioQueueRef.current.length > 0) {
          playNextAudio();
        }
      };
      
      await audio.play();
    } catch (error) {
      console.error('❌ Erreur lecture:', error);
      isPlayingRef.current = false;
    }
  }, []);

  // Nettoyer les ressources
  const cleanup = useCallback(() => {
    console.log('🧹 Nettoyage WebSocket...');
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
    wsRef.current = null;
    hasConnectedRef.current = false;
    setStatus('idle');
    setConversationId(null);
    audioQueueRef.current = [];
  }, []);

  // Envoyer un message texte à l'agent
  const sendTextMessage = useCallback((text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.log('⚠️ WebSocket non connecté');
      return;
    }

    console.log('📤 Envoi texte à l\'agent:', text);
    
    // Envoyer le message selon le format ElevenLabs pour du texte
    const message = {
      type: 'user_text_input',
      text: text
    };
    
    wsRef.current.send(JSON.stringify(message));
  }, []);

  // Se connecter à l'agent
  const connectToAgent = useCallback(async () => {
    if (hasConnectedRef.current) {
      console.log('⚠️ Déjà connecté');
      return;
    }

    hasConnectedRef.current = true;
    setStatus('connecting');

    try {
      // 1. Obtenir l'URL signée
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
        const error = await response.text();
        console.error('❌ Erreur API:', error);
        throw new Error(`Erreur API: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ URL signée obtenue');
      setConversationId(data.conversation_id || 'active');

      // 2. Créer la connexion WebSocket
      const ws = new WebSocket(data.signed_url);
      wsRef.current = ws;
      
      // Important: configurer pour recevoir les données binaires
      ws.binaryType = 'arraybuffer';

      // 3. Gérer les événements
      ws.onopen = () => {
        console.log('✅ WebSocket connecté');
        setStatus('connected');
        toast.success('Connexion vocale établie');
        
        // Envoyer le premier message si disponible
        if (textToSpeak) {
          setTimeout(() => {
            sendTextMessage(textToSpeak);
          }, 500);
        }
      };

      ws.onmessage = (event) => {
        // Vérifier si c'est de l'audio binaire
        if (event.data instanceof ArrayBuffer) {
          console.log('🎵 Audio binaire reçu:', event.data.byteLength, 'bytes');
          
          // Créer un blob audio MP3
          const audioBlob = new Blob([event.data], { type: 'audio/mpeg' });
          audioQueueRef.current.push(audioBlob);
          playNextAudio();
          
        } else {
          // C'est un message JSON
          try {
            const message = JSON.parse(event.data);
            console.log('📨 Message:', message.type, message);
            
            switch(message.type) {
              case 'conversation_initiation_metadata':
                console.log('🎯 Métadonnées reçues');
                break;
                
              case 'agent_response':
                if (message.agent_response) {
                  console.log('🤖 Réponse agent (texte):', message.agent_response);
                  if (onBotResponse) {
                    onBotResponse(message.agent_response);
                  }
                }
                break;
                
              case 'audio':
                // Si l'audio vient en base64 dans le JSON
                if (message.audio_event?.audio_base_64) {
                  console.log('🎵 Audio base64 reçu');
                  const audioData = atob(message.audio_event.audio_base_64);
                  const audioArray = new Uint8Array(audioData.length);
                  for (let i = 0; i < audioData.length; i++) {
                    audioArray[i] = audioData.charCodeAt(i);
                  }
                  const audioBlob = new Blob([audioArray], { type: 'audio/mpeg' });
                  audioQueueRef.current.push(audioBlob);
                  playNextAudio();
                }
                break;
                
              case 'ping':
                // Répondre au ping
                ws.send(JSON.stringify({ type: 'pong' }));
                break;
                
              default:
                console.log('📦 Type non géré:', message.type);
            }
          } catch (e) {
            console.log('📄 Message non-JSON, probablement de l\'audio');
          }
        }
      };

      ws.onerror = (error) => {
        console.error('❌ Erreur WebSocket:', error);
        setStatus('error');
        toast.error('Erreur de connexion');
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket fermé:', event.code, event.reason);
        cleanup();
      };

    } catch (error) {
      console.error('❌ Erreur connexion:', error);
      toast.error('Impossible de se connecter');
      cleanup();
    }
  }, [cleanup, textToSpeak, sendTextMessage, playNextAudio, onBotResponse]);

  // Gérer l'activation/désactivation
  useEffect(() => {
    if (isEnabled) {
      connectToAgent();
    } else {
      cleanup();
    }

    return () => {
      if (!isEnabled) {
        cleanup();
      }
    };
  }, [isEnabled, connectToAgent, cleanup]);

  // Envoyer le texte quand il change (si connecté)
  useEffect(() => {
    if (textToSpeak && status === 'connected') {
      sendTextMessage(textToSpeak);
    }
  }, [textToSpeak, status, sendTextMessage]);

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
            <Volume2 className="w-4 h-4 mr-2 animate-pulse" />
            Synthèse Vocale Active
          </>
        ) : (
          <>
            <VolumeX className="w-4 h-4 mr-2" />
            Activer Synthèse Vocale
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
              <Volume2 className="w-3 h-3 mr-1" />
              Prêt à parler
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