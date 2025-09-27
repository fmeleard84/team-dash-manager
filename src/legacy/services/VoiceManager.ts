/**
 * VoiceManager - Service unifié pour toutes les fonctionnalités vocales
 * Phase 2 de refactorisation - Consolidation des services voice
 */

import { EventEmitter } from 'events';

// Types pour le VoiceManager
export interface VoiceConfig {
  provider?: 'native' | 'elevenlabs' | 'openai';
  language?: string;
  voice?: string;
  apiKey?: string;
  webhookUrl?: string;
}

export interface VoiceState {
  isConnected: boolean;
  isRecording: boolean;
  isMuted: boolean;
  isProcessing: boolean;
  volume: number;
  error: string | null;
}

export interface VoiceMessage {
  id: string;
  type: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  audioUrl?: string;
  metadata?: Record<string, any>;
}

/**
 * Service unifié pour gérer toutes les interactions vocales
 * Remplace les multiples implémentations VoiceChat/RealtimeVoice
 */
export class VoiceManager extends EventEmitter {
  private static instance: VoiceManager | null = null;

  private config: VoiceConfig;
  private state: VoiceState;
  private messages: VoiceMessage[] = [];
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;

  private constructor(config?: VoiceConfig) {
    super();

    this.config = {
      provider: 'native',
      language: 'fr-FR',
      voice: 'default',
      ...config
    };

    this.state = {
      isConnected: false,
      isRecording: false,
      isMuted: false,
      isProcessing: false,
      volume: 0,
      error: null
    };
  }

  /**
   * Singleton pour assurer une instance unique
   */
  public static getInstance(config?: VoiceConfig): VoiceManager {
    if (!VoiceManager.instance) {
      VoiceManager.instance = new VoiceManager(config);
    }
    return VoiceManager.instance;
  }

