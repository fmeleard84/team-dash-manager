/**
 * Hook Audio Temps Réel - Module IA QUALIFICATION
 *
 * Intègre le service RealtimeAudioService dans l'écosystème React
 * pour la gestion de l'audio temps réel lors des sessions de qualification.
 *
 * Fonctionnalités :
 * - Gestion de l'état de connexion audio
 * - Contrôles d'enregistrement et de lecture
 * - Transcription en temps réel
 * - Gestion des événements audio
 * - Surveillance de la qualité de connexion
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

import { RealtimeAudioService } from '../services/realtimeAudioService';
import type {
  RealtimeConnection,
  RealtimeMessage,
  TestConfig,
  MessageType,
  UseRealtimeAudioReturn
} from '../types';

/**
 * Hook pour la gestion de l'audio temps réel avec OpenAI
 */
export function useRealtimeAudio(): UseRealtimeAudioReturn {
  // Service audio (singleton)
  const serviceRef = useRef<RealtimeAudioService>();

  // État de connexion
  const [connection, setConnection] = useState<RealtimeConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // État audio
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [volume, setVolume] = useState(1);

  // Transcription et messages
  const [transcript, setTranscript] = useState('');
  const [assistantMessage, setAssistantMessage] = useState('');

  // Gestion d'erreurs
  const [error, setError] = useState<string | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor'>('good');

  // Callbacks d'événements
  const messageCallbacks = useRef<Map<string, (message: RealtimeMessage) => void>>(new Map());
  const transcriptCallbacks = useRef<Map<string, (transcript: string) => void>>(new Map());
  const errorCallbacks = useRef<Map<string, (error: Error) => void>>(new Map());

  /**
   * Initialise le service audio s'il n'existe pas déjà
   */
  const initializeService = useCallback(() => {
    if (!serviceRef.current) {
      serviceRef.current = new RealtimeAudioService();

      // Configuration des listeners d'événements
      setupEventListeners(serviceRef.current);
      setIsInitialized(true);
    }
    return serviceRef.current;
  }, []);

  /**
   * Configure les listeners d'événements du service
   */
  const setupEventListeners = useCallback((service: RealtimeAudioService) => {
    // Événements de session
    service.on('session_start', () => {
      setIsConnected(true);
      setError(null);
      toast.success('Connexion audio établie');
    });

    service.on('session_end', (data) => {
      setIsConnected(false);
      setIsRecording(false);
      toast.info('Session audio terminée');
    });

    // Événements d'enregistrement
    service.on('recording_started', () => {
      setIsRecording(true);
    });

    service.on('recording_stopped', () => {
      setIsRecording(false);
    });

    // Événements de parole
    service.on('speech_started', () => {
      setIsRecording(true);
    });

    service.on('speech_stopped', () => {
      setIsRecording(false);
    });

    // Transcription temps réel
    service.on('transcript', (data: { transcript: string }) => {
      setTranscript(data.transcript);

      // Notifier les callbacks
      transcriptCallbacks.current.forEach(callback => {
        callback(data.transcript);
      });
    });

    // Messages de l'assistant
    service.on('assistant_message', (data: { message: string }) => {
      setAssistantMessage(data.message);
    });

    // Contrôles audio
    service.on('mute_toggled', (data: { isMuted: boolean }) => {
      setIsMuted(data.isMuted);
    });

    service.on('volume_changed', (data: { volume: number }) => {
      setVolume(data.volume);
    });

    // Gestion d'erreurs
    service.on('error', (data: { error: string | Error }) => {
      const errorMessage = typeof data.error === 'string' ? data.error : data.error.message;
      setError(errorMessage);
      toast.error(`Erreur audio: ${errorMessage}`);

      // Notifier les callbacks d'erreur
      const errorObj = typeof data.error === 'string' ? new Error(data.error) : data.error;
      errorCallbacks.current.forEach(callback => {
        callback(errorObj);
      });
    });

    // Messages génériques
    service.on('response_complete', (data) => {
      messageCallbacks.current.forEach(callback => {
        callback({
          type: 'feedback',
          data,
          timestamp: new Date().toISOString()
        });
      });
    });

  }, []);

  /**
   * Démarre la connexion audio
   */
  const connect = useCallback(async (
    config?: Partial<TestConfig['audioConfig']>
  ): Promise<boolean> => {
    const service = initializeService();

    setError(null);

    try {
      const success = await service.initialize(config);

      if (success) {
        const connectionInfo = service.getConnectionInfo();
        setConnection(connectionInfo);

        // Démarrer le monitoring du niveau audio
        startAudioLevelMonitoring(service);
      }

      return success;
    } catch (error) {
      console.error('[useRealtimeAudio] Erreur connexion:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur de connexion';
      setError(errorMessage);
      return false;
    }
  }, [initializeService]);

  /**
   * Ferme la connexion audio
   */
  const disconnect = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.disconnect();
      setConnection(null);
      setIsConnected(false);
      setIsRecording(false);
      setTranscript('');
      setAssistantMessage('');
      setError(null);
    }
  }, []);

  /**
   * Démarre l'enregistrement
   */
  const startRecording = useCallback(() => {
    if (serviceRef.current && isConnected) {
      serviceRef.current.startRecording();
    } else {
      toast.error('Connexion audio non établie');
    }
  }, [isConnected]);

  /**
   * Arrête l'enregistrement
   */
  const stopRecording = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.stopRecording();
    }
  }, []);

  /**
   * Active/désactive le micro
   */
  const toggleMute = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.toggleMute();
    }
  }, []);

  /**
   * Définit le volume
   */
  const setVolumeLevel = useCallback((newVolume: number) => {
    if (serviceRef.current) {
      serviceRef.current.setVolume(newVolume);
    }
  }, []);

  /**
   * Envoie un message texte
   */
  const sendMessage = useCallback((message: string) => {
    if (serviceRef.current && isConnected) {
      serviceRef.current.sendMessage(message);
    } else {
      toast.error('Connexion audio non disponible');
    }
  }, [isConnected]);

  /**
   * Démarre le monitoring du niveau audio
   */
  const startAudioLevelMonitoring = useCallback((service: RealtimeAudioService) => {
    const monitorLevel = () => {
      if (!isConnected) return;

      const sessionState = service.getSessionState();
      if (sessionState.audioLevel !== undefined) {
        setAudioLevel(sessionState.audioLevel);
        setConnectionQuality(sessionState.connectionQuality || 'good');
      }

      if (isConnected) {
        requestAnimationFrame(monitorLevel);
      }
    };

    monitorLevel();
  }, [isConnected]);

  /**
   * Ajoute un callback pour les messages
   */
  const onMessage = useCallback((callback: (message: RealtimeMessage) => void) => {
    const id = Math.random().toString(36).substring(7);
    messageCallbacks.current.set(id, callback);

    // Retourner une fonction de cleanup
    return () => {
      messageCallbacks.current.delete(id);
    };
  }, []);

  /**
   * Ajoute un callback pour la transcription
   */
  const onTranscript = useCallback((callback: (transcript: string) => void) => {
    const id = Math.random().toString(36).substring(7);
    transcriptCallbacks.current.set(id, callback);

    // Retourner une fonction de cleanup
    return () => {
      transcriptCallbacks.current.delete(id);
    };
  }, []);

  /**
   * Ajoute un callback pour les erreurs
   */
  const onError = useCallback((callback: (error: Error) => void) => {
    const id = Math.random().toString(36).substring(7);
    errorCallbacks.current.set(id, callback);

    // Retourner une fonction de cleanup
    return () => {
      errorCallbacks.current.delete(id);
    };
  }, []);

  /**
   * Obtient des statistiques détaillées de la connexion
   */
  const getConnectionStats = useCallback(() => {
    if (!serviceRef.current || !isConnected) return null;

    const sessionState = serviceRef.current.getSessionState();
    const connectionInfo = serviceRef.current.getConnectionInfo();

    return {
      isConnected,
      quality: connectionQuality,
      audioLevel,
      volume,
      isMuted,
      isRecording,
      transcriptLength: transcript.length,
      assistantResponseLength: assistantMessage.length,
      error,
      sessionState,
      connectionInfo
    };
  }, [isConnected, connectionQuality, audioLevel, volume, isMuted, isRecording, transcript, assistantMessage, error]);

  // Nettoyage à la déconnexion du composant
  useEffect(() => {
    return () => {
      if (serviceRef.current) {
        serviceRef.current.disconnect();
      }

      // Nettoyer tous les callbacks
      messageCallbacks.current.clear();
      transcriptCallbacks.current.clear();
      errorCallbacks.current.clear();
    };
  }, []);

  // Synchroniser l'état isConnected avec le service
  useEffect(() => {
    if (serviceRef.current) {
      const sessionState = serviceRef.current.getSessionState();
      if (sessionState.isConnected !== undefined && sessionState.isConnected !== isConnected) {
        setIsConnected(sessionState.isConnected);
      }
    }
  }, [isConnected]);

  return {
    // Connexion
    connection,
    isConnected,
    isInitialized,

    // Audio
    isRecording,
    isMuted,
    audioLevel,
    volume,

    // Transcription
    transcript,
    assistantMessage,

    // Actions
    connect,
    disconnect,
    startRecording,
    stopRecording,
    toggleMute,
    setVolume: setVolumeLevel,
    sendMessage,

    // État
    error,
    connectionQuality,

    // Événements
    onMessage,
    onTranscript,
    onError,

    // Utilitaires
    getConnectionStats
  };
}