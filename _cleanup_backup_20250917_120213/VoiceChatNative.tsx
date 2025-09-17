import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff } from 'lucide-react';
import { useConversation } from '@elevenlabs/react';
import { toast } from 'sonner';

interface VoiceChatNativeProps {
  onTranscription: (text: string) => void;
  botResponse?: string;
  isEnabled: boolean;
  onToggle: () => void;
}

// Configuration ElevenLabs
const AGENT_ID = 'LLY04gPoMKmXkJLEKPBm'; // Agent ID par défaut ElevenLabs (Agent public de test)

export function VoiceChatNative({ 
  onTranscription, 
  botResponse, 
  isEnabled, 
  onToggle 
}: VoiceChatNativeProps) {
  const [sessionStarted, setSessionStarted] = useState(false);
  
  // Utiliser le hook natif ElevenLabs
  const conversation = useConversation({
    onMessage: (message) => {
      console.log('📨 Message ElevenLabs:', message);
      
      // Capturer les transcriptions utilisateur
      if (message.type === 'user_transcript' && message.message?.role === 'user') {
        if (message.isFinal) {
          console.log('🎤 Utilisateur dit:', message.message.content);
          onTranscription(message.message.content);
        }
      }
    },
    onError: (error) => {
      console.error('❌ Erreur ElevenLabs:', error);
      toast.error('Erreur de conversation');
    },
    onConnect: () => {
      console.log('✅ Connecté à ElevenLabs');
      setSessionStarted(true);
    },
    onDisconnect: () => {
      console.log('🔌 Déconnecté de ElevenLabs');
      setSessionStarted(false);
    }
  });

  // Démarrer/arrêter la session
  useEffect(() => {
    const manageSession = async () => {
      if (isEnabled && !sessionStarted) {
        try {
          // Demander la permission du microphone
          await navigator.mediaDevices.getUserMedia({ audio: true });
          
          // Démarrer la session avec l'agent public
          const conversationId = await conversation.startSession({
            agentId: AGENT_ID,
            connectionType: 'websocket'
          });
          
          console.log('🚀 Session démarrée:', conversationId);
        } catch (error) {
          console.error('Erreur démarrage:', error);
          toast.error('Impossible de démarrer la conversation');
          onToggle();
        }
      } else if (!isEnabled && sessionStarted) {
        await conversation.endSession();
        console.log('🛑 Session terminée');
      }
    };

    manageSession();
  }, [isEnabled]);

  // Envoyer les réponses du bot comme contexte
  useEffect(() => {
    if (botResponse && sessionStarted) {
      // Envoyer la réponse du système comme mise à jour contextuelle
      conversation.sendContextualUpdate(
        `Le test a répondu: "${botResponse}". Continue la conversation en tenant compte de cette information.`
      );
    }
  }, [botResponse, sessionStarted]);

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
            <Mic className="w-4 h-4 mr-2 animate-pulse" />
            Conversation Active
          </>
        ) : (
          <>
            <MicOff className="w-4 h-4 mr-2" />
            Activer Conversation
          </>
        )}
      </Button>
      
      {isEnabled && (
        <div className="flex items-center gap-2">
          {conversation.status === 'connected' ? (
            conversation.isSpeaking ? (
              <Badge variant="secondary" className="bg-purple-500 text-white">
                🔊 Agent parle
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-green-500 text-white">
                🎤 Écoute
              </Badge>
            )
          ) : (
            <Badge variant="outline">
              ⏳ Connexion...
            </Badge>
          )}
          
          <Badge variant="outline" className="text-xs">
            🎭 ElevenLabs Native
          </Badge>
        </div>
      )}
    </div>
  );
}