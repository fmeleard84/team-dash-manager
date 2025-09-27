/**
 * Composant Principal - Module IA QUALIFICATION
 *
 * Interface utilisateur moderne pour les sessions de qualification IA vocale.
 * Intègre l'audio temps réel, la transcription automatique et l'évaluation IA.
 *
 * Fonctionnalités :
 * - Interface qualification interactive avec effet néon
 * - Contrôles audio avec monitoring niveau sonore
 * - Transcription temps réel des réponses
 * - Progression visuelle et timer par question
 * - Résultats détaillés avec recommandations IA
 * - Support dark/light mode complet
 * - Design glassmorphism et animations fluides
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/ui/components/card';
import { Button } from '@/ui/components/button';
import { Badge } from '@/ui/components/badge';
import { Progress } from '@/ui/components/progress';
import { Separator } from '@/ui/components/separator';
import {
  Mic,
  MicOff,
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  Clock,
  Brain,
  Target,
  TrendingUp,
  Award,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  Sparkles,
  Headphones
} from 'lucide-react';
import { toast } from 'sonner';

import { useQualification, useRealtimeAudio } from '../hooks';
import type {
  ModularQualificationViewProps,
  CandidateProfile,
  Question,
  QualificationTest,
  TestConfig
} from '../types';

/**
 * Composant principal de qualification IA avec interface moderne
 */
