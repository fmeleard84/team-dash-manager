import { useEffect, useState } from 'react';
import { useConversation } from '@elevenlabs/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Volume2, VolumeX, Mic, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Configuration ElevenLabs
const AGENT_ID = 'agent_01jz2etphrffp8j288md6wcbxh';

interface VoiceChatSimpleProps {
  isEnabled: boolean;
  onToggle: () => void;
  onUserMessage?: (text: string) => void;
  onAgentMessage?: (text: string) => void;
}

export function VoiceChatSimple({ 
  isEnabled, 
  onToggle,
  onUserMessage,
  onAgentMessage
}: VoiceChatSimpleProps) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  
  // Utiliser le hook officiel ElevenLabs
  const conversation = useConversation({
    onConnect: () => {
      console.log('✅ Conversation connectée');
      toast.success('Connexion établie');
    },
    onDisconnect: () => {
      console.log('🔌 Conversation déconnectée');
      setConversationId(null);
    },
    onMessage: (message) => {
      console.log('📨 Message reçu:', message);
      
      // Gérer les messages selon le format observé dans les logs
      if (message.source === 'user' && message.message) {
        console.log('🎤 Vous:', message.message);
        if (onUserMessage) onUserMessage(message.message);
      } else if (message.source === 'ai' && message.message) {
        console.log('🤖 Agent:', message.message);
        if (onAgentMessage) onAgentMessage(message.message);
      } 
      // Autres formats possibles
      else if (message.type === 'user_transcript' && message.text) {
        console.log('🎤 Vous (alt):', message.text);
        if (onUserMessage) onUserMessage(message.text);
      } else if (message.type === 'agent_response' && message.text) {
        console.log('🤖 Agent (alt):', message.text);
        if (onAgentMessage) onAgentMessage(message.text);
      }
    },
    onError: (error) => {
      console.error('❌ Erreur conversation:', error);
      toast.error('Erreur de conversation');
    }
  });

  // Démarrer/arrêter la conversation
  useEffect(() => {
    const startConversation = async () => {
      try {
        // Demander l'accès au microphone
        await navigator.mediaDevices.getUserMedia({ audio: true });
        
        console.log('🔐 Démarrage directe avec l\'agent:', AGENT_ID);
        
        // Utiliser directement l'agent ID comme quand ça a marché
        const id = await conversation.startSession({
          agentId: AGENT_ID,
          connectionType: 'websocket'
        });
        
        console.log('✅ Conversation démarrée avec ID:', id);
        setConversationId(id);
      } catch (error) {
        console.error('❌ Erreur démarrage conversation:', error);
        toast.error('Impossible de démarrer la conversation');
      }
    };

    if (isEnabled) {
      startConversation();
    } else if (conversation.status === 'connected') {
      // Arrêter la conversation
      conversation.endSession();
      setConversationId(null);
    }

    // Nettoyer à la destruction
    return () => {
      if (conversation.status === 'connected') {
        conversation.endSession();
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
          {conversation.status === 'connected' ? (
            <Badge variant="secondary" className="bg-green-500 text-white animate-pulse">
              <Mic className="w-3 h-3 mr-1" />
              {conversation.isSpeaking ? 'Agent parle...' : 'À votre tour'}
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-yellow-500 text-white">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Connexion...
            </Badge>
          )}
          
          {conversationId && (
            <Badge variant="outline" className="text-xs">
              ID: {conversationId.slice(0, 8)}...
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}