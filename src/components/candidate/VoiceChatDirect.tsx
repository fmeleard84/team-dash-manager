import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Volume2, VolumeX, Mic, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Configuration ElevenLabs
const AGENT_ID = 'agent_01jz2etphrffp8j288md6wcbxh';
const API_KEY = 'sk_78684f6ed063bb3803838d5ce932e5c38d0a308e542381ac';

interface VoiceChatDirectProps {
  isEnabled: boolean;
  onToggle: () => void;
  onUserMessage?: (text: string) => void;
  onAgentMessage?: (text: string) => void;
}

export function VoiceChatDirect({ 
  isEnabled, 
  onToggle,
  onUserMessage,
  onAgentMessage
}: VoiceChatDirectProps) {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);

  // Fonction pour jouer l'audio reçu
  const playAudioChunk = useCallback(async (audioData: ArrayBuffer) => {
    if (!audioContextRef.current) return;
    
    try {
      // L'audio est en PCM 24kHz, on le décode
      const audioBuffer = await audioContextRef.current.decodeAudioData(audioData.slice(0));
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      source.onended = () => {
        isPlayingRef.current = false;
        setIsSpeaking(false);
        
        // Jouer le prochain audio dans la queue
        if (audioQueueRef.current.length > 0) {
          const nextAudio = audioQueueRef.current.shift();
          if (nextAudio) playAudioChunk(nextAudio);
        }
      };
      
      isPlayingRef.current = true;
      setIsSpeaking(true);
      source.start();
    } catch (error) {
      console.error('Erreur lecture audio:', error);
      isPlayingRef.current = false;
      setIsSpeaking(false);
    }
  }, []);

  // Fonction pour traiter la queue audio
  const processAudioQueue = useCallback(() => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    
    const audioData = audioQueueRef.current.shift();
    if (audioData) {
      playAudioChunk(audioData);
    }
  }, [playAudioChunk]);

  const connectToAgent = useCallback(async () => {
    try {
      setStatus('connecting');
      console.log('🔐 Connexion à l\'agent ElevenLabs...');

      // 1. Obtenir l'URL signée
      const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${AGENT_ID}`,
        {
          method: 'GET',
          headers: {
            'xi-api-key': API_KEY
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ URL signée obtenue');

      // 2. Demander l'accès au micro
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      streamRef.current = stream;

      // 3. Créer le contexte audio
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      // 4. Créer le WebSocket
      const ws = new WebSocket(data.signed_url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket connecté');
        setStatus('connected');
        toast.success('Connexion établie');

        // Envoyer le message d'initialisation AVEC les variables
        const initMessage = {
          type: 'conversation_initiation_client_data',
          conversation_initiation_client_data: {
            conversation_id: data.conversation_id || crypto.randomUUID()
          },
          // Ajouter les variables directement dans le message d'init
          user_name: 'Candidat',
          agent_name: 'Assistant IA',
          greeting: 'Bonjour ! Je suis votre assistant pour le test de compétences.'
        };
        
        ws.send(JSON.stringify(initMessage));
        console.log('📤 Initialisation avec variables envoyée');
      };

      ws.onmessage = (event) => {
        if (typeof event.data === 'string') {
          try {
            const message = JSON.parse(event.data);
            
            // Gérer différents types de messages
            if (message.type === 'conversation_initiation_metadata') {
              console.log('🎯 Métadonnées:', message.conversation_initiation_metadata_event);
              
              // Démarrer le streaming audio directement
              setTimeout(() => {
                startAudioStreaming();
              }, 100);
            } else if (message.type === 'audio_chunk' || message.type === 'agent_audio_chunk') {
              // Audio en base64
              if (message.audio_chunk || message.agent_audio_chunk) {
                const base64 = message.audio_chunk || message.agent_audio_chunk;
                const binaryString = atob(base64);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }
                audioQueueRef.current.push(bytes.buffer);
                processAudioQueue();
              }
            } else if (message.type === 'user_transcript' && message.text) {
              console.log('🎤 Vous:', message.text);
              if (onUserMessage) onUserMessage(message.text);
            } else if (message.type === 'agent_response' && message.text) {
              console.log('🤖 Agent:', message.text);
              if (onAgentMessage) onAgentMessage(message.text);
            }
          } catch (e) {
            console.log('Message non-JSON:', event.data);
          }
        }
      };

      ws.onerror = (error) => {
        console.error('❌ Erreur WebSocket:', error);
        setStatus('error');
        toast.error('Erreur de connexion');
      };

      // Fonction pour démarrer le streaming audio
      const startAudioStreaming = () => {
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(2048, 1, 1);
        
        sourceRef.current = source;
        processorRef.current = processor;
        
        processor.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN) {
            const inputData = e.inputBuffer.getChannelData(0);
            
            // Convertir en PCM16
            const pcm16 = new ArrayBuffer(inputData.length * 2);
            const view = new DataView(pcm16);
            for (let i = 0; i < inputData.length; i++) {
              const s = Math.max(-1, Math.min(1, inputData[i]));
              view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            }
            
            // Convertir en base64
            const bytes = new Uint8Array(pcm16);
            let binary = '';
            bytes.forEach(byte => binary += String.fromCharCode(byte));
            const base64Audio = btoa(binary);
            
            // Envoyer le chunk audio
            ws.send(JSON.stringify({
              type: 'user_audio_chunk',
              user_audio_chunk: base64Audio
            }));
          }
        };
        
        source.connect(processor);
        processor.connect(audioContext.destination);
        console.log('🎙️ Streaming audio démarré');
      };
      
      ws.onclose = (event) => {
        console.log('🔌 WebSocket fermé:', event.code, event.reason);
        cleanup();
      };

    } catch (error) {
      console.error('❌ Erreur connexion:', error);
      toast.error('Erreur de connexion');
      setStatus('error');
    }
  }, [onUserMessage, onAgentMessage, processAudioQueue]);

  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setStatus('idle');
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    if (isEnabled) {
      connectToAgent();
    } else {
      cleanup();
    }

    return () => cleanup();
  }, [isEnabled, connectToAgent, cleanup]);

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={onToggle}
        variant={isEnabled ? "default" : "outline"}
        size="sm"
        className={isEnabled ? "bg-gradient-to-r from-purple-600 to-pink-600" : ""}
      >
        {isEnabled ? (
          <>
            <Volume2 className="w-4 h-4 mr-2" />
            Conversation Active
          </>
        ) : (
          <>
            <VolumeX className="w-4 h-4 mr-2" />
            Activer Conversation
          </>
        )}
      </Button>
      
      {isEnabled && (
        <div className="flex items-center gap-2">
          {status === 'connecting' && (
            <Badge variant="secondary" className="bg-yellow-500 text-white">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Connexion...
            </Badge>
          )}
          {status === 'connected' && (
            <Badge variant="secondary" className="bg-green-500 text-white animate-pulse">
              <Mic className="w-3 h-3 mr-1" />
              {isSpeaking ? 'Agent parle...' : 'À vous de parler'}
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