  /**
   * Initialise la connexion vocale
   */
  public async connect(): Promise<void> {
    try {
      // Demander l'accès au microphone
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Créer le contexte audio
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Configurer le media recorder
      this.mediaRecorder = new MediaRecorder(this.stream);

      this.mediaRecorder.ondataavailable = this.handleAudioData.bind(this);
      this.mediaRecorder.onerror = this.handleRecorderError.bind(this);

      this.updateState({ isConnected: true, error: null });
      this.emit('connected');

    } catch (error) {
      console.error('VoiceManager connection error:', error);
      this.updateState({
        isConnected: false,
        error: 'Impossible d\'accéder au microphone'
      });
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Déconnecte et nettoie les ressources
   */
  public async disconnect(): Promise<void> {
    if (this.mediaRecorder && this.state.isRecording) {
      this.mediaRecorder.stop();
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    this.mediaRecorder = null;
    this.updateState({
      isConnected: false,
      isRecording: false,
      error: null
    });

    this.emit('disconnected');
  }

  /**
   * Démarre l'enregistrement
   */
  public startRecording(): void {
    if (!this.mediaRecorder || this.state.isRecording) {
      return;
    }

    this.mediaRecorder.start();
    this.updateState({ isRecording: true });
    this.emit('recordingStarted');
  }

  /**
   * Arrête l'enregistrement
   */
  public stopRecording(): void {
    if (!this.mediaRecorder || !this.state.isRecording) {
      return;
    }

    this.mediaRecorder.stop();
    this.updateState({ isRecording: false });
    this.emit('recordingStopped');
  }

  /**
   * Active/désactive le mute
   */
  public toggleMute(): void {
    const isMuted = !this.state.isMuted;

    if (this.stream) {
      this.stream.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
    }

    this.updateState({ isMuted });
    this.emit('muteToggled', isMuted);
  }

  /**
   * Envoie un message texte
   */
  public async sendMessage(text: string): Promise<void> {
    const message: VoiceMessage = {
      id: this.generateId(),
      type: 'user',
      text,
      timestamp: new Date()
    };

    this.messages.push(message);
    this.emit('messageSent', message);

    // Simuler une réponse (à remplacer par l'appel API réel)
    await this.processMessage(message);
  }

  /**
   * Obtient l'historique des messages
   */
  public getMessages(): VoiceMessage[] {
    return [...this.messages];
  }

  /**
   * Efface l'historique
   */
  public clearHistory(): void {
    this.messages = [];
    this.emit('historyCleared');
  }

  /**
   * Obtient l'état actuel
   */
  public getState(): VoiceState {
    return { ...this.state };
  }

  /**
   * Configure le provider vocal
   */
  public setProvider(provider: VoiceConfig['provider']): void {
    this.config.provider = provider;
    this.emit('providerChanged', provider);
  }

  /**
   * Configure la langue
   */
  public setLanguage(language: string): void {
    this.config.language = language;
    this.emit('languageChanged', language);
  }

  /**
   * Définit le prompt système
   */
  public setSystemPrompt(prompt: string): void {
    // Stockage du prompt pour utilisation ultérieure
    this.emit('promptChanged', prompt);
  }

  // Méthodes privées

  private updateState(updates: Partial<VoiceState>): void {
    this.state = { ...this.state, ...updates };
    this.emit('stateChanged', this.state);
  }

  private handleAudioData(event: BlobEvent): void {
    if (event.data.size > 0) {
      this.emit('audioData', event.data);
      // Ici, on pourrait envoyer l'audio à un service de transcription
    }
  }

  private handleRecorderError(error: Event): void {
    console.error('MediaRecorder error:', error);
    this.updateState({
      error: 'Erreur d\'enregistrement',
      isRecording: false
    });
    this.emit('error', error);
  }

  private async processMessage(message: VoiceMessage): Promise<void> {
    this.updateState({ isProcessing: true });

    try {
      // Simuler un délai de traitement
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Créer une réponse simulée
      const response: VoiceMessage = {
        id: this.generateId(),
        type: 'assistant',
        text: `Je comprends votre message: "${message.text}". Comment puis-je vous aider ?`,
        timestamp: new Date()
      };

      this.messages.push(response);
      this.emit('messageReceived', response);

    } catch (error) {
      console.error('Error processing message:', error);
      this.updateState({ error: 'Erreur de traitement' });
      this.emit('error', error);
    } finally {
      this.updateState({ isProcessing: false });
    }
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Méthode pour nettoyer le singleton (pour les tests)
   */
  public static resetInstance(): void {
    if (VoiceManager.instance) {
      VoiceManager.instance.disconnect();
      VoiceManager.instance = null;
    }
  }
}

// Hook React pour utiliser le VoiceManager
export const useVoiceManager = (config?: VoiceConfig) => {
  const [state, setState] = React.useState<VoiceState>({
    isConnected: false,
    isRecording: false,
    isMuted: false,
    isProcessing: false,
    volume: 0,
    error: null
  });

  const [messages, setMessages] = React.useState<VoiceMessage[]>([]);
  const managerRef = React.useRef<VoiceManager | null>(null);

  React.useEffect(() => {
    const manager = VoiceManager.getInstance(config);
    managerRef.current = manager;

    // S'abonner aux événements
    const handleStateChange = (newState: VoiceState) => setState(newState);
    const handleMessage = () => setMessages(manager.getMessages());

    manager.on('stateChanged', handleStateChange);
    manager.on('messageSent', handleMessage);
    manager.on('messageReceived', handleMessage);
    manager.on('historyCleared', handleMessage);

    // Initialiser l'état
    setState(manager.getState());
    setMessages(manager.getMessages());

    return () => {
      manager.off('stateChanged', handleStateChange);
      manager.off('messageSent', handleMessage);
      manager.off('messageReceived', handleMessage);
      manager.off('historyCleared', handleMessage);
    };
  }, []);

  return {
    state,
    messages,
    connect: () => managerRef.current?.connect(),
    disconnect: () => managerRef.current?.disconnect(),
    startRecording: () => managerRef.current?.startRecording(),
    stopRecording: () => managerRef.current?.stopRecording(),
    toggleMute: () => managerRef.current?.toggleMute(),
    sendMessage: (text: string) => managerRef.current?.sendMessage(text),
    clearHistory: () => managerRef.current?.clearHistory(),
    setProvider: (provider: VoiceConfig['provider']) => managerRef.current?.setProvider(provider),
    setLanguage: (language: string) => managerRef.current?.setLanguage(language),
    setSystemPrompt: (prompt: string) => managerRef.current?.setSystemPrompt(prompt),
  };
};

// Import React pour le hook
import * as React from 'react';

export default VoiceManager;