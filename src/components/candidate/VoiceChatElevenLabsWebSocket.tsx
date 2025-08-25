import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Volume2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

// Configuration ElevenLabs
const AGENT_ID = 'agent_01jz2etphrffp8j288md6wcbxh';
const ELEVENLABS_API_KEY = 'sk_78684f6ed063bb3803838d5ce932e5c38d0a308e542381ac';

interface VoiceChatElevenLabsWebSocketProps {
  onTranscription?: (text: string) => void;
  onBotResponse?: (text: string) => void;
  isEnabled: boolean;
  onToggle: () => void;
}

// Variables globales pour éviter les connexions multiples
let globalWs: WebSocket | null = null;
let globalIsConnecting = false;

export function VoiceChatElevenLabsWebSocket({ 
  onTranscription, 
  onBotResponse,
  isEnabled, 
  onToggle
}: VoiceChatElevenLabsWebSocketProps) {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<Blob[]>([]);
  const isPlayingRef = useRef(false);

  // Nettoyer les ressources
  const cleanup = useCallback(() => {
    console.log('🧹 Nettoyage...');
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (globalWs && globalWs.readyState === WebSocket.OPEN) {
      globalWs.close();
      globalWs = null;
    }

    globalIsConnecting = false;
    setStatus('idle');
  }, []);

  // Jouer la file d'attente audio
  const playAudioQueue = async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    
    isPlayingRef.current = true;
    const blob = audioQueueRef.current.shift()!;
    
    try {
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        isPlayingRef.current = false;
        // Jouer le prochain audio dans la file
        if (audioQueueRef.current.length > 0) {
          playAudioQueue();
        }
      };
      
      await audio.play();
    } catch (error) {
      console.error('❌ Erreur lecture audio:', error);
      isPlayingRef.current = false;
    }
  };

  const startConversation = useCallback(async () => {
    if (globalIsConnecting || globalWs?.readyState === WebSocket.OPEN) {
      console.log('⚠️ Déjà connecté ou en cours');
      return;
    }

    globalIsConnecting = true;
    setStatus('connecting');

    try {
      // 1. Obtenir l'URL signée de l'API ElevenLabs
      console.log('🔐 Obtention URL signée...');
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
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ URL obtenue');

      // 2. Créer la connexion WebSocket
      const ws = new WebSocket(data.signed_url);
      globalWs = ws;
      ws.binaryType = 'arraybuffer'; // Important pour recevoir l'audio

      // 3. Gérer les événements WebSocket
      ws.onopen = async () => {
        console.log('✅ WebSocket connecté');
        setStatus('connected');
        toast.success('Connexion établie');

        // Démarrer l'enregistrement audio
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              channelCount: 1,
              sampleRate: 16000,
              echoCancellation: true,
              noiseSuppression: true
            } 
          });

          // Utiliser MediaRecorder pour capturer l'audio
          const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus'
          });
          mediaRecorderRef.current = mediaRecorder;

          // Envoyer les chunks audio au fur et à mesure
          mediaRecorder.ondataavailable = async (event) => {
            if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
              // Convertir le blob en ArrayBuffer pour l'envoi
              const arrayBuffer = await event.data.arrayBuffer();
              
              // Créer un AudioContext pour convertir en PCM16
              if (!audioContextRef.current) {
                audioContextRef.current = new AudioContext({ sampleRate: 16000 });
              }
              
              try {
                // Décoder l'audio
                const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
                const pcm16 = convertToPCM16(audioBuffer);
                
                // Envoyer le PCM16 directement (pas de JSON)
                ws.send(pcm16);
              } catch (e) {
                console.log('Conversion audio:', e);
              }
            }
          };

          // Démarrer l'enregistrement avec des intervalles courts
          mediaRecorder.start(100); // Envoyer toutes les 100ms
          console.log('🎤 Enregistrement démarré');

        } catch (error) {
          console.error('❌ Erreur microphone:', error);
          toast.error('Accès microphone refusé');
        }
      };

      ws.onmessage = (event) => {
        // Gérer les données binaires (audio) et JSON (texte)
        if (event.data instanceof ArrayBuffer) {
          // C'est de l'audio
          console.log('🔊 Audio reçu:', event.data.byteLength, 'bytes');
          
          // Convertir ArrayBuffer en Blob audio
          const audioBlob = new Blob([event.data], { type: 'audio/mpeg' });
          audioQueueRef.current.push(audioBlob);
          playAudioQueue();
          
        } else {
          // C'est du JSON
          try {
            const message = JSON.parse(event.data);
            console.log('📨 Message:', message.type);
            
            switch(message.type) {
              case 'conversation_initiation_metadata':
                console.log('🎯 Conversation initiée');
                break;
                
              case 'user_transcript':
                if (message.user_transcript && onTranscription) {
                  console.log('🎤 Vous:', message.user_transcript);
                  onTranscription(message.user_transcript);
                }
                break;
                
              case 'agent_response':
                if (message.agent_response && onBotResponse) {
                  console.log('🤖 Agent:', message.agent_response);
                  onBotResponse(message.agent_response);
                }
                break;
                
              case 'audio':
                // Audio en base64 dans le message
                if (message.audio_event?.audio_base_64) {
                  const audioData = atob(message.audio_event.audio_base_64);
                  const audioArray = new Uint8Array(audioData.length);
                  for (let i = 0; i < audioData.length; i++) {
                    audioArray[i] = audioData.charCodeAt(i);
                  }
                  const audioBlob = new Blob([audioArray], { type: 'audio/mpeg' });
                  audioQueueRef.current.push(audioBlob);
                  playAudioQueue();
                }
                break;
            }
          } catch (e) {
            console.log('Message non-JSON reçu');
          }
        }
      };

      ws.onerror = (error) => {
        console.error('❌ Erreur WebSocket:', error);
        setStatus('error');
        toast.error('Erreur connexion');
      };

      ws.onclose = (event) => {
        console.log('🔌 Fermé:', event.code, event.reason);
        cleanup();
      };

    } catch (error) {
      console.error('❌ Erreur:', error);
      toast.error('Échec connexion');
      cleanup();
    }
  }, [cleanup, onTranscription, onBotResponse]);

  // Convertir AudioBuffer en PCM16
  const convertToPCM16 = (audioBuffer: AudioBuffer): ArrayBuffer => {
    const length = audioBuffer.length;
    const arrayBuffer = new ArrayBuffer(length * 2);
    const view = new DataView(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);
    
    let offset = 0;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
    
    return arrayBuffer;
  };

  // Gérer l'activation/désactivation
  useEffect(() => {
    if (isEnabled) {
      startConversation();
    } else {
      cleanup();
    }

    return () => {
      if (!isEnabled) cleanup();
    };
  }, [isEnabled, startConversation, cleanup]);

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
              Connecté - Parlez
            </Badge>
          )}
          {status === 'error' && (
            <Badge variant="secondary" className="bg-red-500 text-white">
              ❌ Erreur
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}