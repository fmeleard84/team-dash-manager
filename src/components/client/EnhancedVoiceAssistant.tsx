import { useState, useEffect } from 'react';
import { FullScreenModal } from '@/components/ui/fullscreen-modal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bot,
  Mic,
  MicOff,
  MessageSquare,
  Volume2,
  VolumeX,
  Loader2,
  Send,
  Sparkles,
  Headphones,
  Keyboard,
  X
} from 'lucide-react';
import { useRealtimeAssistant } from '@/ai-assistant/hooks/useRealtimeAssistant';
import { TextChatInterface } from './TextChatInterface';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface EnhancedVoiceAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
}

export const EnhancedVoiceAssistant = ({
  isOpen,
  onClose,
  projectId
}: EnhancedVoiceAssistantProps) => {
  const [activeTab, setActiveTab] = useState<'voice' | 'text'>('text');
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  // Hook pour l'assistant vocal en temps réel
  const {
    state: voiceState,
    connect: connectVoice,
    disconnect: disconnectVoice,
    startListening,
    stopListening,
    clearTranscript,
    isSupported
  } = useRealtimeAssistant({
    context: 'general',
    enableTools: true,
    autoConnect: false
  });

  // Gérer la connexion/déconnexion
  useEffect(() => {
    if (isOpen && activeTab === 'voice' && !voiceState.isConnected) {
      connectVoice();
    }

    return () => {
      if (voiceState.isConnected) {
        disconnectVoice();
      }
    };
  }, [isOpen, activeTab]);

  const handleMicToggle = () => {
    if (voiceState.isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const toggleAudio = () => {
    setIsAudioEnabled(!isAudioEnabled);
  };

  return (
    <FullScreenModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Assistant IA</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Votre assistant intelligent Vaya
            </p>
          </div>
        </div>
      }
    >
      <div className="flex flex-col h-full">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'voice' | 'text')} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-6">
            <TabsTrigger value="text" className="flex items-center gap-2">
              <Keyboard className="w-4 h-4" />
              Chat Textuel
            </TabsTrigger>
            <TabsTrigger value="voice" className="flex items-center gap-2">
              <Headphones className="w-4 h-4" />
              Assistant Vocal
            </TabsTrigger>
          </TabsList>

          {/* Onglet Chat Textuel */}
          <TabsContent value="text" className="flex-1 mt-0">
            <div className="h-full">
              <TextChatInterface
                projectId={projectId}
                className="h-full"
              />
            </div>
          </TabsContent>

          {/* Onglet Assistant Vocal */}
          <TabsContent value="voice" className="flex-1 mt-0">
            <div className="h-full flex flex-col">
              {/* Status Bar */}
              <div className="flex items-center justify-between mb-6 p-4 bg-neutral-50 dark:bg-neutral-900/50 rounded-xl">
                <div className="flex items-center gap-3">
                  {voiceState.isConnected ? (
                    <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/30">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                      Connecté
                    </Badge>
                  ) : voiceState.isConnecting ? (
                    <Badge variant="secondary">
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      Connexion...
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-neutral-100 dark:bg-neutral-800">
                      Non connecté
                    </Badge>
                  )}

                  {voiceState.isListening && (
                    <Badge className="bg-primary-500/10 text-primary-600 border-primary-500/30">
                      <span className="w-2 h-2 bg-primary-500 rounded-full mr-2 animate-pulse" />
                      Écoute active
                    </Badge>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleAudio}
                  className="rounded-lg"
                >
                  {isAudioEnabled ? (
                    <Volume2 className="w-5 h-5" />
                  ) : (
                    <VolumeX className="w-5 h-5" />
                  )}
                </Button>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 flex flex-col items-center justify-center">
                {!isSupported ? (
                  <Card className="p-8 text-center max-w-md">
                    <div className="text-yellow-500 mb-4">
                      <Sparkles className="w-12 h-12 mx-auto" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      Navigateur non compatible
                    </h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Votre navigateur ne supporte pas l'API audio nécessaire.
                      Veuillez utiliser Chrome, Edge ou Safari.
                    </p>
                  </Card>
                ) : (
                  <>
                    {/* Visualisation audio */}
                    <div className="relative mb-8">
                      <div className={cn(
                        "w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300",
                        voiceState.isListening
                          ? "bg-gradient-to-br from-primary-500 to-secondary-500 shadow-[0_0_40px_rgba(168,85,247,0.4)]"
                          : "bg-neutral-100 dark:bg-neutral-800"
                      )}>
                        <button
                          onClick={handleMicToggle}
                          disabled={!voiceState.isConnected || voiceState.isConnecting}
                          className="w-full h-full flex items-center justify-center rounded-full hover:scale-105 transition-transform"
                        >
                          {voiceState.isListening ? (
                            <Mic className="w-12 h-12 text-white" />
                          ) : (
                            <MicOff className="w-12 h-12 text-neutral-400" />
                          )}
                        </button>
                      </div>

                      {voiceState.isListening && (
                        <div className="absolute inset-0 rounded-full animate-ping bg-primary-500/20" />
                      )}
                    </div>

                    {/* Instructions */}
                    <div className="text-center mb-8">
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        {voiceState.isListening
                          ? "Parlez maintenant, j'écoute..."
                          : "Cliquez sur le microphone pour commencer"}
                      </p>
                    </div>

                    {/* Transcript */}
                    {(voiceState.userTranscript || voiceState.assistantMessage) && (
                      <Card className="w-full max-w-2xl p-6 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl">
                        <ScrollArea className="h-64">
                          {voiceState.userTranscript && (
                            <div className="mb-4">
                              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                                Vous :
                              </p>
                              <p className="text-neutral-900 dark:text-white">
                                {voiceState.userTranscript}
                              </p>
                            </div>
                          )}

                          {voiceState.assistantMessage && (
                            <div>
                              <p className="text-sm font-medium text-primary-600 dark:text-primary-400 mb-1">
                                Assistant :
                              </p>
                              <p className="text-neutral-900 dark:text-white">
                                {voiceState.assistantMessage}
                              </p>
                            </div>
                          )}
                        </ScrollArea>

                        {(voiceState.userTranscript || voiceState.assistantMessage) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearTranscript}
                            className="mt-4"
                          >
                            Effacer l'historique
                          </Button>
                        )}
                      </Card>
                    )}

                    {/* Error Display */}
                    {voiceState.error && (
                      <Card className="w-full max-w-md p-4 mt-4 border-red-500/30 bg-red-50 dark:bg-red-900/10">
                        <p className="text-sm text-red-600 dark:text-red-400">
                          {voiceState.error}
                        </p>
                      </Card>
                    )}
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center gap-4 mt-6">
                {!voiceState.isConnected && !voiceState.isConnecting && (
                  <Button
                    onClick={connectVoice}
                    className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Se connecter à l'assistant
                  </Button>
                )}

                {voiceState.isConnected && (
                  <Button
                    variant="outline"
                    onClick={disconnectVoice}
                  >
                    Déconnecter
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </FullScreenModal>
  );
};