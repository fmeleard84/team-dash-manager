import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface VoiceChatProps {
  onTranscription: (text: string) => void;
  botResponse?: string;
  isEnabled: boolean;
  onToggle: () => void;
}

export function VoiceChat({ onTranscription, botResponse, isEnabled, onToggle }: VoiceChatProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);

  // Démarrer/arrêter l'écoute
  useEffect(() => {
    if (isEnabled) {
      startListening();
    } else {
      stopListening();
    }

    return () => {
      stopListening();
    };
  }, [isEnabled]);

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      let silenceTimer: NodeJS.Timeout;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        if (audioChunksRef.current.length > 0 && !isPlayingRef.current) {
          await processAudioWithWhisper();
        }
        
        // Redémarrer l'enregistrement si toujours activé et pas en train de parler
        if (isEnabled && streamRef.current && !isPlayingRef.current) {
          setTimeout(() => {
            if (!isPlayingRef.current && mediaRecorderRef.current && isEnabled) {
              startRecordingCycle();
            }
          }, 500);
        }
      };
      
      const startRecordingCycle = () => {
        if (isPlayingRef.current) return;
        
        audioChunksRef.current = [];
        try {
          if (mediaRecorder.state === 'inactive') {
            mediaRecorder.start();
            setIsListening(true);
            
            // Arrêter après 3 secondes de silence ou 10 secondes max
            silenceTimer = setTimeout(() => {
              if (mediaRecorder.state === 'recording' && !isPlayingRef.current) {
                mediaRecorder.stop();
                setIsListening(false);
              }
            }, 3000);
          }
        } catch (error) {
          console.error('Erreur démarrage enregistrement:', error);
        }
      };
      
      // Démarrer le premier cycle
      startRecordingCycle();
      
    } catch (error) {
      console.error('Erreur accès microphone:', error);
      toast.error('Impossible d\'accéder au microphone');
      onToggle();
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsListening(false);
  };

  // Traiter l'audio avec Whisper via notre edge function
  const processAudioWithWhisper = async () => {
    if (audioChunksRef.current.length === 0) return;
    
    setIsProcessing(true);
    
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      // Convertir en base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(',')[1];
        
        if (!base64Audio) return;
        
        // Utiliser notre nouvelle fonction direct_audio qui fait tout en une fois
        const response = await supabase.functions.invoke('skill-test-ai', {
          body: {
            action: 'transcribe',
            audio: base64Audio
          }
        });
        
        if (response.data?.text) {
          onTranscription(response.data.text);
        }
      };
    } catch (error) {
      console.error('Erreur transcription:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Lire les réponses du bot
  useEffect(() => {
    if (!isEnabled || !botResponse || isPlayingRef.current) return;
    
    playBotResponse(botResponse);
  }, [botResponse, isEnabled]);

  const playBotResponse = async (text: string) => {
    if (isPlayingRef.current) return;
    
    try {
      isPlayingRef.current = true;
      setIsSpeaking(true);
      
      // Arrêter l'enregistrement pendant que l'IA parle
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        setIsListening(false);
      }
      
      const response = await supabase.functions.invoke('skill-test-ai', {
        body: {
          action: 'tts',
          text: text.replace(/\*\*/g, '').substring(0, 1000)
        }
      });
      
      if (response.data?.audio) {
        const audioBlob = new Blob(
          [Uint8Array.from(atob(response.data.audio), c => c.charCodeAt(0))],
          { type: 'audio/mp3' }
        );
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          isPlayingRef.current = false;
          setIsSpeaking(false);
          audioRef.current = null;
          
          // Reprendre l'écoute après que l'IA ait fini de parler
          if (isEnabled && streamRef.current && mediaRecorderRef.current) {
            setTimeout(() => {
              if (!isPlayingRef.current && mediaRecorderRef.current && isEnabled) {
                try {
                  if (mediaRecorderRef.current.state === 'inactive') {
                    audioChunksRef.current = [];
                    mediaRecorderRef.current.start();
                    setIsListening(true);
                    
                    // Auto-stop après 3 secondes
                    setTimeout(() => {
                      if (mediaRecorderRef.current?.state === 'recording' && !isPlayingRef.current) {
                        mediaRecorderRef.current.stop();
                        setIsListening(false);
                      }
                    }, 3000);
                  }
                } catch (error) {
                  console.error('Erreur redémarrage écoute:', error);
                }
              }
            }, 500);
          }
        };
        
        audio.onerror = () => {
          isPlayingRef.current = false;
          setIsSpeaking(false);
          audioRef.current = null;
        };
        
        await audio.play();
      }
    } catch (error) {
      console.error('Erreur lecture audio:', error);
      isPlayingRef.current = false;
      setIsSpeaking(false);
    }
  };

  // Nettoyer à la désactivation
  useEffect(() => {
    if (!isEnabled) {
      // Arrêter l'audio en cours
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      isPlayingRef.current = false;
      setIsSpeaking(false);
    }
  }, [isEnabled]);

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={onToggle}
        variant={isEnabled ? "default" : "outline"}
        size="sm"
        className={isEnabled ? "bg-gradient-to-r from-purple-600 to-pink-600" : ""}
      >
        {isEnabled ? (
          <>
            <Mic className="w-4 h-4 mr-2 animate-pulse" />
            Mode Vocal Actif
          </>
        ) : (
          <>
            <MicOff className="w-4 h-4 mr-2" />
            Activer Mode Vocal
          </>
        )}
      </Button>
      
      {isEnabled && (
        <div className="flex items-center gap-2">
          {isSpeaking ? (
            <Badge variant="secondary" className="bg-purple-500 text-white">
              <Volume2 className="w-3 h-3 mr-1" />
              IA parle
            </Badge>
          ) : isListening ? (
            <Badge variant="secondary" className="bg-red-500 text-white animate-pulse">
              <Mic className="w-3 h-3 mr-1" />
              Écoute...
            </Badge>
          ) : isProcessing ? (
            <Badge variant="outline">
              🔄 Traitement...
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-green-500 text-white">
              ✓ Prêt
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}