import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface RealtimeVoiceChatProps {
  candidateInfo?: {
    firstName: string;
    lastName: string;
    jobTitle: string;
    seniority: string;
  };
  onMessage?: (message: { role: string; content: string }) => void;
  currentQuestion?: number;
  testStarted?: boolean;
}

export default function RealtimeVoiceChat({ 
  candidateInfo, 
  onMessage,
  currentQuestion = 0,
  testStarted = false
}: RealtimeVoiceChatProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  // Connexion à l'API Realtime
  const connectToRealtime = async () => {
    setIsConnecting(true);
    
    try {
      // Obtenir les infos de session depuis notre edge function
      const response = await supabase.functions.invoke('realtime-voice', {
        body: {
          action: 'create_session',
          sessionConfig: {
            instructions: candidateInfo ? 
              `Tu es un évaluateur pour Ialla. Tu évalues ${candidateInfo.firstName} ${candidateInfo.lastName} 
               pour le poste de ${candidateInfo.jobTitle} niveau ${candidateInfo.seniority}.
               Pose 10 questions adaptées pour évaluer ses compétences.
               Sois professionnel mais amical, tutoie le candidat.
               Question actuelle: ${currentQuestion}/10` :
              "Tu es un assistant vocal. Sois amical et professionnel."
          }
        }
      });

      if (!response.data?.session) {
        throw new Error('Impossible de créer la session');
      }

      const { url, headers, config } = response.data.session;
      
      // Créer la connexion WebSocket
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ Connecté à OpenAI Realtime');
        setIsConnected(true);
        setIsConnecting(false);
        
        // Configurer la session
        ws.send(JSON.stringify({
          type: 'session.update',
          session: config
        }));
        
        // Démarrer la capture audio
        startAudioCapture(ws);
        
        toast.success('Mode vocal temps réel activé !');
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log('📨 Message reçu:', message.type);
        
        switch (message.type) {
          case 'response.audio.delta':
            // Jouer l'audio en streaming
            playAudioChunk(message.delta);
            setIsSpeaking(true);
            setIsListening(false);
            break;
            
          case 'response.audio.done':
            setIsSpeaking(false);
            setIsListening(true);
            break;
            
          case 'response.text.delta':
            // Afficher le texte progressivement
            if (onMessage && message.delta) {
              onMessage({
                role: 'assistant',
                content: message.delta
              });
            }
            break;
            
          case 'input_audio_buffer.speech_started':
            console.log('🎙️ Parole détectée');
            setIsListening(true);
            setIsSpeaking(false);
            break;
            
          case 'input_audio_buffer.speech_stopped':
            console.log('🔇 Fin de parole');
            setIsListening(false);
            break;
            
          case 'error':
            console.error('❌ Erreur:', message.error);
            toast.error(message.error.message || 'Erreur de connexion');
            break;
        }
      };

      ws.onerror = (error) => {
        console.error('❌ Erreur WebSocket:', error);
        toast.error('Erreur de connexion');
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log('🔌 Connexion fermée');
        setIsConnected(false);
        stopAudioCapture();
      };

    } catch (error) {
      console.error('Erreur connexion:', error);
      toast.error('Impossible de se connecter au mode vocal temps réel');
      setIsConnecting(false);
    }
  };

  // Capturer et envoyer l'audio du micro
  const startAudioCapture = async (ws: WebSocket) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      mediaStreamRef.current = stream;
      
      const audioContext = new AudioContext({ sampleRate: 24000 });
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;
      
      const processor = audioContext.createScriptProcessor(2048, 1, 1);
      processorRef.current = processor;
      
      processor.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN && !isSpeaking) {
          const inputData = e.inputBuffer.getChannelData(0);
          
          // Convertir en base64
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            pcm16[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
          }
          
          const base64 = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));
          
          // Envoyer l'audio au serveur
          ws.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: base64
          }));
        }
      };
      
      source.connect(processor);
      processor.connect(audioContext.destination);
      
    } catch (error) {
      console.error('Erreur capture audio:', error);
      toast.error('Impossible d\'accéder au microphone');
    }
  };

  // Arrêter la capture audio
  const stopAudioCapture = () => {
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
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
  };

  // Jouer un chunk audio
  const playAudioChunk = (base64Audio: string) => {
    if (!audioContextRef.current) return;
    
    try {
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      audioContextRef.current.decodeAudioData(bytes.buffer, (audioBuffer) => {
        const source = audioContextRef.current!.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current!.destination);
        source.start();
      });
    } catch (error) {
      console.error('Erreur lecture audio:', error);
    }
  };

  // Déconnexion
  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    stopAudioCapture();
    setIsConnected(false);
    toast.info('Mode vocal temps réel désactivé');
  };

  // Nettoyage à la destruction du composant
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={isConnected ? disconnect : connectToRealtime}
        variant={isConnected ? "default" : "outline"}
        size="sm"
        disabled={isConnecting}
        className={isConnected ? "bg-gradient-to-r from-purple-600 to-pink-600" : ""}
      >
        {isConnecting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Connexion...
          </>
        ) : isConnected ? (
          <>
            <Mic className="w-4 h-4 mr-2 animate-pulse" />
            Realtime Actif
          </>
        ) : (
          <>
            <MicOff className="w-4 h-4 mr-2" />
            Activer Realtime
          </>
        )}
      </Button>
      
      {isConnected && (
        <div className="flex items-center gap-2">
          <Badge 
            variant="secondary" 
            className={`transition-all ${
              isSpeaking 
                ? "bg-purple-500 text-white" 
                : isListening 
                  ? "bg-red-500 text-white animate-pulse" 
                  : "bg-green-500 text-white"
            }`}
          >
            {isSpeaking ? "IA parle" : isListening ? "Vous parlez" : "En attente"}
          </Badge>
          
          <Badge variant="outline" className="text-xs">
            Temps réel ⚡
          </Badge>
        </div>
      )}
    </div>
  );
}