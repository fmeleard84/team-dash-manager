import { useEffect, useRef, useState } from 'react';
import { useConversation } from '@elevenlabs/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Volume2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

// Configuration ElevenLabs
const AGENT_ID = 'agent_01jz2etphrffp8j288md6wcbxh';
const ELEVENLABS_API_KEY = 'sk_78684f6ed063bb3803838d5ce932e5c38d0a308e542381ac';

interface VoiceChatElevenLabsSDKProps {
  onTranscription?: (text: string) => void;
  onBotResponse?: (text: string) => void;
  isEnabled: boolean;
  onToggle: () => void;
  context?: any;
}

export function VoiceChatElevenLabsSDK({ 
  onTranscription, 
  onBotResponse,
  isEnabled, 
  onToggle,
  context
}: VoiceChatElevenLabsSDKProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const hasStartedRef = useRef(false);

  // Utiliser le hook useConversation avec les callbacks selon la doc officielle
  const conversation = useConversation({
    onConnect: () => {
      console.log('✅ Connexion établie avec ElevenLabs');
      toast.success('Connexion vocale établie');
      setIsConnecting(false);
    },
    onDisconnect: () => {
      console.log('❌ Déconnexion de ElevenLabs');
      hasStartedRef.current = false;
      setConversationId(null);
    },
    onMessage: (message) => {
      console.log('📨 Message reçu:', message);
      
      // Traiter les messages selon les types documentés
      if (message.message && message.source === 'user') {
        // Transcription de l'utilisateur
        console.log('🎤 Utilisateur:', message.message);
        if (onTranscription) {
          onTranscription(message.message);
        }
      } else if (message.message && message.source === 'ai') {
        // Réponse de l'agent
        console.log('🤖 Agent:', message.message);
        if (onBotResponse) {
          onBotResponse(message.message);
        }
      }
    },
    onError: (error) => {
      console.error('❌ Erreur ElevenLabs:', error);
      toast.error(`Erreur: ${error.message || 'Erreur inconnue'}`);
      setIsConnecting(false);
    }
  });

  useEffect(() => {
    const startConversation = async () => {
      if (!isEnabled || hasStartedRef.current || conversation.status === 'connected') {
        return;
      }

      hasStartedRef.current = true;
      setIsConnecting(true);

      try {
        // 1. Demander l'accès au microphone (requis selon la doc)
        console.log('🎤 Demande d\'accès au microphone...');
        await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('✅ Microphone autorisé');

        // 2. Essayer d'abord en mode public (plus simple)
        console.log('🔄 Tentative de connexion directe à l\'agent...');
        
        // Démarrer directement avec l'agent ID (mode public)
        const convId = await conversation.startSession({
          agentId: AGENT_ID,
          connectionType: 'websocket', // Revenir à websocket
          user_id: context?.userId
        });

        console.log('🚀 Conversation démarrée avec ID:', convId);
        setConversationId(convId);

      } catch (error) {
        console.error('❌ Erreur démarrage:', error);
        toast.error('Impossible de démarrer la conversation');
        hasStartedRef.current = false;
        setIsConnecting(false);
        
        // Désactiver le mode vocal en cas d'erreur
        if (isEnabled) {
          onToggle();
        }
      }
    };

    const stopConversation = async () => {
      if (conversation.status === 'connected') {
        try {
          await conversation.endSession();
          console.log('🛑 Session terminée');
        } catch (error) {
          console.error('❌ Erreur lors de l\'arrêt:', error);
        }
      }
      hasStartedRef.current = false;
      setConversationId(null);
    };

    if (isEnabled) {
      startConversation();
    } else {
      stopConversation();
    }

    // Cleanup
    return () => {
      if (!isEnabled && conversation.status === 'connected') {
        conversation.endSession().catch(console.error);
      }
    };
  }, [isEnabled]);

  // Fonction pour ajuster le volume si nécessaire
  const setVolume = async (volume: number) => {
    if (conversation.status === 'connected') {
      await conversation.setVolume({ volume });
    }
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
          
          {conversationId && (
            <span className="text-xs text-gray-500">
              ID: {conversationId.slice(0, 8)}...
            </span>
          )}
        </div>
      )}
    </div>
  );
}