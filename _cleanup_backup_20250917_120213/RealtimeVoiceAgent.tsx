import { useState, useRef, useEffect } from 'react';
// Types temporaires pour Realtime API
interface RealtimeAgent {
  connect: () => Promise<void>;
  disconnect: () => void;
  sendAudio: (audio: ArrayBuffer) => void;
  mute: () => void;
  unmute: () => void;
}

interface RealtimeSession {
  onMessage: (callback: (message: any) => void) => void;
  onError: (callback: (error: any) => void) => void;
  close: () => void;
}
import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { Bot, X, Mic, MicOff, Phone, PhoneOff, Settings, Sparkles, Loader2, Volume2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RealtimeVoiceAgentProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TranscriptEntry {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const RealtimeVoiceAgent = ({ isOpen, onClose }: RealtimeVoiceAgentProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [ephemeralKey, setEphemeralKey] = useState('');
  
  // Settings
  const [voice, setVoice] = useState('alloy');
  const [instructions, setInstructions] = useState(
    "Tu es un AI Assistant pour une plateforme de gestion de Projects. " +
    "Tu aides les Clients à gérer leurs Projects, Teams et Resources efficacement. " +
    "Sois concis, professionnel et amical. Réponds toudays en français."
  );
  
  const agentRef = useRef<RealtimeAgent | null>(null);
  const sessionRef = useRef<RealtimeSession | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Load API key from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem('openai_api_key');
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  // Generate ephemeral key for secure client-side connection
  const generateEphemeralKey = async () => {
    try {
      const currentApiKey = apiKey || localStorage.getItem('openai_api_key');
      
      if (!currentApiKey) {
        throw new Error('Clé API requise');
      }

      // Correct session configuration according to GA API
      const sessionConfig = {
        type: "realtime",
        model: "gpt-realtime",
        instructions: instructions,
        voice: voice,
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 200
        },
        input_audio_transcription: {
          model: "whisper-1"
        }
      };

      console.log('Requesting ephemeral key with config:', sessionConfig);

      const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${currentApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sessionConfig),
      });

      const responseText = await response.text();
      console.log('Response status:', response.status);
      console.log('Response body:', responseText);

      if (!response.ok) {
        let errorMessage = 'Erreur lors de la génération de la clé éphémère';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error?.message || errorMessage;
          
          if (response.status === 404) {
            errorMessage = "L'API Realtime n'est pas disponible. Vérifiez que vous avez accès à l'API Realtime sur votre compte OpenAI.";
          } else if (response.status === 401) {
            errorMessage = "Clé API invalide ou sans accès à l'API Realtime.";
          } else if (response.status === 400) {
            errorMessage = "Configuration invalide. L'API Realtime pourrait ne pas être activée sur votre compte.";
          }
        } catch (e) {
          // Ignore JSON parse error
        }
        throw new Error(errorMessage);
      }

      const data = JSON.parse(responseText);
      const ephemeralKey = data.client_secret?.value || data.value || data.key;
      
      if (!ephemeralKey) {
        throw new Error('Clé éphémère non reçue in la réponse');
      }
      
      setEphemeralKey(ephemeralKey);
      return ephemeralKey;
      
    } catch (error) {
      console.error('Error generating ephemeral key:', error);
      throw error;
    }
  };

  // Connect to Realtime API
  const connect = async () => {
    try {
      setIsConnecting(true);
      
      // Check API key
      const currentApiKey = apiKey || localStorage.getItem('openai_api_key');
      if (!currentApiKey) {
        const key = prompt('Veuillez entrer votre clé API OpenAI:');
        if (key) {
          localStorage.setItem('openai_api_key', key);
          setApiKey(key);
        } else {
          throw new Error('Clé API requise');
        }
      }

      // Generate ephemeral key for secure connection
      const clientKey = await generateEphemeralKey();
      
      // Create agent
      agentRef.current = new RealtimeAgent({
        name: "Assistant",
        instructions: instructions,
      });

      // Create session
      sessionRef.current = new RealtimeSession(agentRef.current);
      
      // Set up event listeners
      sessionRef.current.on('conversation.item.added', (event: any) => {
        if (event.item.type === 'message' && event.item.role) {
          const entry: TranscriptEntry = {
            id: event.item.id || Date.now().toString(),
            role: event.item.role,
            content: event.item.content?.[0]?.text || '',
            timestamp: new Date()
          };
          
          if (entry.content) {
            setTranscript(prev => [...prev, entry]);
          }
        }
      });

      sessionRef.current.on('response.output_text.delta', (event: any) => {
        // Handle text deltas if needed
        console.log('Text delta:', event.delta);
      });

      sessionRef.current.on('response.output_audio_transcript.delta', (event: any) => {
        // Handle audio transcript deltas
        console.log('Audio transcript delta:', event.delta);
      });

      sessionRef.current.on('error', (error: any) => {
        console.error('Session error:', error);
        toast({
          title: "Erreur de session",
          description: error.message || "Une erreur est survenue",
          variant: "destructive"
        });
      });

      // Connect with ephemeral key
      await sessionRef.current.connect({
        apiKey: clientKey,
        model: "gpt-realtime",
      });
      
      setIsConnected(true);
      
      toast({
        title: "Connecté",
        description: "Vous pouvez maintenant parler avec l'assistant",
      });
      
    } catch (error) {
      console.error('Connection error:', error);
      toast({
        title: "Error de Login",
        description: error instanceof Error ? error.message : "Impossible de se connecter",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect from Realtime API
  const disconnect = async () => {
    try {
      if (sessionRef.current) {
        await sessionRef.current.disconnect();
      }
      setIsConnected(false);
      
      toast({
        title: "Déconnecté",
        description: "Session Completede",
      });
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (sessionRef.current) {
      if (isMuted) {
        sessionRef.current.unmute();
      } else {
        sessionRef.current.mute();
      }
      setIsMuted(!isMuted);
    }
  };

  // Update session settings
  const updateSettings = async () => {
    if (sessionRef.current && isConnected) {
      try {
        await sessionRef.current.updateSession({
          instructions: instructions,
          audio: {
            output: { voice: voice }
          }
        });
        
        toast({
          title: "Settings mis à day",
          description: "Les changements ont été appliqués",
        });
      } catch (error) {
        console.error('Update settings error:', error);
      }
    }
  };

  // Save API key
  const saveApiKey = () => {
    if (apiKey) {
      localStorage.setItem('openai_api_key', apiKey);
      toast({
        title: "Success",
        description: "Clé API sauvegardée"
      });
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isConnected) {
        disconnect();
      }
    };
  }, [isConnected]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-brand/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-brand to-brand/80 rounded-xl flex items-center justify-center shadow-lg">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                Voice assistant Temps Réel
                <Sparkles className="w-4 h-4 text-brand" />
              </h2>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                <span className="text-sm text-muted-foreground">
                  {isConnected ? 'En ligne - GPT Realtime' : isConnecting ? 'Connexion...' : 'Hors ligne'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="p-4 border-b border-border bg-muted/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="api-key">Clé API OpenAI</Label>
                <div className="flex gap-2">
                  <input
                    id="api-key"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="flex-1 px-3 py-1 text-sm rounded-md border border-border bg-background"
                    disabled={isConnected}
                  />
                  <Button size="sm" onClick={saveApiKey} disabled={isConnected}>
                    Sauver
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Voix</Label>
                <Select value={voice} onValueChange={setVoice} disabled={isConnected}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alloy">Alloy</SelectItem>
                    <SelectItem value="echo">Echo</SelectItem>
                    <SelectItem value="fable">Fable</SelectItem>
                    <SelectItem value="onyx">Onyx</SelectItem>
                    <SelectItem value="nova">Nova</SelectItem>
                    <SelectItem value="shimmer">Shimmer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="col-span-full space-y-2">
                <Label>Instructions System</Label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full h-20 px-3 py-2 text-sm rounded-md border border-border bg-background resize-none"
                  disabled={isConnected}
                />
              </div>
              
              {isConnected && (
                <div className="col-span-full">
                  <Button onClick={updateSettings} size="sm" variant="outline">
                    Appliquer les changements
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          {!isConnected ? (
            <div className="text-center space-y-6">
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-brand/20 to-brand/10 rounded-full flex items-center justify-center">
                <Phone className="w-12 h-12 text-brand" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Prêt à converser</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Connectez-vous pour démarrer une conversation vocale en temps réel avec l'AI Assistant.
                  L'audio est traité directement via WebRTC pour une latence minimale.
                </p>
              </div>
              <Button
                size="lg"
                onClick={connect}
                disabled={isConnecting}
                className="min-w-[200px]"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Login...
                  </>
                ) : (
                  <>
                    <Phone className="w-5 h-5 mr-2" />
                    Démarrer la conversation
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col">
              {/* Live Indicator */}
              <div className="mb-4 p-4 bg-gradient-to-r from-green-500/10 to-transparent rounded-lg border border-green-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Volume2 className="w-6 h-6 text-green-500" />
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Conversation In progress</p>
                      <p className="text-xs text-muted-foreground">Speakingz naturellement, l'assistant vous écoute</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={isMuted ? "destructive" : "outline"}
                      size="sm"
                      onClick={toggleMute}
                    >
                      {isMuted ? (
                        <>
                          <MicOff className="w-4 h-4 mr-2" />
                          Muet
                        </>
                      ) : (
                        <>
                          <Mic className="w-4 h-4 mr-2" />
                          Actif
                        </>
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={disconnect}
                    >
                      <PhoneOff className="w-4 h-4 mr-2" />
                      Terminer
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Transcript */}
              <ScrollArea className="flex-1 p-4 bg-muted/10 rounded-lg">
                <div className="space-y-3">
                  {transcript.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Mic className="w-8 h-8 mx-auto mb-3 opacity-50" />
                      <p>La transcription apparaîtra ici...</p>
                    </div>
                  ) : (
                    transcript.map((entry) => (
                      <div
                        key={entry.id}
                        className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-xl px-4 py-2 ${
                            entry.role === 'user'
                              ? 'bg-brand text-white'
                              : 'bg-card border border-border'
                          }`}
                        >
                          <p className="text-sm">{entry.content}</p>
                          <span className="text-xs opacity-70 mt-1 block">
                            {entry.timestamp.toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={transcriptEndRef} />
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};