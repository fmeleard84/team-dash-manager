import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { toast } from 'sonner';

const ELEVENLABS_API_KEY = 'sk_78684f6ed063bb3803838d5ce932e5c38d0a308e542381ac';
const VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel voice

interface VoiceChatElevenLabsFinalProps {
  onTranscription: (text: string) => void;
  botResponse?: string;
  isEnabled: boolean;
  onToggle: () => void;
}

export function VoiceChatElevenLabsFinal({ 
  onTranscription, 
  botResponse, 
  isEnabled, 
  onToggle 
}: VoiceChatElevenLabsFinalProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Reconnaissance vocale native du navigateur
  useEffect(() => {
    if (!isEnabled) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Reconnaissance vocale non supportée');
      onToggle();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true; // Activer pour détecter quand l'utilisateur parle
    recognition.lang = 'fr-FR';

    recognition.onstart = () => {
      console.log('🎙️ Écoute active');
      setIsListening(true);
    };

    let finalTranscript = '';
    let silenceTimer: NodeJS.Timeout | null = null;
    
    recognition.onresult = (event: any) => {
      // Ne pas traiter si on est en train de parler
      if (audioRef.current || isSpeaking) {
        console.log('🚫 Résultat ignoré - IA en train de parler');
        return;
      }
      
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
          
          // Annuler le timer précédent
          if (silenceTimer) {
            clearTimeout(silenceTimer);
          }
          
          // Attendre un silence de 1.5 secondes avant d'envoyer
          silenceTimer = setTimeout(() => {
            if (finalTranscript.trim()) {
              console.log('📝 Phrase complète:', finalTranscript.trim());
              onTranscription(finalTranscript.trim());
              finalTranscript = '';
            }
          }, 1500); // Attendre 1.5 secondes de silence
          
        } else {
          interimTranscript += transcript;
        }
      }
      
      // Afficher ce qui est en cours de reconnaissance
      if (interimTranscript) {
        console.log('💭 En cours:', interimTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        toast.error('Microphone non autorisé');
        onToggle();
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      console.log('🔚 Session écoute terminée');
      
      // Redémarrer seulement si activé ET pas en train de parler
      if (isEnabled && !audioRef.current && !isSpeaking) {
        setTimeout(() => {
          if (isEnabled && recognitionRef.current && !audioRef.current) {
            try { 
              recognitionRef.current.start();
              console.log('🔄 Redémarrage écoute');
            } catch(e) {
              console.log('Erreur redémarrage:', e);
            }
          }
        }, 300); // Délai plus long pour éviter les conflits
      }
    };

    recognitionRef.current = recognition;
    recognition.start();

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, [isEnabled, onTranscription, onToggle]);

  // Synthèse vocale ElevenLabs
  useEffect(() => {
    if (!botResponse || !isEnabled || audioRef.current) return;

    const speak = async () => {
      try {
        // ARRÊTER COMPLÈTEMENT l'écoute pendant la parole
        if (recognitionRef.current) {
          try {
            recognitionRef.current.abort(); // Utiliser abort au lieu de stop
            console.log('🔇 Micro arrêté pour la synthèse');
          } catch(e) {
            console.log('Micro déjà arrêté');
          }
        }

        setIsSpeaking(true);
        
        const response = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
          {
            method: 'POST',
            headers: {
              'Accept': 'audio/mpeg',
              'Content-Type': 'application/json',
              'xi-api-key': ELEVENLABS_API_KEY,
            },
            body: JSON.stringify({
              text: botResponse.replace(/\*\*/g, '').substring(0, 1000),
              model_id: 'eleven_multilingual_v2',
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75
              }
            })
          }
        );

        if (response.ok) {
          const audioBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          audioRef.current = audio;
          
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            audioRef.current = null;
            setIsSpeaking(false);
            console.log('✅ ElevenLabs a fini de parler');
            
            // Redémarrer l'écoute APRÈS un délai pour éviter les conflits
            if (isEnabled && recognitionRef.current) {
              setTimeout(() => {
                try { 
                  recognitionRef.current.start();
                  console.log('🎙️ Micro réactivé');
                } catch(e) {
                  console.log('Erreur réactivation micro:', e);
                }
              }, 500); // Délai de 500ms pour s'assurer que tout est terminé
            }
          };
          
          await audio.play();
          console.log('🔊 ElevenLabs parle');
        }
      } catch (error) {
        console.error('Erreur TTS:', error);
        setIsSpeaking(false);
      }
    };

    speak();
  }, [botResponse, isEnabled]);

  // Nettoyage
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

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
          {isSpeaking ? (
            <Badge variant="secondary" className="bg-purple-500 text-white">
              <Volume2 className="w-3 h-3 mr-1 animate-pulse" />
              IA parle
            </Badge>
          ) : isListening ? (
            <Badge variant="secondary" className="bg-green-500 text-white">
              <Mic className="w-3 h-3 mr-1" />
              Écoute...
            </Badge>
          ) : (
            <Badge variant="outline">
              ⏸️ Pause
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}