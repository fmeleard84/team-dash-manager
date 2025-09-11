/**
 * Hook principal pour l'assistant IA avec Realtime API
 */

import { useState, useEffect, useRef, useCallback } from 'react';
// @ts-ignore - Types might not be perfect
import { RealtimeAgent, RealtimeSession } from '@openai/agents-realtime';
import { ASSISTANT_TOOLS, validateToolParameters } from '../config/tools';
import { buildContextualPrompt } from '../config/prompts';
import { executeTool } from '../tools';
import { toast } from '@/hooks/use-toast';

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

    const apiKey = config.apiKey || localStorage.getItem('openai_api_key');
    if (!apiKey) {
      setState(prev => ({ 
        ...prev, 
        error: 'Clé API OpenAI non configurée' 
      }));
      toast({
        title: 'Configuration requise',
        description: 'Veuillez configurer votre clé API OpenAI in les Settings',
        variant: 'destructive'
      });
      return;
    }

    try {
      setState(prev => ({ ...prev, isProcessing: true, error: null }));

      // Générer une clé éphémère
      const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session: {
            type: "realtime",
            model: "gpt-realtime"
          }
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create session: ${error}`);
      }

      const data = await response.json();
      
      // Extraire la clé éphémère
      const ephemeralKey = data.client_secret?.value || data.client_secret || data.value;
      
      if (!ephemeralKey) {
        throw new Error('No ephemeral key received');
      }
      
      // Créer l'agent avec les instructions
      const agent = new RealtimeAgent({
        name: 'Assistant Team Dash',
        instructions: buildContextualPrompt(config.context, config.customPrompts)
      });

      // Créer la session
      const session = new RealtimeSession(agent, {
        model: "gpt-realtime"
      });

      // Configurer les event listeners
      session.on('conversation.updated', (event: any) => {
        console.log('Conversation updated:', event);
      });

      session.on('conversation.item.appended', (event: any) => {
        console.log('Item appended:', event);
        if (event.item?.formatted?.transcript) {
          setState(prev => ({ 
            ...prev, 
            transcript: event.item.role === 'user' ? event.item.formatted.transcript : prev.transcript,
            response: event.item.role === 'assistant' ? event.item.formatted.transcript : prev.response,
            isProcessing: false 
          }));
        }
      });

      session.on('conversation.item.completed', (event: any) => {
        console.log('Item completed:', event);
        if (event.item?.formatted?.transcript) {
          setState(prev => ({ 
            ...prev, 
            response: event.item.formatted.transcript,
            isProcessing: false 
          }));
        }
      });

      session.on('response.function_call_arguments.done', async (event: any) => {
        if (event.name && event.arguments) {
          try {
            // Valider les paramètres
            const validation = validateToolParameters(event.name, event.arguments);
            if (!validation.valid) {
              console.error('Invalid tool parameters:', validation.errors);
              return;
            }

            // Exécuter la fonction
            const result = await executeTool(event.name, event.arguments);
            
            // Envoyer le résultat à l'assistant
            await session.conversation.item.create({
              type: "function_call_output",
              call_id: event.call_id,
              output: JSON.stringify(result)
            });

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
            }
          } catch (error) {
            console.error('Error executing tool:', error);
            await session.conversation.item.create({
              type: "function_call_output",
              call_id: event.call_id,
              output: JSON.stringify({ 
                success: false, 
                error: error instanceof Error ? error.message : 'Error inconnue' 
              })
            });
          }
        }
      });

      session.on('error', (error: any) => {
        console.error('Session error:', error);
        setState(prev => ({ 
          ...prev, 
          error: error.message || 'Error de session',
          isProcessing: false 
        }));
      });

      // Connecter la session avec la clé éphémère
      console.log('Connecting to session...');
      await session.connect({
        apiKey: ephemeralKey
      });

      // Initialiser l'audio context
      audioContextRef.current = new AudioContext();

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
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Error de Login',
        isProcessing: false 
      }));
      
      toast({
        title: 'Error de Login',
        description: error instanceof Error ? error.message : 'Impossible de se connecter à l\'assistant',
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
        // Essayer différentes méthodes de déconnexion
        if ('close' in sessionRef.current && typeof sessionRef.current.close === 'function') {
          sessionRef.current.close();
        } else if ('disconnect' in sessionRef.current && typeof sessionRef.current.disconnect === 'function') {
          sessionRef.current.disconnect();
        } else if ('destroy' in sessionRef.current && typeof sessionRef.current.destroy === 'function') {
          sessionRef.current.destroy();
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
      // Demander l'accès au microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Configurer l'enregistrement audio
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && sessionRef.current) {
          // Convertir en base64 et envoyer
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64 = reader.result?.toString().split(',')[1];
            if (base64) {
              await sessionRef.current.input_audio_buffer.append({
                audio: base64
              });
            }
          };
          reader.readAsDataURL(event.data);
        }
      };

      mediaRecorder.start(100); // Envoyer des chunks toutes les 100ms
      
      setState(prev => ({ ...prev, isListening: true }));

      // Stocker le recorder pour pouvoir l'arrêter plus tard
      (sessionRef.current as any).mediaRecorder = mediaRecorder;

    } catch (error) {
      console.error('Error starting listening:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Impossible d\'accéder au microphone' 
      }));
    }
  }, [state.isConnected]);

  /**
   * Arrêter l'écoute
   */
  const stopListening = useCallback(async () => {
    if (!sessionRef.current) return;

    try {
      const mediaRecorder = (sessionRef.current as any).mediaRecorder;
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      }

      // Déclencher la génération de réponse
      if (sessionRef.current.input_audio_buffer) {
        await sessionRef.current.input_audio_buffer.commit();
        await sessionRef.current.response.create();
      }

      setState(prev => ({ ...prev, isListening: false, isProcessing: true }));

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

      // Envoyer le message
      await sessionRef.current.conversation.item.create({
        type: "message",
        role: "user",
        content: [{ type: "text", text: message }]
      });

      // Déclencher la génération de réponse
      await sessionRef.current.response.create();

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
      const validation = validateToolParameters(name, args);
      if (!validation.valid) {
        throw new Error(`Invalid parameters: ${validation.errors?.join(', ')}`);
      }

      const result = await executeTool(name, args);
      
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