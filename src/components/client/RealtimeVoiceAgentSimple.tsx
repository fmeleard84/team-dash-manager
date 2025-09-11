import { useState, useRef, useEffect } from 'react';
// @ts-ignore - The package types might not be perfect
import { RealtimeAgent, RealtimeSession } from '@openai/agents-realtime';
import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { Bot, X, Phone, PhoneOff, Settings, Sparkles, Loader2, AlertCircle, Mic, MicOff } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RealtimeVoiceAgentSimpleProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TranscriptEntry {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const RealtimeVoiceAgentSimple = ({ isOpen, onClose }: RealtimeVoiceAgentSimpleProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [ephemeralKey, setEphemeralKey] = useState('');
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  
  // Settings
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

  // Generate ephemeral key - CORRECTED according to documentation
  const generateEphemeralKey = async () => {
    try {
      setIsGeneratingKey(true);
      const currentApiKey = apiKey || localStorage.getItem('openai_api_key');
      
      if (!currentApiKey) {
        const key = prompt('Veuillez entrer votre clé API OpenAI:');
        if (key) {
          localStorage.setItem('openai_api_key', key);
          setApiKey(key);
          return await generateEphemeralKey(); // Retry with new key
        } else {
          throw new Error('Clé API requise');
        }
      }

      console.log('Generating ephemeral key...');

      // CORRECT URL according to documentation
      const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${currentApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session: {
            type: "realtime",
            model: "gpt-realtime"
          }
        })
      });

      const responseText = await response.text();
      console.log('Ephemeral key response:', response.status, responseText);

      if (!response.ok) {
        let errorMessage = 'Erreur lors de la génération de la clé éphémère';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error?.message || errorMessage;
        } catch (e) {
          // Ignore parse error
        }
        
        if (response.status === 404) {
          errorMessage = "L'API Realtime n'est pas disponible sur votre compte. Vous devez avoir accès à l'API Realtime.";
        } else if (response.status === 401) {
          errorMessage = "Clé API invalide ou expirée.";
        } else if (response.status === 403) {
          errorMessage = "Accès refusé. Votre compte n'a pas accès à l'API Realtime.";
        }
        
        throw new Error(errorMessage);
      }

      const data = JSON.parse(responseText);
      const clientSecret = data.client_secret?.value || data.value;
      
      if (!clientSecret) {
        throw new Error('Clé éphémère non reçue');
      }
      
      console.log('Ephemeral key generated successfully');
      setEphemeralKey(clientSecret);
      return clientSecret;
      
    } catch (error) {
      console.error('Error generating ephemeral key:', error);
      throw error;
    } finally {
      setIsGeneratingKey(false);
    }
  };

  // Connect to Realtime API - SIMPLIFIED according to documentation
  const connect = async () => {
    try {
      setIsConnecting(true);
      
      // Generate ephemeral key first
      const clientKey = await generateEphemeralKey();
      
      console.log('Creating RealtimeAgent...');
      
      // Create agent - EXACTLY as in documentation
      agentRef.current = new RealtimeAgent({
        name: 'Assistant',
        instructions: instructions,
      });

      console.log('Creating RealtimeSession...');
      
      // Create session - EXACTLY as in documentation
      sessionRef.current = new RealtimeSession(agentRef.current, {
        model: 'gpt-realtime',
      });
      
      // Set up event listeners
      sessionRef.current.on('conversation.updated', (event: any) => {
        console.log('Conversation updated:', event);
      });

      sessionRef.current.on('conversation.item.appended', (event: any) => {
        console.log('Item appended:', event);
        if (event.item?.formatted?.transcript) {
          const entry: TranscriptEntry = {
            id: event.item.id || Date.now().toString(),
            role: event.item.role || 'assistant',
            content: event.item.formatted.transcript,
            timestamp: new Date()
          };
          setTranscript(prev => [...prev, entry]);
        }
      });

      sessionRef.current.on('conversation.item.completed', (event: any) => {
        console.log('Item completed:', event);
        if (event.item?.formatted?.transcript) {
          const entry: TranscriptEntry = {
            id: event.item.id || Date.now().toString(),
            role: event.item.role || 'assistant',
            content: event.item.formatted.transcript,
            timestamp: new Date()
          };
          
          // Update existing or add new
          setTranscript(prev => {
            const existing = prev.find(e => e.id === entry.id);
            if (existing) {
              return prev.map(e => e.id === entry.id ? entry : e);
            }
            return [...prev, entry];
          });
        }
      });

      sessionRef.current.on('error', (error: any) => {
        console.error('Session error:', error);
        toast({
          title: "Error de session",
          description: error.message || "An error occurred",
          variant: "destructive"
        });
      });

      console.log('Connecting to session...');
      
      // Connect - EXACTLY as in documentation
      // The SDK handles WebRTC automatically in the browser
      await sessionRef.current.connect({
        apiKey: clientKey
      });
      
      setIsConnected(true);
      
      toast({
        title: "Connecté",
        description: "Vous pouvez Mayntenant Speakingr avec l"assistant",
      });
      
    } catch (error) {
      console.error('Connection error:', error);
      toast({
        title: "Erreur de connexion",
        description: error instanceof Error ? error.message : "Impossible de se connecter",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect
  const disconnect = async () => {
    try {
      if (sessionRef.current) {
        // Check if disconnect method exists, otherwise try close or cleanup
        if (typeof sessionRef.current.disconnect === 'function') {
          await sessionRef.current.disconnect();
        } else if (typeof (sessionRef.current as any).close === 'function') {
          await (sessionRef.current as any).close();
        } else if (typeof (sessionRef.current as any).cleanup === 'function') {
          await (sessionRef.current as any).cleanup();
        } else {
          // If no disconnect method, just reset the references
          console.log('No disconnect method found, resetting references');
        }
      }
      
      // Reset state regardless
      sessionRef.current = null;
      agentRef.current = null;
      setIsConnected(false);
      setTranscript([]);
      setEphemeralKey('');
      
      toast({
        title: "Déconnecté",
        description: "Session terminée",
      });
    } catch (error) {
      console.error('Disconnect error:', error);
      // Reset state even if error
      sessionRef.current = null;
      agentRef.current = null;
      setIsConnected(false);
      setTranscript([]);
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (sessionRef.current) {
      // The SDK should handle audio muting
      setIsMuted(!isMuted);
      
      // Try to mute/unmute if methods exist
      if (typeof (sessionRef.current as any).mute === 'function') {
        if (isMuted) {
          (sessionRef.current as any).unmute();
        } else {
          (sessionRef.current as any).mute();
        }
      }
    }
  };

  // Save API key
  const saveApiKey = () => {
    if (apiKey) {
      localStorage.setItem('openai_api_key', apiKey);
      toast({
        title: "Succès",
        description: "Clé API sauvegardée"
      });
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isConnected) {
        // Use our disconnect function which handles missing methods
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
                Voice assistant Realtime (Simplifié)
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

        {/* Alert */}
        <Alert className="m-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Note:</strong> Cette version utilise l'implémentation exacte de la Documentation OpenAI. 
            L'API Realtime nécessite un accès spécifique (Tier 2+). 
            Si vous obtenez une Error, vérifiez votre accès sur platform.openai.com.
          </AlertDescription>
        </Alert>

        {/* Settings Panel */}
        {showSettings && (
          <div className="p-4 border-b border-border bg-muted/30">
            <div className="space-y-4">
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
                <Label>Instructions System</Label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full h-20 px-3 py-2 text-sm rounded-md border border-border bg-background resize-none"
                  disabled={isConnected}
                />
              </div>
              
              {ephemeralKey && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    ✅ Clé éphémère générée avec Success
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col p-4">
          {!isConnected ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-6">
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-brand/20 to-brand/10 rounded-full flex items-center justify-center">
                  <Phone className="w-12 h-12 text-brand" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Prêt pour une conversation vocale</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-4">
                    Cette implémentation suit exactement la Documentation OpenAI. 
                    Le SDK gère automatiquement WebRTC et l'audio.
                  </p>
                  {isGeneratingKey && (
                    <p className="text-sm text-brand mb-2">
                      Génération de la clé éphémère...
                    </p>
                  )}
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
                      {isGeneratingKey ? 'Génération clé...' : 'Connexion...'}
                    </>
                  ) : (
                    <>
                      <Phone className="w-5 h-5 mr-2" />
                      Démarrer la conversation
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Connected UI */}
              <div className="mb-4 p-4 bg-gradient-to-r from-green-500/10 to-transparent rounded-lg border border-green-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Mic className="w-6 h-6 text-green-500" />
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Conversation active</p>
                      <p className="text-xs text-muted-foreground">
                        Le SDK gère automatiquement votre microphone et l'audio
                      </p>
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
                      <p className="font-medium">Speakingz Mayntenant</p>
                      <p className="text-sm mt-2">
                        Le SDK gère automatiquement la capture audio via WebRTC.
                        Speakingz naturellement et l'assistant vous répondra.
                      </p>
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
            </>
          )}
        </div>
      </Card>
    </div>
  );
};