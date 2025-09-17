import { useEffect, useRef, useState } from 'react';
import { useConversation } from '@elevenlabs/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Volume2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

// Agent ID pour le test de compétences
const AGENT_ID = 'Gw0xrdKQW9RMJSjYA8dJ'; // Remplacez par votre agent ID

interface VoiceChatElevenLabsProperProps {
  onTranscription?: (text: string) => void;
  onBotResponse?: (text: string) => void;
  isEnabled: boolean;
  onToggle: () => void;
  context?: any; // Context pour l'agent (profil candidat, etc.)
}

export function VoiceChatElevenLabsProper({ 
  onTranscription, 
  onBotResponse,
  isEnabled, 
  onToggle,
  context
}: VoiceChatElevenLabsProperProps) {
  const conversation = useConversation({
    onConnect: () => {
      console.log('✅ Connexion établie avec ElevenLabs');
      toast.success('Connexion vocale établie');
    },
    onDisconnect: () => {
      console.log('❌ Déconnexion de ElevenLabs');
    },
    onMessage: (message) => {
      console.log('📨 Message reçu:', message);
      
      // Traiter les différents types de messages
      if (message.type === 'user_transcript') {
        // Transcription de l'utilisateur
        if (message.text && onTranscription) {
          console.log('🎤 Transcription utilisateur:', message.text);
          onTranscription(message.text);
        }
      } else if (message.type === 'agent_response') {
        // Réponse de l'agent
        if (message.text && onBotResponse) {
          console.log('🤖 Réponse agent:', message.text);
          onBotResponse(message.text);
        }
      } else if (message.type === 'audio') {
        // L'audio est géré automatiquement par le SDK
        console.log('🔊 Audio reçu et joué automatiquement');
      }
    },
    onError: (error) => {
      console.error('❌ Erreur ElevenLabs:', error);
      toast.error(`Erreur de connexion: ${error.message || 'Erreur inconnue'}`);
    }
  });

  const hasStartedRef = useRef(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Gérer l'activation/désactivation
  useEffect(() => {
    const startConversation = async () => {
      if (!isEnabled || hasStartedRef.current || isConnecting) return;
      
      setIsConnecting(true);
      hasStartedRef.current = true;

      try {
        // Demander l'accès au microphone
        await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('🎤 Accès microphone accordé');

        // Démarrer la conversation avec l'agent
        const id = await conversation.startSession({
          agentId: AGENT_ID,
          connectionType: 'webrtc', // Utiliser WebRTC pour une meilleure latence
          user_id: context?.userId // Optionnel: ID de l'utilisateur
        });

        console.log('🚀 Conversation démarrée, ID:', id);
        setConversationId(id);
        setIsConnecting(false);
      } catch (error) {
        console.error('❌ Erreur démarrage conversation:', error);
        toast.error('Impossible de démarrer la conversation vocale');
        hasStartedRef.current = false;
        setIsConnecting(false);
        onToggle(); // Désactiver si erreur
      }
    };

    const stopConversation = async () => {
      if (!hasStartedRef.current) return;

      try {
        await conversation.endSession();
        console.log('🛑 Conversation terminée');
        setConversationId(null);
        hasStartedRef.current = false;
      } catch (error) {
        console.error('❌ Erreur arrêt conversation:', error);
      }
    };

    if (isEnabled) {
      startConversation();
    } else {
      stopConversation();
    }

    // Cleanup
    return () => {
      if (hasStartedRef.current) {
        conversation.endSession().catch(console.error);
      }
    };
  }, [isEnabled, conversation, onToggle, context]);

  // Ajuster le volume (optionnel)
  const handleVolumeChange = (volume: number) => {
    conversation.setVolume({ volume });
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={onToggle}
        variant={isEnabled ? "default" : "outline"}
        size="sm"
        className={isEnabled ? "bg-gradient-to-r from-purple-600 to-pink-600" : ""}
        disabled={isConnecting}
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
          {isConnecting ? (
            <Badge variant="secondary" className="bg-yellow-500 text-white">
              <AlertCircle className="w-3 h-3 mr-1 animate-spin" />
              Connexion...
            </Badge>
          ) : conversation.status === 'connected' ? (
            <>
              {conversation.isSpeaking ? (
                <Badge variant="secondary" className="bg-purple-500 text-white">
                  <Volume2 className="w-3 h-3 mr-1 animate-pulse" />
                  IA parle
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-green-500 text-white">
                  <Mic className="w-3 h-3 mr-1 animate-pulse" />
                  Écoute active
                </Badge>
              )}
            </>
          ) : (
            <Badge variant="outline">
              ⏸️ Déconnecté
            </Badge>
          )}
          
          {/* Contrôle du volume (optionnel) */}
          {conversation.status === 'connected' && (
            <div className="flex items-center gap-1">
              <Volume2 className="w-3 h-3 text-gray-500" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                defaultValue="0.8"
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-20 h-1"
              />
            </div>
          )}
        </div>
      )}
      
      {conversationId && (
        <Badge variant="outline" className="text-xs">
          ID: {conversationId.substring(0, 8)}...
        </Badge>
      )}
    </div>
  );
}