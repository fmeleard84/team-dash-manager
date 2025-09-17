import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface VoiceRecognitionProps {
  onTranscription: (text: string) => void;
  isEnabled: boolean;
  canRecord: boolean; // Si l'IA a fini de parler
}

export function VoiceRecognition({ 
  onTranscription,
  isEnabled,
  canRecord
}: VoiceRecognitionProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const isProcessingRef = useRef(false);

  // Initialiser la reconnaissance vocale
  const initRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('❌ Reconnaissance vocale non supportée');
      toast.error('Votre navigateur ne supporte pas la reconnaissance vocale');
      return null;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    
    // Configuration
    recognition.continuous = true; // Écoute continue
    recognition.interimResults = true; // Résultats intermédiaires
    recognition.lang = 'fr-FR'; // Français
    recognition.maxAlternatives = 1;

    // Événements
    recognition.onstart = () => {
      console.log('🎤 Écoute démarrée');
      setIsListening(true);
      setTranscript('');
      isProcessingRef.current = false;
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      // Afficher la transcription temporaire
      if (interimTranscript) {
        setTranscript(interimTranscript);
      }

      // Si on a une transcription finale
      if (finalTranscript && !isProcessingRef.current) {
        console.log('📝 Transcription finale:', finalTranscript);
        const cleanedTranscript = finalTranscript.trim();
        
        // Envoyer automatiquement après un silence
        if (cleanedTranscript.length > 2) { // Au moins 2 caractères
          isProcessingRef.current = true;
          
          // Arrêter la reconnaissance et envoyer le texte
          setTimeout(() => {
            if (recognitionRef.current) {
              recognitionRef.current.stop();
            }
            console.log('📤 Envoi de la transcription:', cleanedTranscript);
            onTranscription(cleanedTranscript);
            setTranscript('');
            isProcessingRef.current = false;
          }, 1000); // Attendre 1s de silence avant d'envoyer
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error('❌ Erreur reconnaissance:', event.error);
      if (event.error === 'no-speech') {
        console.log('⚠️ Aucune parole détectée');
      } else if (event.error === 'aborted') {
        console.log('⚠️ Reconnaissance interrompue');
      } else {
        toast.error(`Erreur: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      console.log('🛑 Écoute terminée');
      setIsListening(false);
      isProcessingRef.current = false;
      
      // Redémarrer automatiquement si on peut encore enregistrer
      if (isEnabled && canRecord) {
        setTimeout(() => {
          if (!isListening && recognitionRef.current) {
            try {
              recognitionRef.current.start();
              console.log('🔄 Redémarrage automatique de l\'écoute');
            } catch (e) {
              console.log('⚠️ Écoute déjà en cours');
            }
          }
        }, 500);
      }
    };

    return recognition;
  }, [onTranscription, isEnabled, canRecord]);

  // Démarrer l'écoute
  const startListening = useCallback(() => {
    if (!canRecord) {
      console.log('⚠️ Attendez que l\'IA finisse de parler');
      return;
    }

    if (!recognitionRef.current) {
      recognitionRef.current = initRecognition();
    }

    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        console.log('🎙️ Démarrage de l\'écoute...');
      } catch (error) {
        console.error('❌ Erreur démarrage:', error);
        // Si déjà en cours, on arrête et redémarre
        recognitionRef.current.stop();
        setTimeout(() => {
          recognitionRef.current.start();
        }, 100);
      }
    }
  }, [canRecord, isListening, initRecognition]);

  // Arrêter l'écoute
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      
      // Envoyer la transcription actuelle si elle existe
      if (transcript.trim()) {
        onTranscription(transcript.trim());
        setTranscript('');
      }
    }
  }, [isListening, transcript, onTranscription]);

  // Gérer l'activation automatique
  useEffect(() => {
    if (isEnabled && canRecord && !isListening) {
      // Démarrer automatiquement quand l'IA a fini de parler
      const timer = setTimeout(() => {
        startListening();
      }, 500); // Petit délai pour éviter les conflits
      
      return () => clearTimeout(timer);
    } else if (!isEnabled && isListening) {
      stopListening();
    }
  }, [isEnabled, canRecord, isListening, startListening, stopListening]);

  // Nettoyer à la destruction
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex items-center gap-3">
      {isEnabled && (
        <>
          {isListening ? (
            <Badge variant="secondary" className="bg-red-500 text-white animate-pulse">
              <Mic className="w-3 h-3 mr-1" />
              Écoute en cours...
            </Badge>
          ) : canRecord ? (
            <Badge variant="secondary" className="bg-blue-500 text-white">
              <Mic className="w-3 h-3 mr-1" />
              Prêt à écouter
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-gray-500 text-white">
              <MicOff className="w-3 h-3 mr-1" />
              IA en train de parler
            </Badge>
          )}
        </>
      )}
    </div>
  );
}