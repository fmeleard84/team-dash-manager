import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronUp, ChevronDown, Bot, User, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Node, Edge } from '@xyflow/react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  graph?: {
    nodes: Node[];
    edges: Edge[];
  };
}

interface AIGraphGeneratorProps {
  onGraphGenerated: (nodes: Node[], edges: Edge[]) => void;
}

const AIGraphGenerator: React.FC<AIGraphGeneratorProps> = ({ onGraphGenerated }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const { data, error } = await supabase.functions.invoke('ai-graph-generator', {
        body: {
          message: userMessage.content,
          conversationHistory
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        graph: data.graph
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (data.graph) {
        toast({
          title: "Graphe généré !",
          description: "Le graphe a été créé avec succès. Vous pouvez l'appliquer à votre projet.",
        });
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erreur",
        description: "Impossible de communiquer avec l'assistant IA.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const applyGraph = (graph: { nodes: Node[]; edges: Edge[] }) => {
    onGraphGenerated(graph.nodes, graph.edges);
    toast({
      title: "Graphe appliqué !",
      description: "Le graphe a été ajouté à votre projet.",
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Expandable content */}
      {isExpanded && (
        <Card className="mx-4 mb-2 max-h-96 shadow-lg border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="h-5 w-5 text-primary" />
              Assistant IA - Génération de graphes
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Messages */}
            <ScrollArea className="h-48">
              <div className="space-y-3 pr-4">
                {messages.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Décrivez votre projet et je créerai le graphe correspondant !</p>
                    <p className="text-sm mt-1">
                      Ex: "Je veux créer un site WordPress simple" ou "J'ai besoin d'un service comptable"
                    </p>
                  </div>
                )}
                
                {messages.map((message) => (
                  <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex items-start gap-2 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                      }`}>
                        {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                      </div>
                      
                      <div className="space-y-2">
                        <div className={`p-3 rounded-lg ${
                          message.role === 'user' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        </div>
                        
                        {message.graph && (
                          <div className="bg-background border border-border rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="secondary" className="text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Graphe généré
                              </Badge>
                              <Button
                                size="sm"
                                onClick={() => applyGraph(message.graph!)}
                                className="h-7 px-3 text-xs"
                              >
                                Appliquer
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {message.graph.nodes.length} ressource(s) • {message.graph.edges.length} connexion(s)
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="bg-muted text-muted-foreground p-3 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm">L'assistant réfléchit...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            
            {/* Input */}
            <div className="flex gap-2">
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Décrivez votre projet..."
                className="resize-none min-h-[60px]"
                disabled={isLoading}
              />
              <Button 
                onClick={sendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="self-end"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Envoyer'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Toggle button */}
      <div className="bg-background border-t border-border p-3">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="outline"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              <span>Assistant IA - Générateur de graphes</span>
              {messages.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {messages.length}
                </Badge>
              )}
            </div>
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AIGraphGenerator;