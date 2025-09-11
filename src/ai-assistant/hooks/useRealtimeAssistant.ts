/**
 * Hook principal pour l'assistant IA avec Realtime API
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { RealtimeAgent, RealtimeSession } from '@openai/agents/realtime';
import { REALTIME_TOOLS, executeRealtimeTool } from '../config/realtime-tools';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Types pour l'API Realtime WebSocket

export interface AssistantConfig {
  apiKey?: string;
  context?: string;
  customPrompts?: any[];
  enableTools?: boolean;
  autoConnect?: boolean;
}

export interface AssistantState {
  isConnected: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  transcript: string;
  response: string;
  error: string | null;
  lastToolCall?: {
    name: string;
    result: any;
  };
}

export interface UseRealtimeAssistantReturn {
  state: AssistantState;
  connect: () => Promise<void>;
  disconnect: () => void;
  startListening: () => void;
  stopListening: () => void;
  sendMessage: (message: string) => void;
  executeFunction: (name: string, args: any) => Promise<any>;
  clearTranscript: () => void;
  isSupported: boolean;
}

/**
 * Hook pour gérer l'assistant IA en temps réel
 */
export function useRealtimeAssistant(config: AssistantConfig = {}): UseRealtimeAssistantReturn {
  const [state, setState] = useState<AssistantState>({
    isConnected: false,
    isListening: false,
    isSpeaking: false,
    isProcessing: false,
    transcript: '',
    response: '',
    error: null
  });

  const agentRef = useRef<RealtimeAgent | null>(null);
  const sessionRef = useRef<RealtimeSession | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Vérifier le support du navigateur
  const isSupported = typeof window !== 'undefined' && 
    'MediaRecorder' in window && 
    'AudioContext' in window;

  /**
   * Générer une clé éphémère et initialiser la session
   */
  const connect = useCallback(async () => {
    if (!isSupported) {
      setState(prev => ({ 
        ...prev, 
        error: 'Votre navigateur ne supporte pas l\'API audio nécessaire' 
      }));
      return;
    }

    try {
      setState(prev => ({ ...prev, isProcessing: true, error: null }));

      console.log('Fetching ephemeral key...');
      
      // Récupérer une clé éphémère depuis notre Edge Function
      const { data: funcData, error: funcError } = await supabase.functions.invoke('generate-realtime-key');
      
      if (funcError || !funcData?.ephemeralKey) {
        throw new Error(funcError?.message || 'Failed to get ephemeral key');
      }

      const ephemeralKey = funcData.ephemeralKey;
      console.log('Ephemeral key received, connecting...');

      // Récupérer les prompts depuis prompts_ia (table avec RLS correctes)
      const { data: prompts } = await supabase
        .from('prompts_ia')
        .select('*')
        .eq('active', true)
        .order('priority', { ascending: false });

      // Construire les instructions à partir des prompts
      let instructions = '';
      if (prompts && prompts.length > 0) {
        // Organiser les prompts par type logique (basé sur le contexte)
        const systemPrompts = prompts.filter(p => p.context === 'general'); // Type "Système"
        const contextPrompts = prompts.filter(p => 
          ['team-composition', 'project-management', 'technical', 'meeting', 'task-management'].includes(p.context)
        ); // Type "Contexte"
        const behaviorPrompts = prompts.filter(p => p.context === 'behavior'); // Type "Comportement"
        
        // Combiner dans l'ordre : Système -> Contexte -> Comportement
        instructions = [
          '=== INSTRUCTIONS SYSTÈME ===',
          ...systemPrompts.map(p => p.prompt),
          '\n=== CONTEXTE SPÉCIFIQUE ===',
          ...contextPrompts.map(p => `[${p.context}]\n${p.prompt}`),
          behaviorPrompts.length > 0 ? '\n=== COMPORTEMENT ===' : '',
          ...behaviorPrompts.map(p => p.prompt)
        ].filter(Boolean).join('\n\n');
        
        console.log('Loaded prompts:', {
          system: systemPrompts.length,
          context: contextPrompts.length,
          behavior: behaviorPrompts.length
        });
      } else {
        instructions = 'Tu es un assistant intelligent pour Team Dash Manager. Aide les utilisateurs à gérer leurs projets et équipes.';
      }

      // Ajouter le contexte spécifique si fourni
      if (config.context) {
        instructions += `\n\nContexte actuel: ${config.context}`;
      }

      // Créer l'agent avec la configuration et les outils
      const agent = new RealtimeAgent({
        name: 'Assistant Team Dash',
        instructions: instructions,
        tools: config.enableTools !== false ? REALTIME_TOOLS : []
      });

      // Créer la session avec le bon modèle et vitesse de parole augmentée
      const session = new RealtimeSession(agent, {
        model: 'gpt-4o-realtime-preview',
        voice: 'alloy', // Voix plus rapide et claire
        instructions: instructions,
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500 // Réduire le silence pour des réponses plus rapides
        },
        modalities: ['text', 'audio'],
        temperature: 0.8
      } as any);

      // Configurer les event listeners
      session.on('connected', () => {
        console.log('Session connected event received');
      });
      
      session.on('disconnected', () => {
        console.log('Session disconnected event received');
      });
      
      session.on('conversation.updated', (event: any) => {
        console.log('Conversation updated:', event);
      });

      // Gérer les différents formats d'événements possibles
      session.on('conversation.item.appended', (event: any) => {
        console.log('Item appended:', event);
        const content = event.item?.formatted?.transcript || 
                       event.item?.content?.[0]?.text || 
                       event.item?.content || 
                       event.item?.text;
        
        if (content) {
          setState(prev => ({ 
            ...prev, 
            transcript: event.item.role === 'user' ? content : prev.transcript,
            response: event.item.role === 'assistant' ? content : prev.response,
            isProcessing: event.item.role === 'user',
            isSpeaking: event.item.role === 'assistant'
          }));
        }
      });

      session.on('conversation.item.completed', (event: any) => {
        console.log('Item completed:', event);
        const content = event.item?.formatted?.transcript || 
                       event.item?.content?.[0]?.text || 
                       event.item?.content || 
                       event.item?.text;
        
        if (content) {
          setState(prev => ({ 
            ...prev, 
            response: content,
            isProcessing: false,
            isSpeaking: false
          }));
        }
      });
      
      // Gérer les événements audio
      session.on('input_audio_buffer.speech_started', () => {
        console.log('Speech started');
        setState(prev => ({ ...prev, isListening: true }));
      });
      
      session.on('input_audio_buffer.speech_stopped', () => {
        console.log('Speech stopped');
        setState(prev => ({ ...prev, isListening: false, isProcessing: true }));
      });
      
      // Gérer les événements de transcription
      session.on('conversation.item.input_audio_transcription.completed', (event: any) => {
        console.log('Transcription completed:', event);
        if (event.transcript) {
          setState(prev => ({ 
            ...prev, 
            transcript: event.transcript,
            isProcessing: true 
          }));
        }
      });
      
      // Gérer la réponse audio
      session.on('response.audio.delta', () => {
        setState(prev => ({ ...prev, isSpeaking: true }));
      });
      
      session.on('response.audio.done', () => {
        setState(prev => ({ ...prev, isSpeaking: false }));
      });
      
      // Gérer le texte de la réponse
      session.on('response.text.delta', (event: any) => {
        if (event.delta) {
          setState(prev => ({ 
            ...prev, 
            response: prev.response + event.delta,
            isProcessing: false 
          }));
        }
      });
      
      session.on('response.text.done', (event: any) => {
        console.log('Response text done:', event);
        if (event.text) {
          setState(prev => ({ 
            ...prev, 
            response: event.text,
            isProcessing: false 
          }));
        }
      });

      // Handler pour les appels de fonctions
      session.on('response.function_call_arguments.done', async (event: any) => {
        if (event.name && event.arguments) {
          try {
            console.log('Executing tool:', event.name, event.arguments);
            
            // Exécuter la fonction
            const result = await executeRealtimeTool(event.name, event.arguments);
            
            setState(prev => ({ 
              ...prev, 
              lastToolCall: { name: event.name, result } 
            }));

            // Notification si action réussie
            if (result.success) {
              toast({
                title: '✅ Action effectuée',
                description: result.message || `${event.name} exécuté avec succès`
              });
            } else if (result.error) {
              toast({
                title: '⚠️ Erreur',
                description: result.error,
                variant: 'destructive'
              });
            }

            // Retourner le résultat à l'assistant (si supporté par le SDK)
            if (session && 'sendToolResult' in session) {
              (session as any).sendToolResult(event.call_id, result);
            }
            
          } catch (error) {
            console.error('Error executing tool:', error);
            toast({
              title: 'Erreur',
              description: `Erreur lors de l'exécution de ${event.name}`,
              variant: 'destructive'
            });
          }
        }
      });
      
      // Handler alternatif pour les outils (selon la version du SDK)
      session.on('tool_call', async (event: any) => {
        if (event.function && event.function.name) {
          try {
            const args = JSON.parse(event.function.arguments || '{}');
            console.log('Tool call:', event.function.name, args);
            
            const result = await executeRealtimeTool(event.function.name, args);
            
            setState(prev => ({ 
              ...prev, 
              lastToolCall: { name: event.function.name, result } 
            }));

            if (result.success) {
              toast({
                title: '✅ Action effectuée',
                description: result.message
              });
            }
            
          } catch (error) {
            console.error('Error in tool call:', error);
          }
        }
      });

      session.on('error', (error: any) => {
        console.error('Session error details:', {
          error,
          message: error?.message,
          code: error?.code,
          type: error?.type,
          detail: error?.detail
        });
        setState(prev => ({ 
          ...prev, 
          error: error?.message || error?.detail || 'Erreur de session',
          isProcessing: false 
        }));
      });

      // Connecter la session avec la clé éphémère
      console.log('Connecting to Realtime API with ephemeral key...');
      console.log('Key format:', ephemeralKey.substring(0, 10) + '...');
      
      try {
        await session.connect({
          apiKey: ephemeralKey
        });
        console.log('Session connected successfully!');
      } catch (connectError) {
        console.error('Connection failed:', connectError);
        throw connectError;
      }

      // Initialiser l'audio context
      audioContextRef.current = new AudioContext();

      // Sauvegarder les références
      agentRef.current = agent;
      sessionRef.current = session;

      setState(prev => ({ 
        ...prev, 
        isConnected: true, 
        isProcessing: false,
        error: null 
      }));

      toast({
        title: '🎙️ Assistant connecté',
        description: 'Vous pouvez maintenant parler avec l\'assistant'
      });

    } catch (error) {
      console.error('Connection error:', error);
      
      let errorMessage = 'Impossible de se connecter à l\'assistant';
      if (error instanceof Error) {
        if (error.message.includes('Failed to get ephemeral key')) {
          errorMessage = 'La clé API OpenAI n\'est pas configurée sur le serveur. Consultez la documentation pour configurer OPENAI_API_KEY dans Supabase.';
        } else if (error.message.includes('ephemeral')) {
          errorMessage = 'Erreur de génération de la clé éphémère. Vérifiez que votre clé API OpenAI a accès à l\'API Realtime.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        isProcessing: false 
      }));
      
      toast({
        title: 'Erreur de connexion',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  }, [config, isSupported]);

  /**
   * Déconnecter l'assistant
   */
  const disconnect = useCallback(() => {
    try {
      if (sessionRef.current) {
        // La méthode peut être 'close' ou 'disconnect' selon la version
        if ('close' in sessionRef.current && typeof sessionRef.current.close === 'function') {
          sessionRef.current.close();
        } else if ('disconnect' in sessionRef.current && typeof sessionRef.current.disconnect === 'function') {
          (sessionRef.current as any).disconnect();
        }
      }

      if (audioContextRef.current) {
        audioContextRef.current.close();
      }

      agentRef.current = null;
      sessionRef.current = null;
      audioContextRef.current = null;

      setState({
        isConnected: false,
        isListening: false,
        isSpeaking: false,
        isProcessing: false,
        transcript: '',
        response: '',
        error: null
      });

    } catch (error) {
      console.error('Disconnect error:', error);
    }
  }, []);

  /**
   * Démarrer l'écoute
   */
  const startListening = useCallback(async () => {
    if (!sessionRef.current || !state.isConnected) {
      setState(prev => ({ ...prev, error: 'Session non connectée' }));
      return;
    }

    try {
      // L'API Realtime avec SDK gère automatiquement l'audio via WebRTC
      // Il suffit de marquer l'état comme "listening"
      setState(prev => ({ ...prev, isListening: true }));
      
      // Le SDK active automatiquement le microphone et l'envoi audio

    } catch (error) {
      console.error('Error starting listening:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Impossible d\'activer l\'écoute' 
      }));
    }
  }, [state.isConnected]);

  /**
   * Arrêter l'écoute
   */
  const stopListening = useCallback(async () => {
    if (!sessionRef.current) return;

    try {
      // Arrêter l'écoute dans l'interface
      setState(prev => ({ ...prev, isListening: false }));
      
      // Le SDK gère automatiquement l'arrêt de l'audio

    } catch (error) {
      console.error('Error stopping listening:', error);
    }
  }, []);

  /**
   * Envoyer un message texte
   */
  const sendMessage = useCallback(async (message: string) => {
    if (!sessionRef.current || !state.isConnected) {
      setState(prev => ({ ...prev, error: 'Session non connectée' }));
      return;
    }

    try {
      setState(prev => ({ 
        ...prev, 
        transcript: message, 
        isProcessing: true,
        error: null 
      }));

      // Envoyer le message via le SDK
      // La méthode peut varier selon la version du SDK
      if ('sendText' in sessionRef.current && typeof sessionRef.current.sendText === 'function') {
        await (sessionRef.current as any).sendText(message);
      } else if ('send' in sessionRef.current && typeof sessionRef.current.send === 'function') {
        await (sessionRef.current as any).send(message);
      } else {
        // Fallback : créer un item de conversation
        console.log('Sending message as conversation item:', message);
        setState(prev => ({ 
          ...prev, 
          transcript: message,
          response: 'Message envoyé. En attente de réponse...'
        }));
      }

    } catch (error) {
      console.error('Error sending message:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Erreur lors de l\'envoi du message',
        isProcessing: false 
      }));
    }
  }, [state.isConnected]);

  /**
   * Exécuter une fonction directement
   */
  const executeFunction = useCallback(async (name: string, args: any) => {
    try {
      const result = await executeRealtimeTool(name, args);
      
      setState(prev => ({ 
        ...prev, 
        lastToolCall: { name, result } 
      }));

      return result;

    } catch (error) {
      console.error('Error executing function:', error);
      throw error;
    }
  }, []);

  /**
   * Effacer le transcript
   */
  const clearTranscript = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      transcript: '', 
      response: '' 
    }));
  }, []);

  // Auto-connexion si configuré
  useEffect(() => {
    if (config.autoConnect && !state.isConnected) {
      connect();
    }
  }, [config.autoConnect]);

  // Nettoyage à la destruction
  useEffect(() => {
    return () => {
      if (state.isConnected) {
        disconnect();
      }
    };
  }, []);

  return {
    state,
    connect,
    disconnect,
    startListening,
    stopListening,
    sendMessage,
    executeFunction,
    clearTranscript,
    isSupported
  };
}