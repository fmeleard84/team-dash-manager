import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { toast } from 'sonner';

// Configuration ElevenLabs
const AGENT_ID = 'agent_01jz2etphrffp8j288md6wcbxh';
const ELEVENLABS_API_KEY = 'sk_78684f6ed063bb3803838d5ce932e5c38d0a308e542381ac';

interface VoiceChatElevenLabsSimpleProps {
  onTranscription?: (text: string) => void;
  onBotResponse?: (text: string) => void;
  isEnabled: boolean;
  onToggle: () => void;
}

export function VoiceChatElevenLabsSimple({ 
  onTranscription, 
  onBotResponse,
  isEnabled, 
  onToggle
}: VoiceChatElevenLabsSimpleProps) {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    if (!isEnabled) {
      if (ws) {
        ws.close();
        setWs(null);
      }
      setStatus('idle');
      return;
    }

    const connectToAgent = async () => {
      try {
        setStatus('connecting');
        
        // Obtenir l'URL signée
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
          throw new Error('Impossible d\'obtenir l\'URL signée');
        }

        const data = await response.json();
        console.log('✅ URL signée obtenue');

        // Créer la connexion WebSocket
        const websocket = new WebSocket(data.signed_url);
        
        websocket.onopen = () => {
          console.log('✅ WebSocket connecté');
          setStatus('connected');
          toast.success('Connexion vocale établie');
          
          // Envoyer un message d'initialisation
          websocket.send(JSON.stringify({
            type: 'init',
            config: {
              language: 'fr',
              voice: 'default'
            }
          }));
        };

        websocket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log('📨 Message:', message);
            
            if (message.type === 'user_transcript' && onTranscription) {
              onTranscription(message.text);
            } else if (message.type === 'agent_response' && onBotResponse) {
              onBotResponse(message.text);
            }
          } catch (e) {
            console.log('Message brut:', event.data);
          }
        };

        websocket.onerror = (error) => {
          console.error('❌ Erreur WebSocket:', error);
          setStatus('error');
        };

        websocket.onclose = () => {
          console.log('🔌 WebSocket fermé');
          setStatus('idle');
        };

        setWs(websocket);
      } catch (error) {
        console.error('❌ Erreur connexion:', error);
        toast.error('Erreur de connexion');
        setStatus('error');
      }
    };

    // Demander l'accès au microphone d'abord
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => {
        console.log('🎤 Microphone OK');
        connectToAgent();
      })
      .catch((error) => {
        console.error('❌ Erreur microphone:', error);
        toast.error('Accès au microphone refusé');
        onToggle();
      });

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [isEnabled]);

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
        <Badge 
          variant="secondary" 
          className={
            status === 'connecting' ? 'bg-yellow-500 text-white' :
            status === 'connected' ? 'bg-green-500 text-white' :
            status === 'error' ? 'bg-red-500 text-white' :
            ''
          }
        >
          {status === 'connecting' && '⏳ Connexion...'}
          {status === 'connected' && (
            <>
              <Volume2 className="w-3 h-3 mr-1 animate-pulse" />
              Connecté
            </>
          )}
          {status === 'error' && '❌ Erreur'}
        </Badge>
      )}
    </div>
  );
}