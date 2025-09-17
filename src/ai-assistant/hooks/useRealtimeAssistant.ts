/**
 * Hook principal pour l'assistant IA avec Realtime API
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { REALTIME_TOOLS, executeRealtimeTool } from '../config/realtime-tools';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { generateExpertisePrompt } from '../tools/expertise-provider';

// Implémentation alternative sans dépendance externe
// On utilisera l'API OpenAI directement via des appels REST

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

  const webSocketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

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

      const ephemeralKey = typeof funcData.ephemeralKey === 'object' 
        ? funcData.ephemeralKey.key || JSON.stringify(funcData.ephemeralKey)
        : funcData.ephemeralKey;
      console.log('Ephemeral key received, connecting...', typeof ephemeralKey);

      // Récupérer les prompts depuis prompts_ia (table avec RLS correctes)
      let promptsQuery = supabase
        .from('prompts_ia')
        .select('*')
        .eq('active', true);

      // Pour la qualification, chercher les prompts avec [QUALIFICATION] dans le nom
      if (config.context === 'qualification') {
        promptsQuery = promptsQuery.or(`name.ilike.%QUALIFICATION%,context.eq.general`);
      } else if (config.context) {
        promptsQuery = promptsQuery.or(`context.eq.${config.context},context.eq.general`);
      }

      const { data: prompts, error: promptsError } = await promptsQuery
        .order('priority', { ascending: false });

      if (promptsError) {
        console.error('Error loading prompts:', promptsError);
      }

      // Récupérer les expertises disponibles dans la base de données
      const expertisePrompt = await generateExpertisePrompt();
      console.log('📚 Loaded expertise database:', expertisePrompt && expertisePrompt.split('\n').length > 0 ? 'OK' : 'Empty');

      // Construire les instructions à partir des prompts
      let instructions = '';
      if (prompts && prompts.length > 0) {
        // Pour le contexte qualification, utiliser les prompts avec [QUALIFICATION]
        if (config.context === 'qualification') {
          const qualificationPrompts = prompts.filter(p => p.name?.includes('[QUALIFICATION]'));
          const generalPrompts = prompts.filter(p => p.context === 'general' && !p.name?.includes('[QUALIFICATION]'));

          instructions = [
            ...qualificationPrompts.map(p => p.prompt),
            ...generalPrompts.map(p => p.prompt)
          ].filter(Boolean).join('\n\n');

          console.log('Loaded qualification prompts:', {
            qualification: qualificationPrompts.length,
            general: generalPrompts.length
          });
        } else {
          // Organiser les prompts par type logique (basé sur le contexte)
          const systemPrompts = prompts.filter(p => p.context === 'general');
          const contextPrompts = prompts.filter(p =>
            ['team-composition', 'project-management', 'technical', 'meeting', 'task-management'].includes(p.context)
          );
          const behaviorPrompts = prompts.filter(p => p.context === 'behavior');

          instructions = [
            '=== INSTRUCTIONS SYSTÈME ===',
            ...systemPrompts.map(p => p.prompt),
            '\n=== CONTEXTE SPÉCIFIQUE ===',
            ...contextPrompts.map(p => `[${p.context}]\n${p.prompt}`),
            behaviorPrompts.length > 0 ? '\n=== COMPORTEMENT ===' : '',
            ...behaviorPrompts.map(p => p.prompt),
            '\n=== EXPERTISES DISPONIBLES ===',
            expertisePrompt
          ].filter(Boolean).join('\n\n');

          console.log('Loaded prompts:', {
            system: systemPrompts.length,
            context: contextPrompts.length,
            behavior: behaviorPrompts.length,
            expertises: 'loaded'
          });
        }
      } else {
        instructions = `Tu es un assistant intelligent pour Team Dash Manager. Aide les utilisateurs à gérer leurs projets et équipes.\n\n${expertisePrompt}`;
      }

      // Ajouter le contexte spécifique si fourni
      if (config.context) {
        instructions += `\n\nContexte actuel: ${config.context}`;
      }

      // Créer une connexion WebSocket avec l'API OpenAI Realtime
      // IMPORTANT: Ne PAS spécifier le modèle dans l'URL, il sera défini dans session.update
      const wsUrl = `wss://api.openai.com/v1/realtime`;

      // Format correct selon la documentation OpenAI officielle Voice Agents
      // La clé éphémère doit être dans le subprotocol comme auth bearer token
      const subprotocols = [
        'openai-beta.realtime-v1',
        `openai-insecure-api-key.${ephemeralKey}`
      ];

      console.log('🔌 Connecting to WebSocket:', wsUrl);
      console.log('🔑 Using ephemeral key:', ephemeralKey.substring(0, 10) + '...');
      console.log('📋 Subprotocols:', subprotocols);

      // Créer la connexion WebSocket avec le bon subprotocol
      console.log('🔄 Creating WebSocket with subprotocols:', subprotocols);

      try {
        const ws = new WebSocket(wsUrl, subprotocols);
        webSocketRef.current = ws;

        console.log('✅ WebSocket created, state:', ws.readyState);
      } catch (wsError) {
        console.error('❌ Failed to create WebSocket:', wsError);
        setState(prev => ({
          ...prev,
          error: 'Failed to create WebSocket connection',
          isProcessing: false
        }));
        throw wsError;
      }

      // Configuration de la session après connexion
      const ws = webSocketRef.current;
      if (!ws) {
        throw new Error('WebSocket not initialized');
      }

      ws.onopen = () => {
        console.log('✅ WebSocket connected');

        // Configuration de session pour le contexte qualification
        const sessionConfig = {
          type: 'session.update',
          session: {
            model: 'gpt-realtime', // Nouveau modèle selon la doc OpenAI
            modalities: ['text', 'audio'],
            instructions: instructions + '\n\nIMPORTANT: Réponds de façon très concise et directe. Maximum 2-3 phrases courtes.',
            voice: 'echo',
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
            temperature: 0.6,
            max_response_output_tokens: 500
          }
        };

        // Ajouter les tools seulement si activés et pas en contexte qualification
        if (config.enableTools !== false && config.context !== 'qualification') {
          sessionConfig.session.tools = REALTIME_TOOLS.map(tool => ({
            type: 'function',
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters
          }));
        }

        console.log('📤 Sending session config:', sessionConfig);
        ws.send(JSON.stringify(sessionConfig));

        setState(prev => ({ 
          ...prev, 
          isConnected: true, 
          isProcessing: false 
        }));
      };

      // Gérer les messages WebSocket
      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);

          // Log détaillé pour le debug sauf pour les audio chunks
          if (!data.type?.includes('audio')) {
            console.log(`📡 Event [${data.type}]:`, data);
          }

          switch (data.type) {
            case 'session.created':
              console.log('✅ Session created with config:', data.session);
              break;

            case 'session.updated':
              console.log('✅ Session updated successfully');
              break;

            case 'conversation.item.created':
              if (data.item?.type === 'message') {
                const content = data.item?.content?.[0]?.text || '';
                if (data.item?.role === 'user') {
                  setState(prev => ({ 
                    ...prev, 
                    transcript: content,
                    isProcessing: true 
                  }));
                } else if (data.item?.role === 'assistant') {
                  setState(prev => ({ 
                    ...prev, 
                    response: content,
                    isSpeaking: true 
                  }));
                }
              }
              break;

            case 'response.done':
              setState(prev => ({ 
                ...prev, 
                isProcessing: false,
                isSpeaking: false
              }));
              break;

            case 'response.function_call_arguments.done':
              if (data.name && data.arguments) {
                console.log('🎯 Function call:', data.name, data.arguments);
                const args = JSON.parse(data.arguments);
                const result = await executeRealtimeTool(data.name, args);
                
                setState(prev => ({ 
                  ...prev, 
                  lastToolCall: { name: data.name, result } 
                }));

                if (result.success) {
                  toast({
                    title: '✅ Action effectuée',
                    description: result.message
                  });
                }

                // Envoyer le résultat de la fonction
                ws.send(JSON.stringify({
                  type: 'conversation.item.create',
                  item: {
                    type: 'function_call_output',
                    call_id: data.call_id,
                    output: JSON.stringify(result)
                  }
                }));
              }
              break;

            case 'error':
              console.error('❌ WebSocket error:', data);
              setState(prev => ({ 
                ...prev, 
                error: data.error?.message || 'Une erreur est survenue',
                isProcessing: false,
                isSpeaking: false
              }));
              break;
          }
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setState(prev => ({ 
          ...prev, 
          error: 'Erreur de connexion',
          isConnected: false,
          isProcessing: false
        }));
      };

      ws.onclose = () => {
        console.log('🔌 WebSocket closed');
        setState(prev => ({ 
          ...prev, 
          isConnected: false,
          isListening: false,
          isSpeaking: false,
          isProcessing: false
        }));
      };

      // Initialiser le contexte audio si nécessaire
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

    } catch (error: any) {
      console.error('Connection error:', error);
      setState(prev => ({ 
        ...prev, 
        error: error.message || 'Erreur de connexion',
        isProcessing: false 
      }));
      
      toast({
        title: '❌ Erreur de connexion',
        description: error.message || 'Impossible de se connecter à l\'assistant',
        variant: 'destructive'
      });
    }
  }, [config, isSupported]);

  /**
   * Démarrer l'écoute audio
   */
  const startListening = useCallback(async () => {
    if (!webSocketRef.current || !audioContextRef.current) {
      toast({
        title: '⚠️ Non connecté',
        description: 'Connectez-vous d\'abord à l\'assistant',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Demander l'accès au microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Créer un MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });
      mediaRecorderRef.current = mediaRecorder;

      // Envoyer les données audio au WebSocket
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && webSocketRef.current?.readyState === WebSocket.OPEN) {
          // Convertir en base64 et envoyer
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Audio = reader.result?.toString().split(',')[1];
            if (base64Audio) {
              webSocketRef.current?.send(JSON.stringify({
                type: 'input_audio_buffer.append',
                audio: base64Audio
              }));
            }
          };
          reader.readAsDataURL(event.data);
        }
      };

      // Démarrer l'enregistrement
      mediaRecorder.start(100); // Envoyer des chunks toutes les 100ms
      setState(prev => ({ ...prev, isListening: true }));
    } catch (error: any) {
      console.error('Microphone error:', error);
      setState(prev => ({ 
        ...prev, 
        error: error.message || 'Impossible d\'accéder au microphone'
      }));
      toast({
        title: '❌ Erreur',
        description: 'Impossible d\'accéder au microphone',
        variant: 'destructive'
      });
    }
  }, []);

  /**
   * Arrêter l'écoute audio
   */
  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setState(prev => ({ ...prev, isListening: false }));
  }, []);

  /**
   * Déconnecter l'assistant
   */
  const disconnect = useCallback(() => {
    try {
      // Arrêter l'écoute
      stopListening();

      // Fermer la connexion WebSocket
      if (webSocketRef.current) {
        webSocketRef.current.close();
        webSocketRef.current = null;
      }

      // Fermer le contexte audio
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

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
  }, [stopListening]);

  /**
   * Envoyer un message texte
   */
  const sendMessage = useCallback(async (message: string) => {
    if (!webSocketRef.current || webSocketRef.current.readyState !== WebSocket.OPEN) {
      setState(prev => ({ ...prev, error: 'Non connecté à l\'assistant' }));
      return;
    }

    try {
      console.log('📤 Sending message:', message);
      
      setState(prev => ({ 
        ...prev, 
        transcript: message, 
        isProcessing: true,
        error: null 
      }));

      // Envoyer le message via WebSocket
      webSocketRef.current.send(JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{ 
            type: 'input_text', 
            text: message 
          }]
        }
      }));

      // Demander une réponse
      webSocketRef.current.send(JSON.stringify({
        type: 'response.create'
      }));

    } catch (error) {
      console.error('Error sending message:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Erreur lors de l\'envoi du message',
        isProcessing: false 
      }));
    }
  }, []);

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