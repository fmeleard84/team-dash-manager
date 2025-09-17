import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ensureMediaDevices, requestMicrophoneAccess } from '../utils/media-polyfill';

interface RealtimeState {
  isConnected: boolean;
  isRecording: boolean;
  isMuted: boolean;
  audioLevel: number;
  transcript: string;
  response: string;
  assistantMessage: string;
  error: string | null;
  volume: number;
  currentTurnId: string | null;
  conversationHistory: Array<{ role: string; content: string }>;
  state: RealtimeState; // Self-reference for compatibility
}

interface RealtimeConfig {
  context?: string;
  enableTools?: boolean;
  autoConnect?: boolean;
}

export const useRealtimeAssistant = (config: RealtimeConfig = {}) => {
  const [state, setState] = useState<RealtimeState>({
    isConnected: false,
    isRecording: false,
    isMuted: false,
    audioLevel: 0,
    transcript: '',
    response: '',
    assistantMessage: '',
    error: null,
    volume: 0,
    currentTurnId: null,
    conversationHistory: [],
    get state() { return this; }
  });

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const dataChannel = useRef<RTCDataChannel | null>(null);
  const mediaStream = useRef<MediaStream | null>(null);
  const ephemeralKeyRef = useRef<string | null>(null);

  // Check WebRTC support
  const isSupported = () => {
    return !!(
      window.RTCPeerConnection &&
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia
    );
  };

  // Get ephemeral key from Edge Function
  const getEphemeralKey = async (): Promise<string> => {
    try {
      const response = await supabase.functions.invoke('generate-realtime-key', {
        method: 'POST'
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to get ephemeral key');
      }

      const { ephemeralKey } = response.data;
      if (!ephemeralKey) {
        throw new Error('No ephemeral key received');
      }

      return ephemeralKey;
    } catch (error) {
      console.error('Error getting ephemeral key:', error);
      throw error;
    }
  };

  // Connect to OpenAI Realtime
  const connect = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));

      // Check browser support first
      if (!isSupported()) {
        throw new Error('WebRTC not supported in this browser. Please use Chrome, Firefox, or Edge.');
      }

      // Get ephemeral key
      const ephemeralKey = await getEphemeralKey();
      ephemeralKeyRef.current = ephemeralKey;

      // Ensure media devices are available (with polyfill if needed)
      ensureMediaDevices();

      // Check if mediaDevices is available after polyfill
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Media devices not available. Please ensure you are using HTTPS or localhost.');
      }

      // Request microphone access with better error handling
      try {
        mediaStream.current = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
      } catch (error: any) {
        console.error('Failed to get user media:', error);
        // Try again with simpler constraints
        mediaStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      // Create peer connection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      peerConnection.current = pc;

      // Add audio track
      const audioTrack = mediaStream.current.getAudioTracks()[0];
      pc.addTrack(audioTrack, mediaStream.current);

      // Handle audio from assistant
      pc.ontrack = (event) => {
        const audio = document.createElement('audio');
        audio.srcObject = event.streams[0];
        audio.autoplay = true;
      };

      // Create data channel for messages
      const dc = pc.createDataChannel('messages', {
        ordered: true
      });
      dataChannel.current = dc;

      dc.onopen = () => {
        console.log('Data channel opened');
        setState(prev => ({ ...prev, isConnected: true, isRecording: true }));

        // Send session configuration
        const sessionConfig = {
          type: 'session.update',
          session: {
            model: 'gpt-4o-realtime-preview-2024-12-17',
            instructions: getSystemPrompt(config.context),
            voice: 'echo',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            modalities: ['text', 'audio'],
            temperature: 0.8,
            tools: config.enableTools ? [] : undefined
          }
        };
        dc.send(JSON.stringify(sessionConfig));
      };

      dc.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleRealtimeMessage(data);
        } catch (e) {
          console.error('Error parsing message:', e);
        }
      };

      dc.onerror = (error) => {
        console.error('Data channel error:', error);
        setState(prev => ({ ...prev, error: 'Connection error' }));
      };

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Connect to OpenAI Realtime API
      const response = await fetch('https://api.openai.com/v1/realtime', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp'
        },
        body: offer.sdp
      });

      if (!response.ok) {
        throw new Error(`Connection failed: ${response.statusText}`);
      }

      const answer = await response.text();
      await pc.setRemoteDescription({
        type: 'answer',
        sdp: answer
      });

    } catch (error: any) {
      console.error('Connection error:', error);
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to connect',
        isConnected: false
      }));
      throw error;
    }
  }, [config]);

  // Handle messages from OpenAI Realtime
  const handleRealtimeMessage = (data: any) => {
    switch (data.type) {
      case 'transcript':
        if (data.role === 'user') {
          setState(prev => ({ ...prev, transcript: data.content }));
        }
        break;

      case 'response.text.delta':
        setState(prev => ({
          ...prev,
          response: prev.response + data.content,
          assistantMessage: prev.assistantMessage + data.content
        }));
        break;

      case 'response.text.done':
        setState(prev => ({
          ...prev,
          conversationHistory: [
            ...prev.conversationHistory,
            { role: 'assistant', content: prev.response }
          ]
        }));
        break;

      case 'audio_buffer.speech_started':
        setState(prev => ({ ...prev, isRecording: true }));
        break;

      case 'audio_buffer.speech_stopped':
        setState(prev => ({ ...prev, isRecording: false }));
        break;

      case 'error':
        console.error('Realtime error:', data);
        setState(prev => ({ ...prev, error: data.message || 'Unknown error' }));
        break;
    }
  };

  // Disconnect
  const disconnect = useCallback(async () => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    if (mediaStream.current) {
      mediaStream.current.getTracks().forEach(track => track.stop());
      mediaStream.current = null;
    }

    if (dataChannel.current) {
      dataChannel.current.close();
      dataChannel.current = null;
    }

    setState(prev => ({
      ...prev,
      isConnected: false,
      isRecording: false,
      error: null
    }));
  }, []);

  // Send a text message
  const sendMessage = useCallback(async (message: string) => {
    if (!dataChannel.current || dataChannel.current.readyState !== 'open') {
      console.error('Data channel not ready');
      return;
    }

    const messageData = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: message }]
      }
    };

    dataChannel.current.send(JSON.stringify(messageData));

    // Trigger response
    const responseData = {
      type: 'response.create'
    };
    dataChannel.current.send(JSON.stringify(responseData));

    setState(prev => ({
      ...prev,
      transcript: message,
      conversationHistory: [
        ...prev.conversationHistory,
        { role: 'user', content: message }
      ]
    }));
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (!mediaStream.current) return;

    const audioTrack = mediaStream.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setState(prev => ({ ...prev, isMuted: !audioTrack.enabled }));
    }
  }, []);

  // Clear transcript
  const clearTranscript = useCallback(() => {
    setState(prev => ({ ...prev, transcript: '' }));
  }, []);

  // Clear history
  const clearHistory = useCallback(() => {
    setState(prev => ({
      ...prev,
      conversationHistory: [],
      transcript: '',
      response: '',
      assistantMessage: ''
    }));
  }, []);

  // Set system prompt (for future use)
  const setPrompt = useCallback((prompt: string) => {
    // This would update the session configuration
    console.log('Setting prompt:', prompt);
  }, []);

  // Auto-connect if configured
  useEffect(() => {
    if (config.autoConnect) {
      connect();
    }

    return () => {
      if (peerConnection.current) {
        disconnect();
      }
    };
  }, [config.autoConnect]);

  return {
    state,
    isConnected: state.isConnected,
    isRecording: state.isRecording,
    isMuted: state.isMuted,
    audioLevel: state.audioLevel,
    transcript: state.transcript,
    assistantMessage: state.assistantMessage,
    error: state.error,
    volume: state.volume,
    currentTurnId: state.currentTurnId,
    conversationHistory: state.conversationHistory,
    connect,
    disconnect,
    toggleMute,
    sendMessage,
    clearTranscript,
    clearHistory,
    setPrompt,
    isSupported
  };
};

// Helper function to get system prompt based on context
function getSystemPrompt(context?: string): string {
  if (context === 'qualification') {
    return `Tu es un évaluateur expert pour les tests de qualification des candidats.
Tu dois poser exactement 10 questions pertinentes en fonction du profil du candidat.
Après chaque réponse, donne un score sur 10 et un feedback constructif.
Sois bienveillant mais rigoureux dans ton évaluation.
Format tes réponses de manière claire : "Question X sur 10: [ta question]"`;
  }

  return `Tu es un assistant IA intelligent et bienveillant.
Aide l'utilisateur de manière claire et concise.
Reste professionnel et pertinent dans tes réponses.`;
}