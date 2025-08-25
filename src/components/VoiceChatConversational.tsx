import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Volume2, Send } from 'lucide-react';
import { useConversation } from '@elevenlabs/react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

interface VoiceChatConversationalProps {
  onTranscription: (text: string) => void;
  botResponse?: string;
  isEnabled: boolean;
  onToggle: () => void;
}

// Agent ID pour la conversation ElevenLabs
const AGENT_ID = 'your-agent-id'; // À remplacer par votre agent ID

export function VoiceChatConversational({ 
  onTranscription, 
  botResponse, 
  isEnabled, 
  onToggle 
}: VoiceChatConversationalProps) {
  const [textInput, setTextInput] = useState('');
  const [conversationStarted, setConversationStarted] = useState(false);
  const hasProcessedMessageRef = useRef<Set<string>>(new Set());
  
  const conversation = useConversation({
    onMessage: (message) => {
      console.log('📨 Message reçu:', message);
      
      // Traiter les transcriptions de l'utilisateur
      if (message.type === 'user_transcript' && message.final) {
        const messageId = `${message.type}_${Date.now()}`;
        if (!hasProcessedMessageRef.current.has(messageId)) {
          hasProcessedMessageRef.current.add(messageId);
          console.log('🎤 Transcription utilisateur:', message.text);
          onTranscription(message.text);
        }
      }
      
      // Traiter les réponses de l'agent
      if (message.type === 'agent_response' && message.final) {
        console.log('🤖 Réponse agent:', message.text);
        // Les réponses sont déjà lues par ElevenLabs
      }
    },
    onError: (error) => {
      console.error('❌ Erreur conversation:', error);
      toast.error('Erreur dans la conversation');
    },
    onConnect: () => {
      console.log('✅ Connecté à ElevenLabs');
      setConversationStarted(true);
    },
    onDisconnect: () => {
      console.log('🔌 Déconnecté');
      setConversationStarted(false);
    }
  });

  const { 
    status, 
    isSpeaking, 
    sendUserMessage,
    sendUserActivity,
    setVolume,
    muteMic
  } = conversation;

  // Démarrer/arrêter la conversation
  useEffect(() => {
    const startConversation = async () => {
      if (isEnabled && !conversationStarted) {
        try {
          // Demander l'accès au microphone
          await navigator.mediaDevices.getUserMedia({ audio: true });
          
          // Pour un agent public (sans authentification)
          await conversation.startSession({
            agentId: AGENT_ID,
            connectionType: 'websocket'
          });
          
          console.log('🚀 Conversation démarrée');
        } catch (error) {
          console.error('Erreur démarrage conversation:', error);
          toast.error('Impossible de démarrer la conversation');
          onToggle();
        }
      } else if (!isEnabled && conversationStarted) {
        await conversation.endSession();
        console.log('🛑 Conversation terminée');
      }
    };

    startConversation();
    
    return () => {
      if (conversationStarted) {
        conversation.endSession();
      }
    };
  }, [isEnabled]);

  // Envoyer les réponses du bot à l'agent
  useEffect(() => {
    if (botResponse && conversationStarted) {
      // Envoyer le contexte de la réponse du bot à l'agent
      conversation.sendContextualUpdate(
        `Le système a répondu: ${botResponse}. Utilisez cette information pour continuer la conversation.`
      );
    }
  }, [botResponse, conversationStarted]);

  // Gérer l'envoi de messages texte
  const handleSendText = () => {
    if (textInput.trim() && conversationStarted) {
      sendUserMessage(textInput);
      onTranscription(textInput);
      setTextInput('');
    }
  };

  // Gérer le volume
  useEffect(() => {
    setVolume(0.8);
  }, [setVolume]);

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
        <>
          <div className="flex items-center gap-2">
            {status === 'connected' ? (
              isSpeaking ? (
                <Badge variant="secondary" className="bg-purple-500 text-white">
                  <Volume2 className="w-3 h-3 mr-1 animate-pulse" />
                  Agent parle
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-green-500 text-white">
                  ✓ En écoute
                </Badge>
              )
            ) : (
              <Badge variant="outline">
                ⏳ Connexion...
              </Badge>
            )}
            
            <Badge variant="outline" className="text-xs">
              🎭 ElevenLabs Pro
            </Badge>
          </div>
          
          {/* Option de saisie textuelle */}
          <div className="flex items-center gap-2">
            <Input
              value={textInput}
              onChange={(e) => {
                setTextInput(e.target.value);
                sendUserActivity(); // Notifier l'activité
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSendText();
                }
              }}
              placeholder="Ou tapez un message..."
              className="w-48"
              disabled={status !== 'connected'}
            />
            <Button
              onClick={handleSendText}
              size="sm"
              variant="outline"
              disabled={!textInput.trim() || status !== 'connected'}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}