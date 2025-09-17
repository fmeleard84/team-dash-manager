import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const ELEVENLABS_API_KEY = 'sk_78684f6ed063bb3803838d5ce932e5c38d0a308e542381ac';
const VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel voice (ou autre voice ID)

interface VoiceChatElevenLabsProps {
  onTranscription: (text: string) => void;
  botResponse?: string;
  isEnabled: boolean;
  onToggle: () => void;
}

export function VoiceChatElevenLabs({ 
  onTranscription, 
  botResponse, 
  isEnabled, 
  onToggle 
}: VoiceChatElevenLabsProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [status, setStatus] = useState<'ready' | 'listening' | 'speaking'>('ready');
  
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isActiveRef = useRef(false);

  // Initialiser la reconnaissance vocale
  useEffect(() => {
    if (!isEnabled) {
      stopEverything();
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    
    if (!SpeechRecognition) {
      toast.error('Votre navigateur ne supporte pas la reconnaissance vocale');
      onToggle();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false; // Une seule phrase à la fois
    recognition.interimResults = false;
    recognition.lang = 'fr-FR';

    recognition.onstart = () => {
      console.log('🎙️ ElevenLabs: Écoute démarrée');
      setIsListening(true);
      setStatus('listening');
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      console.log('📝 ElevenLabs: Transcription:', transcript);
      
      if (transcript.trim()) {
        onTranscription(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') {
        console.log('🔇 Pas de parole détectée');
        // Redémarrer après un délai
        if (isEnabled && isActiveRef.current) {
          setTimeout(() => startListening(recognition), 500);
        }
      } else if (event.error === 'aborted' || event.error === 'not-allowed') {
        if (event.error === 'not-allowed') {
          toast.error('Permission du microphone refusée');
          onToggle();
        }
      }
    };

    recognition.onend = () => {
      console.log('🔚 Écoute terminée');
      setIsListening(false);
      
      // Redémarrer seulement si activé et pas en train de parler
      if (isEnabled && isActiveRef.current && !audioRef.current) {
        setTimeout(() => {
          if (isEnabled && isActiveRef.current) {
            startListening(recognition);
          }
        }, 800);
      }
    };

    recognitionRef.current = recognition;
    isActiveRef.current = true;
    
    // Démarrer l'écoute
    startListening(recognition);

    return () => {
      stopEverything();
    };
  }, [isEnabled, onTranscription, onToggle]);

  const startListening = (recognition: any) => {
    if (!recognition || !isActiveRef.current || audioRef.current) return;
    
    try {
      recognition.start();
    } catch (e) {
      console.log('Reconnaissance déjà active');
      // Réessayer après un délai
      setTimeout(() => {
        if (isActiveRef.current && !audioRef.current) {
          try {
            recognition.start();
          } catch (err) {
            console.log('Toujours active');
          }
        }
      }, 1000);
    }
  };

  const stopEverything = () => {
    isActiveRef.current = false;
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        console.log('Reconnaissance déjà arrêtée');
      }
      recognitionRef.current = null;
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    setIsListening(false);
    setIsSpeaking(false);
    setStatus('ready');
  };

  // Synthèse vocale avec ElevenLabs
  useEffect(() => {
    if (!isEnabled || !botResponse || audioRef.current) return;
    
    playWithElevenLabs(botResponse);
  }, [botResponse, isEnabled]);

  const playWithElevenLabs = async (text: string) => {
    if (audioRef.current) return;
    
    try {
      console.log('🔊 ElevenLabs: Synthèse vocale...');
      setIsSpeaking(true);
      setStatus('speaking');
      
      // Arrêter la reconnaissance
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          console.log('Reconnaissance déjà arrêtée');
        }
      }
      
      // Nettoyer le texte
      const cleanText = text.replace(/\*\*/g, '').substring(0, 5000);
      
      // Appel API ElevenLabs
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.5,
            use_speaker_boost: true
          }
        })
      });

      if (!response.ok) {
        throw new Error('Erreur ElevenLabs API');
      }

      // Créer et jouer l'audio
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        console.log('✅ ElevenLabs: Lecture terminée');
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        setIsSpeaking(false);
        setStatus('ready');
        
        // Redémarrer l'écoute
        if (isEnabled && isActiveRef.current && recognitionRef.current) {
          setTimeout(() => {
            if (isEnabled && isActiveRef.current) {
              startListening(recognitionRef.current);
            }
          }, 500);
        }
      };
      
      audio.onerror = () => {
        console.error('❌ Erreur lecture audio ElevenLabs');
        audioRef.current = null;
        setIsSpeaking(false);
        setStatus('ready');
        
        // Fallback sur OpenAI TTS
        playWithOpenAI(text);
      };
      
      await audio.play();
      console.log('▶️ ElevenLabs: Audio en cours');
      
    } catch (error) {
      console.error('Erreur ElevenLabs:', error);
      setIsSpeaking(false);
      setStatus('ready');
      
      // Fallback sur OpenAI TTS
      playWithOpenAI(text);
    }
  };

  // Fallback sur OpenAI TTS si ElevenLabs échoue
  const playWithOpenAI = async (text: string) => {
    try {
      console.log('🔊 Fallback OpenAI TTS...');
      
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
          audioRef.current = null;
          setIsSpeaking(false);
          setStatus('ready');
          
          // Redémarrer l'écoute
          if (isEnabled && isActiveRef.current && recognitionRef.current) {
            setTimeout(() => {
              if (isEnabled && isActiveRef.current) {
                startListening(recognitionRef.current);
              }
            }, 500);
          }
        };
        
        await audio.play();
      }
    } catch (error) {
      console.error('Erreur OpenAI TTS:', error);
      setIsSpeaking(false);
      setStatus('ready');
    }
  };

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
            Mode Vocal ElevenLabs
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
          {status === 'speaking' ? (
            <Badge variant="secondary" className="bg-purple-500 text-white">
              <Volume2 className="w-3 h-3 mr-1 animate-pulse" />
              IA parle
            </Badge>
          ) : status === 'listening' ? (
            <Badge variant="secondary" className="bg-red-500 text-white animate-pulse">
              <Mic className="w-3 h-3 mr-1" />
              Écoute...
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-green-500 text-white">
              ✓ Prêt
            </Badge>
          )}
          
          <Badge variant="outline" className="text-xs">
            🎭 ElevenLabs
          </Badge>
        </div>
      )}
    </div>
  );
}