import { useState, useRef, useEffect } from 'react';
import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { Bot, X, Mic, MicOff, Phone, PhoneOff, Settings, Sparkles, Loader2, Volume2, AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RealtimeVoiceAgentDirectProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TranscriptEntry {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const RealtimeVoiceAgentDirect = ({ isOpen, onClose }: RealtimeVoiceAgentDirectProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  
  // Settings
  const [voice, setVoice] = useState('alloy');
  const [model, setModel] = useState('gpt-4o-realtime-preview-2024-12-17');
  const [instructions, setInstructions] = useState(
    "Tu es un AI Assistant pour une plateforme de gestion de Projects. " +
    "Tu aides les Clients à gérer leurs Projects, Teams et Resources efficacement. " +
    "Sois concis, professionnel et amical. Réponds toudays en français."
  );
  
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
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

  // Connect via WebSocket directly
  const connectWebSocket = async () => {
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

      // Connect to WebSocket
      const wsUrl = `wss://api.openai.com/v1/realtime?model=${model}`;
      console.log('Connecting to:', wsUrl);
      
      const ws = new WebSocket(wsUrl, {
        headers: {
          'Authorization': `Bearer ${currentApiKey || apiKey}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      } as any);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        
        // Send session configuration
        const sessionConfig = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: instructions,
            voice: voice,
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 200
            },
            tools: [],
            tool_choice: 'auto',
            temperature: 0.8,
            max_response_output_tokens: 4096
          }
        };
        
        console.log('Sending session config:', sessionConfig);
        ws.send(JSON.stringify(sessionConfig));
        
        toast({
          title: "Connecté",
          description: "WebSocket connecté avec succès",
        });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received event:', data.type, data);
          
          // Handle different event types
          switch(data.type) {
            case 'session.created':
            case 'session.updated':
              console.log('Session ready:', data);
              break;
              
            case 'conversation.item.created':
              if (data.item && data.item.type === 'message') {
                const entry: TranscriptEntry = {
                  id: data.item.id,
                  role: data.item.role,
                  content: data.item.content?.[0]?.text || '',
                  timestamp: new Date()
                };
                
                if (entry.content) {
                  setTranscript(prev => [...prev, entry]);
                }
              }
              break;
              
            case 'response.text.delta':
            case 'response.output_text.delta':
              // Handle text streaming
              if (data.delta) {
                console.log('Text delta:', data.delta);
              }
              break;
              
            case 'response.audio_transcript.delta':
            case 'response.output_audio_transcript.delta':
              // Handle audio transcript
              if (data.delta) {
                console.log('Audio transcript:', data.delta);
              }
              break;
              
            case 'error':
              console.error('Server error:', data.error);
              toast({
                title: "Erreur serveur",
                description: data.error?.message || "Une erreur est survenue",
                variant: "destructive"
              });
              break;
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast({
          title: "Erreur WebSocket",
          description: "Erreur de connexion WebSocket",
          variant: "destructive"
        });
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        toast({
          title: "Déconnecté",
          description: "La connexion WebSocket a été fermée",
        });
      };

      wsRef.current = ws;
      
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

  // Start recording audio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create audio context for processing
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          // Convert blob to base64 and send
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result?.toString().split(',')[1];
            if (base64) {
              wsRef.current?.send(JSON.stringify({
                type: 'input_audio_buffer.append',
                audio: base64
              }));
            }
          };
          reader.readAsDataURL(event.data);
        }
      };
      
      mediaRecorder.start(100); // Send data every 100ms
      setIsRecording(true);
      
      toast({
        title: "Enregistrement démarré",
        description: "Parlez maintenant...",
      });
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Erreur",
        description: "Impossible de démarrer l'enregistrement",
        variant: "destructive"
      });
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current = null;
      setIsRecording(false);
      
      // Send commit audio buffer
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'input_audio_buffer.commit'
        }));
      }
    }
  };

  // Send text message
  const sendTextMessage = (text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = {
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{
            type: 'input_text',
            text: text
          }]
        }
      };
      
      wsRef.current.send(JSON.stringify(message));
      
      // Add to transcript
      setTranscript(prev => [...prev, {
        id: Date.now().toString(),
        role: 'user',
        content: text,
        timestamp: new Date()
      }]);
      
      // Request response
      wsRef.current.send(JSON.stringify({
        type: 'response.create'
      }));
    }
  };

  // Disconnect
  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (mediaRecorderRef.current) {
      stopRecording();
    }
    setIsConnected(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isConnected) {
        disconnect();
      }
    };
  }, [isConnected]);

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
                Voice assistant (WebSocket Direct)
                <Sparkles className="w-4 h-4 text-brand" />
              </h2>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                <span className="text-sm text-muted-foreground">
                  {isConnected ? 'WebSocket connecté' : isConnecting ? 'Connexion...' : 'Hors ligne'}
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

        {/* Alert for API access */}
        <Alert className="m-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Note:</strong> L'API Realtime nécessite un accès spécifique. 
            Si vous obtenez une Error 400/404, votre compte n'a peut-être pas accès à cette API. 
            Utilisez le chat texte standard en attendant.
          </AlertDescription>
        </Alert>

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
                <Label>Modèle</Label>
                <Select value={model} onValueChange={setModel} disabled={isConnected}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o-realtime-preview-2024-12-17">GPT-4o Realtime Preview</SelectItem>
                    <SelectItem value="gpt-4o-realtime-preview">GPT-4o Realtime</SelectItem>
                  </SelectContent>
                </Select>
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
                  <h3 className="text-xl font-semibold mb-2">Login WebSocket Direct</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Cette version se connecte directement via WebSocket à l'API Realtime.
                  </p>
                </div>
                <Button
                  size="lg"
                  onClick={connectWebSocket}
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
                      Se connecter
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Controls */}
              <div className="mb-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant={isRecording ? "destructive" : "default"}
                      onClick={isRecording ? stopRecording : startRecording}
                    >
                      {isRecording ? (
                        <>
                          <MicOff className="w-4 h-4 mr-2" />
                          Arrêter
                        </>
                      ) : (
                        <>
                          <Mic className="w-4 h-4 mr-2" />
                          Speakingr
                        </>
                      )}
                    </Button>
                    
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        placeholder="Ou tapez votre message..."
                        className="flex-1 px-3 py-2 rounded-md border border-border bg-background"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.currentTarget.value) {
                            sendTextMessage(e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                    </div>
                  </div>
                  
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={disconnect}
                  >
                    <PhoneOff className="w-4 h-4 mr-2" />
                    Déconnecter
                  </Button>
                </div>
              </div>
              
              {/* Transcript */}
              <ScrollArea className="flex-1 p-4 bg-muted/10 rounded-lg">
                <div className="space-y-3">
                  {transcript.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Mic className="w-8 h-8 mx-auto mb-3 opacity-50" />
                      <p>La conversation apparaîtra ici...</p>
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