import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { toast } from 'sonner';

const ELEVENLABS_API_KEY = 'sk_78684f6ed063bb3803838d5ce932e5c38d0a308e542381ac';
const VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel voice

interface VoiceChatElevenLabsSDKProps {
  onTranscription: (text: string) => void;
  botResponse?: string;
  isEnabled: boolean;
  onToggle: () => void;
}

export function VoiceChatElevenLabsSDK({ 
  onTranscription, 
  botResponse, 
  isEnabled, 
  onToggle 
}: VoiceChatElevenLabsSDKProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [status, setStatus] = useState<'ready' | 'listening' | 'speaking'>('ready');
  
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isActiveRef = useRef(false);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptRef = useRef<string>('');

  // Initialiser la reconnaissance vocale avec une meilleure gestion
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
    recognition.continuous = true; // Écoute continue
    recognition.interimResults = true; // Résultats intermédiaires pour meilleure détection
    recognition.lang = 'fr-FR';
    recognition.maxAlternatives = 1;

    let finalTranscript = '';
    let interimTranscript = '';

    recognition.onstart = () => {
      console.log('🎙️ Écoute démarrée (ElevenLabs SDK)');
      setIsListening(true);
      setStatus('listening');
      finalTranscript = '';
      interimTranscript = '';
    };

    recognition.onresult = (event: any) => {
      interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
          
          // Réinitialiser le timer de silence
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }
          
          // Démarrer un nouveau timer pour détecter la fin de la phrase
          silenceTimerRef.current = setTimeout(() => {
            if (finalTranscript.trim() && finalTranscript.trim() !== lastTranscriptRef.current) {
              console.log('📝 Phrase complète:', finalTranscript.trim());
              lastTranscriptRef.current = finalTranscript.trim();
              onTranscription(finalTranscript.trim());
              finalTranscript = '';
            }
          }, 1500); // Attendre 1.5 secondes de silence
        } else {
          interimTranscript += transcript;
        }
      }
      
      // Afficher les résultats intermédiaires pour feedback visuel
      if (interimTranscript) {
        console.log('💭 En cours:', interimTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      // Ignorer certaines erreurs communes
      if (event.error === 'no-speech') {
        console.log('🔇 Silence détecté, écoute continue...');
        return; // Continuer l'écoute
      } else if (event.error === 'aborted') {
        console.log('🔄 Reconnaissance interrompue');
        return;
      } else if (event.error === 'not-allowed') {
        toast.error('Permission du microphone refusée');
        onToggle();
      } else {
        console.error('❌ Erreur reconnaissance:', event.error);
      }
    };

    recognition.onend = () => {
      console.log('🔚 Session d\'écoute terminée');
      setIsListening(false);
      
      // Ne pas redémarrer si on est en train de parler ou si désactivé
      if (isEnabled && isActiveRef.current && !audioRef.current) {
        // Redémarrer après un court délai
        setTimeout(() => {
          if (isEnabled && isActiveRef.current && !audioRef.current) {
            try {
              recognition.start();
            } catch (e) {
              console.log('Reconnaissance déjà active');
            }
          }
        }, 500);
      } else {
        setStatus('ready');
      }
    };

    recognitionRef.current = recognition;
    isActiveRef.current = true;
    
    // Démarrer l'écoute
    try {
      recognition.start();
    } catch (e) {
      console.log('Erreur démarrage initial');
    }

    return () => {
      stopEverything();
    };
  }, [isEnabled, onTranscription, onToggle]);

  const stopEverything = () => {
    isActiveRef.current = false;
    
    // Nettoyer le timer
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    
    // Arrêter la reconnaissance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        console.log('Reconnaissance déjà arrêtée');
      }
      recognitionRef.current = null;
    }
    
    // Arrêter l'audio
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
      console.log('🔊 ElevenLabs SDK: Synthèse vocale...');
      setIsSpeaking(true);
      setStatus('speaking');
      
      // Arrêter temporairement la reconnaissance
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.log('Reconnaissance déjà arrêtée');
        }
      }
      
      // Nettoyer le texte
      const cleanText = text.replace(/\*\*/g, '').substring(0, 5000);
      
      // Appel API ElevenLabs avec streaming
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
          },
          optimize_streaming_latency: 3 // Optimisation pour réduire la latence
        })
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      // Créer et jouer l'audio avec streaming
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      // Configuration audio pour meilleure qualité
      audio.volume = 0.9;
      
      audio.onended = () => {
        console.log('✅ Lecture terminée');
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        setIsSpeaking(false);
        setStatus('ready');
        
        // Redémarrer l'écoute après la fin de la lecture
        if (isEnabled && isActiveRef.current && recognitionRef.current) {
          setTimeout(() => {
            if (isEnabled && isActiveRef.current) {
              try {
                recognitionRef.current.start();
              } catch (e) {
                console.log('Reconnaissance déjà active');
              }
            }
          }, 300);
        }
      };
      
      audio.onerror = (e) => {
        console.error('❌ Erreur lecture audio:', e);
        audioRef.current = null;
        setIsSpeaking(false);
        setStatus('ready');
        
        // Fallback sur synthèse native
        try {
          const utterance = new SpeechSynthesisUtterance(cleanText);
          utterance.lang = 'fr-FR';
          utterance.rate = 1.1;
          
          utterance.onend = () => {
            setIsSpeaking(false);
            setStatus('ready');
            
            // Redémarrer l'écoute
            if (isEnabled && isActiveRef.current && recognitionRef.current) {
              setTimeout(() => {
                try {
                  recognitionRef.current.start();
                } catch (e) {
                  console.log('Erreur redémarrage après fallback');
                }
              }, 300);
            }
          };
          
          speechSynthesis.speak(utterance);
          console.log('🔊 Fallback sur synthèse native');
        } catch (error) {
          console.error('Erreur synthèse native:', error);
        }
      };
      
      // Jouer l'audio
      await audio.play();
      console.log('▶️ Audio ElevenLabs en cours');
      
    } catch (error) {
      console.error('Erreur ElevenLabs:', error);
      setIsSpeaking(false);
      setStatus('ready');
      
      // Fallback sur synthèse native
      const utterance = new SpeechSynthesisUtterance(text.replace(/\*\*/g, ''));
      utterance.lang = 'fr-FR';
      speechSynthesis.speak(utterance);
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
            <Badge variant="secondary" className="bg-green-500 text-white">
              <Mic className="w-3 h-3 mr-1 animate-pulse" />
              Écoute active...
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-gray-500 text-white">
              ⏸️ En attente
            </Badge>
          )}
          
          <Badge variant="outline" className="text-xs">
            🎭 ElevenLabs SDK
          </Badge>
        </div>
      )}
    </div>
  );
}