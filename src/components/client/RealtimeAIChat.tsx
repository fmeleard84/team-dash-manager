import { useState, useRef, useEffect } from 'react';
import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { Bot, X, Mic, MicOff, Send, Settings, Volume2, Loader2, Sparkles } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RealtimeAIChatProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

// Global variable to track if any speech recognition is active
let globalRecognitionActive = false;

export const RealtimeAIChat = ({ isOpen, onClose }: RealtimeAIChatProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'system',
      content: "Bonjour ! Je suis votre assistant IA pour vous aider avec vos projets. Comment puis-je vous aider aujourd'hui ?",
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  // Settings
  const [model, setModel] = useState('gpt-4');
  const [temperature, setTemperature] = useState('0.7');
  const [enableVoice, setEnableVoice] = useState(false);
  const [apiKey, setApiKey] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).webkitSpeechRecognition) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false; // Changed to false for better stability
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'fr-FR';
      recognitionRef.current.maxAlternatives = 1;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');

        if (event.results[event.results.length - 1].isFinal) {
          setInputText(transcript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        let errorMessage = "Erreur de reconnaissance vocale";
        
        switch(event.error) {
          case 'network':
            errorMessage = "Erreur réseau. Vérifiez votre connexion internet.";
            break;
          case 'not-allowed':
            errorMessage = "Accès au microphone refusé. Veuillez autoriser l'accès au microphone.";
            break;
          case 'no-speech':
            errorMessage = "Aucune parole détectée. Réessayez.";
            break;
          case 'aborted':
            errorMessage = "Reconnaissance vocale interrompue.";
            break;
          case 'audio-capture':
            errorMessage = "Aucun microphone détecté.";
            break;
          case 'service-not-allowed':
            errorMessage = "Service de reconnaissance vocale non disponible. Essayez avec Chrome ou Edge.";
            break;
        }
        
        toast({
          title: "Error de reconnaissance vocale",
          description: errorMessage,
          variant: "destructive"
        });
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
        globalRecognitionActive = false;
      };
      
      recognitionRef.current.onstart = () => {
        console.log('Speech recognition started');
        globalRecognitionActive = true;
      };
    }
    
    // Cleanup on unmount
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors
        }
        globalRecognitionActive = false;
      }
    };
  }, [toast]);

  // Load API key from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem('openai_api_key');
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  // Toggle voice recognition
  const toggleVoiceRecognition = async () => {
    // Check if another recognition is active
    if (globalRecognitionActive && !isListening) {
      toast({
        title: "Microphone déjà utilisé",
        description: "Une autre reconnaissance vocale est en cours. Fermez-la d'abord.",
        variant: "destructive"
      });
      return;
    }
    
    // Check if we're on HTTPS (required for speech recognition)
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      toast({
        title: "HTTPS requis",
        description: "La reconnaissance vocale nécessite une Login sécurisée (HTTPS)",
        variant: "destructive"
      });
      return;
    }

    if (!recognitionRef.current) {
      toast({
        title: "Non supporté",
        description: "La reconnaissance vocale n'est pas supportée sur ce navigateur. Utilisez Chrome ou Edge.",
        variant: "destructive"
      });
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current.stop();
        setIsListening(false);
      } catch (error) {
        console.error('Error stopping recognition:', error);
        setIsListening(false);
      }
    } else {
      try {
        // Request microphone permission first
        await navigator.mediaDevices.getUserMedia({ audio: true });
        
        recognitionRef.current.start();
        setIsListening(true);
        
        toast({
          title: "Microphone activé",
          description: "Parlez maintenant...",
        });
      } catch (error) {
        console.error('Error starting recognition:', error);
        setIsListening(false);
        
        if (error instanceof DOMException && error.name === 'NotAllowedError') {
          toast({
            title: "Accès refusé",
            description: "Veuillez autoriser l'accès au microphone in les Settings de votre navigateur',
            variant: "destructive"
          });
        } else {
          toast({
            title: "Error",
            description: "Impossible d'accéder au microphone",
            variant: "destructive"
          });
        }
      }
    }
  };

  // Send message to OpenAI
  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    // Add typing indicator
    const typingMessage: Message = {
      id: 'typing',
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isTyping: true
    };
    setMessages(prev => [...prev, typingMessage]);

    try {
      // Check if API key exists
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

      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentApiKey || apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'system',
              content: `Tu es un assistant IA pour une plateforme de gestion de projets. 
                       Tu aides les clients à gérer leurs projets, équipes et ressources efficacement.
                       Sois concis, professionnel et amical dans tes réponses.
                       Réponds toujours en français.`
            },
            ...messages.filter(m => !m.isTyping && m.role !== 'system').map(m => ({
              role: m.role,
              content: m.content
            })),
            {
              role: 'user',
              content: inputText
            }
          ],
          temperature: parseFloat(temperature),
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la communication avec OpenAI');
      }

      const data = await response.json();
      
      // Remove typing indicator and add response
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== 'typing');
        return [...filtered, {
          id: Date.now().toString(),
          role: 'assistant',
          content: data.choices[0].message.content,
          timestamp: new Date()
        }];
      });

      // Text-to-speech if enabled
      if (enableVoice && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(data.choices[0].message.content);
        utterance.lang = 'fr-FR';
        window.speechSynthesis.speak(utterance);
      }

    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => prev.filter(m => m.id !== 'typing'));
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de communiquer avec l'assistant",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
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
                AI Assistant
                <Sparkles className="w-4 h-4 text-brand" />
              </h2>
              <p className="text-sm text-muted-foreground">Propulsé par {model}</p>
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
            <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>💡 Astuce:</strong> Pour la reconnaissance vocale, utilisez Chrome ou Edge. 
                Si vous avez des Errors réseau, vérifiez votre Login internet et les Permissions du microphone.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  />
                  <Button size="sm" onClick={saveApiKey}>
                    Sauver
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Modèle</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4">GPT-4</SelectItem>
                    <SelectItem value="gpt-4-turbo-preview">GPT-4 Turbo</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Température ({temperature})</Label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={enableVoice}
                  onCheckedChange={setEnableVoice}
                />
                <Label>Synthèse vocale</Label>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-brand text-white'
                      : message.role === 'system'
                      ? 'bg-gradient-to-r from-brand/20 to-brand/10 border border-brand/20'
                      : 'bg-muted'
                  }`}
                >
                  {message.isTyping ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">En train d'écrire...</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start gap-2">
                        {message.role === 'assistant' && (
                          <Bot className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        )}
                        {message.role === 'system' && (
                          <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0 text-brand" />
                        )}
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                      <span className="text-xs opacity-70 mt-2 block">
                        {message.timestamp.toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-border bg-muted/10">
          <div className="flex items-end gap-2">
            <Button
              variant={isListening ? "destructive" : "outline"}
              size="icon"
              onClick={toggleVoiceRecognition}
              className="flex-shrink-0"
              disabled={isLoading}
              title={isListening ? "Arrêter l'écoute" : "Activer le microphone"}
            >
              {isListening ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </Button>
            
            {enableVoice && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => window.speechSynthesis.cancel()}
                className="flex-shrink-0"
              >
                <Volume2 className="w-4 h-4" />
              </Button>
            )}
            
            <div className="flex-1">
              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tapez votre message ou utilisez le microphone..."
                className="min-h-[44px] max-h-[120px] resize-none"
                disabled={isLoading}
              />
            </div>
            
            <Button
              onClick={sendMessage}
              disabled={isLoading || !inputText.trim()}
              className="flex-shrink-0"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          
          {isListening && (
            <div className="mt-2 flex items-center gap-2 text-sm text-brand">
              <div className="w-2 h-2 bg-brand rounded-full animate-pulse" />
              Listening...
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};