export function ModularQualificationView({
  candidateProfile,
  onTestComplete,
  onCancel,
  autoStart = false,
  customConfig,
  showProgress = true,
  showTimer = true,
  className = '',
  theme = 'dark'
}: ModularQualificationViewProps) {
  // Hooks de gestion
  const qualificationHook = useQualification();
  const audioHook = useRealtimeAudio();

  // État local de l'interface
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [audioPermission, setAudioPermission] = useState<boolean | null>(null);

  // Configuration par défaut
  const defaultConfig: Partial<TestConfig> = {
    maxQuestions: 10,
    timePerQuestion: 120, // 2 minutes
    adaptiveMode: true,
    audioConfig: {
      sampleRate: 24000,
      channels: 1,
      enableNoiseReduction: true,
      enableEchoCancellation: true
    },
    passingScore: 60,
    ...customConfig
  };

  /**
   * Démarre une nouvelle session de qualification
   */
  const handleStartTest = useCallback(async () => {
    try {
      // 1. Vérifier les permissions audio
      const hasPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      if (hasPermission.state === 'denied') {
        toast.error('Permission microphone requise pour la qualification vocale');
        return;
      }

      // 2. Connecter l'audio
      const audioConnected = await audioHook.connect(defaultConfig.audioConfig);
      if (!audioConnected) {
        toast.error('Impossible de se connecter au système audio');
        return;
      }

      // 3. Démarrer le test
      const testId = await qualificationHook.startTest(candidateProfile, defaultConfig);
      if (!testId) {
        toast.error('Erreur lors du démarrage du test');
        return;
      }

      setIsStarted(true);
      setAudioPermission(true);
      toast.success('Session de qualification démarrée');

    } catch (error) {
      console.error('Erreur démarrage test:', error);
      toast.error('Erreur lors de l\'initialisation');
    }
  }, [candidateProfile, audioHook, qualificationHook, defaultConfig]);

  /**
   * Soumet la réponse actuelle
   */
  const handleSubmitAnswer = useCallback(async () => {
    if (!qualificationHook.currentQuestion) return;

    const answerData = {
      questionId: qualificationHook.currentQuestion.id,
      userAnswer: currentAnswer,
      transcript: audioHook.transcript,
      timestamp: new Date(),
      duration: 0, // Calculé côté serveur
      confidence: 85, // Estimé
      keywords: { expected: [], found: [], missing: [] } // Analysé côté IA
    };

    const success = await qualificationHook.submitAnswer(answerData);
    if (success) {
      setCurrentAnswer('');
    }
  }, [qualificationHook, audioHook.transcript, currentAnswer]);

  /**
   * Termine le test et affiche les résultats
   */
  const handleCompleteTest = useCallback(async () => {
    const results = await qualificationHook.getResults();
    if (results) {
      setShowResults(true);
      onTestComplete?.(results);
    }
  }, [qualificationHook, onTestComplete]);

  /**
   * Configure les listeners audio
   */
  useEffect(() => {
    // Transcription temps réel
    const unsubscribeTranscript = audioHook.onTranscript((transcript) => {
      setCurrentAnswer(transcript);
    });

    // Messages de l'assistant
    const unsubscribeMessage = audioHook.onMessage((message) => {
      if (message.type === 'feedback') {
        toast.info('Réponse analysée par l\'IA');
      }
    });

    // Gestion d'erreurs
    const unsubscribeError = audioHook.onError((error) => {
      toast.error(`Erreur audio: ${error.message}`);
    });

    return () => {
      unsubscribeTranscript?.();
      unsubscribeMessage?.();
      unsubscribeError?.();
    };
  }, [audioHook]);

  /**
   * Auto-démarrage si configuré
   */
  useEffect(() => {
    if (autoStart && !isStarted && audioPermission === null) {
      handleStartTest();
    }
  }, [autoStart, isStarted, audioPermission, handleStartTest]);

  /**
   * Test terminé - afficher résultats
   */
  useEffect(() => {
    if (qualificationHook.isTestComplete && qualificationHook.test && !showResults) {
      handleCompleteTest();
    }
  }, [qualificationHook.isTestComplete, qualificationHook.test, showResults, handleCompleteTest]);

  // Rendu conditionnel selon l'état
  if (showResults && qualificationHook.test) {
    return <ResultsView test={qualificationHook.test} onClose={() => setShowResults(false)} />;
  }

  if (!isStarted) {
    return <WelcomeScreen onStart={handleStartTest} candidateProfile={candidateProfile} />;
  }

  return (
    <div className={`min-h-screen p-6 ${theme === 'dark' ? 'bg-gradient-to-br from-neutral-900 via-primary-900/20 to-neutral-900' : 'bg-gradient-to-br from-neutral-50 to-primary-50/30'} ${className}`}>
      {/* Header avec progression */}
      {showProgress && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="backdrop-blur-xl bg-white/10 dark:bg-black/20 border border-white/20 dark:border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-r from-primary-500 to-secondary-500">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                      Qualification IA - Session Active
                    </h2>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Question {qualificationHook.progress.current} sur {qualificationHook.progress.total}
                    </p>
                  </div>
                </div>

                {/* Timer */}
                {showTimer && qualificationHook.timeRemaining && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary-500" />
                    <span className={`font-mono text-lg ${
                      qualificationHook.timeRemaining <= 30
                        ? 'text-red-500 animate-pulse'
                        : 'text-neutral-700 dark:text-neutral-300'
                    }`}>
                      {Math.floor(qualificationHook.timeRemaining / 60)}:{(qualificationHook.timeRemaining % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                )}
              </div>

              <Progress
                value={qualificationHook.progress.percentage}
                className="h-2 bg-neutral-200 dark:bg-neutral-700"
              />
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Question actuelle */}
        <AnimatePresence mode="wait">
          {qualificationHook.currentQuestion && (
            <motion.div
              key={qualificationHook.currentQuestion.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <QuestionCard
                question={qualificationHook.currentQuestion}
                currentAnswer={currentAnswer}
                isRecording={audioHook.isRecording}
                audioLevel={audioHook.audioLevel}
                transcript={audioHook.transcript}
                onSubmit={handleSubmitAnswer}
                loading={qualificationHook.loading}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Contrôles audio */}
        <AudioControls
          isConnected={audioHook.isConnected}
          isRecording={audioHook.isRecording}
          isMuted={audioHook.isMuted}
          volume={audioHook.volume}
          audioLevel={audioHook.audioLevel}
          connectionQuality={audioHook.connectionQuality}
          onStartRecording={audioHook.startRecording}
          onStopRecording={audioHook.stopRecording}
          onToggleMute={audioHook.toggleMute}
          onVolumeChange={audioHook.setVolume}
        />

        {/* Actions */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => {
              qualificationHook.cancelTest();
              audioHook.disconnect();
              onCancel?.();
            }}
            className="bg-white/10 backdrop-blur border-white/20 text-neutral-700 dark:text-neutral-300"
          >
            Annuler le test
          </Button>

          <Button
            variant="outline"
            onClick={qualificationHook.pauseTest}
            disabled={!qualificationHook.canProceed}
            className="bg-white/10 backdrop-blur border-white/20"
          >
            {qualificationHook.session?.isPaused ? (
              <>
                <Play className="w-4 h-4 mr-2" />
                Reprendre
              </>
            ) : (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Composant de question avec interface moderne
 */
function QuestionCard({
  question,
  currentAnswer,
  isRecording,
  audioLevel,
  transcript,
  onSubmit,
  loading
}: {
  question: Question;
  currentAnswer: string;
  isRecording: boolean;
  audioLevel: number;
  transcript: string;
  onSubmit: () => void;
  loading: boolean;
}) {
  return (
    <Card className="backdrop-blur-xl bg-white/80 dark:bg-neutral-900/80 border border-neutral-200/50 dark:border-neutral-700/50 shadow-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl text-neutral-900 dark:text-white">
            {question.question}
          </CardTitle>
          <Badge
            variant="outline"
            className={`
              ${question.difficulty === 'easy' ? 'border-green-500 text-green-600 bg-green-500/10' : ''}
              ${question.difficulty === 'medium' ? 'border-orange-500 text-orange-600 bg-orange-500/10' : ''}
              ${question.difficulty === 'hard' ? 'border-red-500 text-red-600 bg-red-500/10' : ''}
              ${question.difficulty === 'expert' ? 'border-purple-500 text-purple-600 bg-purple-500/10' : ''}
            `}
          >
            {question.difficulty}
          </Badge>
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Catégorie: {question.category}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Zone de transcription */}
        <div className="min-h-[100px] p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800 border-2 border-dashed border-neutral-300 dark:border-neutral-600">
          {isRecording && (
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm text-red-500">Enregistrement en cours...</span>
              <div className="flex-1 h-1 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-red-500 transition-all duration-100"
                  style={{ width: `${audioLevel}%` }}
                />
              </div>
            </div>
          )}

          <div className="text-neutral-700 dark:text-neutral-300">
            {transcript || currentAnswer || (
              <span className="text-neutral-500 italic">
                {isRecording ? 'Parlez maintenant...' : 'Cliquez sur le micro pour répondre'}
              </span>
            )}
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button
            onClick={onSubmit}
            disabled={loading || (!transcript && !currentAnswer)}
            className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/40 transition-all duration-200"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Analyse en cours...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Soumettre la réponse
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Contrôles audio avec monitoring
 */
function AudioControls({
  isConnected,
  isRecording,
  isMuted,
  volume,
  audioLevel,
  connectionQuality,
  onStartRecording,
  onStopRecording,
  onToggleMute,
  onVolumeChange
}: {
  isConnected: boolean;
  isRecording: boolean;
  isMuted: boolean;
  volume: number;
  audioLevel: number;
  connectionQuality: 'excellent' | 'good' | 'poor';
  onStartRecording: () => void;
  onStopRecording: () => void;
  onToggleMute: () => void;
  onVolumeChange: (volume: number) => void;
}) {
  return (
    <Card className="backdrop-blur-xl bg-white/10 dark:bg-black/20 border border-white/20 dark:border-white/10">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Micro */}
            <Button
              onClick={isRecording ? onStopRecording : onStartRecording}
              disabled={!isConnected}
              variant={isRecording ? "destructive" : "default"}
              className={`
                ${isRecording
                  ? 'bg-red-500 hover:bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.5)]'
                  : 'bg-gradient-to-r from-primary-500 to-secondary-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]'
                }
                transition-all duration-200
              `}
            >
              {isRecording ? (
                <Square className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </Button>

            {/* Mute */}
            <Button
              onClick={onToggleMute}
              variant="outline"
              className="bg-white/10 backdrop-blur border-white/20"
            >
              {isMuted ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Indicateurs */}
          <div className="flex items-center gap-4">
            {/* Qualité connexion */}
            <div className="flex items-center gap-2">
              <Headphones className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
              <Badge
                variant="outline"
                className={`
                  ${connectionQuality === 'excellent' ? 'border-green-500 text-green-600 bg-green-500/10' : ''}
                  ${connectionQuality === 'good' ? 'border-orange-500 text-orange-600 bg-orange-500/10' : ''}
                  ${connectionQuality === 'poor' ? 'border-red-500 text-red-600 bg-red-500/10' : ''}
                `}
              >
                {connectionQuality}
              </Badge>
            </div>

            {/* Niveau audio */}
            {isConnected && (
              <div className="flex items-center gap-2">
                <div className="w-20 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-red-500 transition-all duration-100"
                    style={{ width: `${audioLevel}%` }}
                  />
                </div>
                <span className="text-xs text-neutral-600 dark:text-neutral-400">
                  {Math.round(audioLevel)}%
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Écran d'accueil
 */
function WelcomeScreen({ onStart, candidateProfile }: { onStart: () => void; candidateProfile: CandidateProfile }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-neutral-900 via-primary-900/20 to-neutral-900">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full"
      >
        <Card className="backdrop-blur-xl bg-white/10 dark:bg-black/20 border border-white/20 dark:border-white/10 shadow-2xl">
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center">
                <Brain className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-400 to-secondary-400 text-transparent bg-clip-text mb-2">
                Qualification IA Vocale
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400">
                Bonjour {candidateProfile.firstName}, prêt pour votre session de qualification ?
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3 text-left">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-neutral-700 dark:text-neutral-300">
                  Questions adaptées à votre profil professionnel
                </span>
              </div>
              <div className="flex items-center gap-3 text-left">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-neutral-700 dark:text-neutral-300">
                  Évaluation IA en temps réel avec feedback détaillé
                </span>
              </div>
              <div className="flex items-center gap-3 text-left">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-neutral-700 dark:text-neutral-300">
                  Durée estimée : 15-20 minutes
                </span>
              </div>
            </div>

            <Button
              onClick={onStart}
              className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white font-medium px-8 py-4 rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.5)] hover:shadow-[0_0_30px_rgba(168,85,247,0.7)] transition-all duration-300"
            >
              <Mic className="w-5 h-5 mr-2" />
              Commencer la qualification
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

/**
 * Affichage des résultats
 */
function ResultsView({ test, onClose }: { test: QualificationTest; onClose: () => void }) {
  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-neutral-900 via-primary-900/20 to-neutral-900">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <Card className="backdrop-blur-xl bg-white/80 dark:bg-neutral-900/80 border border-neutral-200/50 dark:border-neutral-700/50 shadow-2xl">
          <CardHeader className="text-center pb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center">
              <Award className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl">
              Qualification Terminée !
            </CardTitle>
            <p className="text-neutral-600 dark:text-neutral-400">
              Voici vos résultats détaillés
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Score global */}
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-500 mb-2">
                {test.overallScore}/100
              </div>
              <Badge
                variant="outline"
                className={`
                  ${test.qualificationLevel === 'validated' ? 'border-green-500 text-green-600 bg-green-500/10' : ''}
                  ${test.qualificationLevel === 'stand_by' ? 'border-orange-500 text-orange-600 bg-orange-500/10' : ''}
                  ${test.qualificationLevel === 'rejected' ? 'border-red-500 text-red-600 bg-red-500/10' : ''}
                  ${test.qualificationLevel === 'needs_review' ? 'border-blue-500 text-blue-600 bg-blue-500/10' : ''}
                `}
              >
                {test.qualificationLevel}
              </Badge>
            </div>

            <Separator />

            {/* Analyse IA */}
            {test.aiAnalysis && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Analyse IA Détaillée
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800">
                    <div className="text-2xl font-bold text-primary-500">
                      {test.aiAnalysis.technicalSkills}
                    </div>
                    <div className="text-sm text-neutral-600 dark:text-neutral-400">
                      Compétences Techniques
                    </div>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800">
                    <div className="text-2xl font-bold text-secondary-500">
                      {test.aiAnalysis.communicationSkills}
                    </div>
                    <div className="text-sm text-neutral-600 dark:text-neutral-400">
                      Communication
                    </div>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800">
                    <div className="text-2xl font-bold text-blue-500">
                      {test.aiAnalysis.problemSolvingSkills}
                    </div>
                    <div className="text-sm text-neutral-600 dark:text-neutral-400">
                      Résolution Problèmes
                    </div>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800">
                    <div className="text-2xl font-bold text-green-500">
                      {test.aiAnalysis.experienceLevel}
                    </div>
                    <div className="text-sm text-neutral-600 dark:text-neutral-400">
                      Niveau d'Expérience
                    </div>
                  </div>
                </div>

                {/* Points forts et faibles */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2 text-green-600">
                      <TrendingUp className="w-4 h-4" />
                      Points Forts
                    </h4>
                    <ul className="space-y-1">
                      {test.aiAnalysis.strengths.map((strength, index) => (
                        <li key={index} className="text-sm text-neutral-700 dark:text-neutral-300 flex items-start gap-2">
                          <CheckCircle className="w-3 h-3 text-green-500 mt-1 flex-shrink-0" />
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2 text-orange-600">
                      <Target className="w-4 h-4" />
                      Axes d'Amélioration
                    </h4>
                    <ul className="space-y-1">
                      {test.aiAnalysis.improvementAreas.map((area, index) => (
                        <li key={index} className="text-sm text-neutral-700 dark:text-neutral-300 flex items-start gap-2">
                          <AlertCircle className="w-3 h-3 text-orange-500 mt-1 flex-shrink-0" />
                          {area}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-center pt-6">
              <Button
                onClick={onClose}
                className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white px-8 py-3 rounded-xl shadow-lg"
              >
                Fermer les résultats
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default ModularQualificationView;