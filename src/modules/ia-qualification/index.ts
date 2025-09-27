/**
 * Module IA QUALIFICATION - Export Principal
 *
 * Ce module gère la qualification automatisée de candidats via IA vocale :
 * - Sessions de qualification en temps réel avec OpenAI Realtime API
 * - Questions adaptatives basées sur le profil candidat
 * - Transcription automatique et analyse vocale
 * - Scoring automatique avec feedback détaillé IA
 * - Interface moderne avec effets néon et glassmorphism
 * - Support WebRTC pour audio bidirectionnel
 * - Gestion complète des sessions (pause, reprise, annulation)
 * - Analytics avancés et recommandations personnalisées
 * - Intégration complète avec le système candidat
 *
 * Architecture modulaire suivant le pattern établi dans les autres modules.
 */

// ==========================================
// COMPOSANTS
// ==========================================

export {
  ModularQualificationView,
  QualificationUI, // Alias pour compatibilité
  VoiceQualification, // Alias pour compatibilité
  IAQualificationTest, // Alias pour compatibilité
  RealtimeQualification, // Alias pour compatibilité
  QualificationAgent, // Alias pour compatibilité
  QUALIFICATION_MODULE_CONFIG
} from './components';

// ==========================================
// HOOKS
// ==========================================

export {
  useQualification,
  useRealtimeAudio
} from './hooks';

// ==========================================
// SERVICES
// ==========================================

export {
  QualificationAPI,
  RealtimeAudioService
} from './services';

// ==========================================
// TYPES
// ==========================================

export type {
  // Core types
  Question,
  Answer,
  QualificationTest,
  TestSession,
  CandidateProfile,
  TestConfig,

  // Analytics et analyse IA
  AIAnalysis,
  AudioAnalysis,
  Recommendation,

  // Configuration et paramètres
  RealtimeConnection,
  RealtimeMessage,

  // Status et enums
  QuestionCategory,
  QuestionDifficulty,
  TestStatus,
  QualificationLevel,
  RecommendationType,
  MessageType,

  // API types
  QualificationAPIResponse,
  GenerateQuestionsRequest,
  GenerateQuestionsResponse,
  StartSessionRequest,
  StartSessionResponse,
  SubmitAnswerRequest,
  SubmitAnswerResponse,

  // Hooks return types
  UseQualificationTestReturn,
  UseRealtimeAudioReturn,

  // Component props
  ModularQualificationViewProps,
  QualificationTestUIProps,
  TestResultsDisplayProps,

  // Utilities
  KeysOf,
  PartialBy,
  QualificationModuleConfig
} from './types';

// ==========================================
// CONSTANTES ET CONFIGURATION
// ==========================================

export const QUALIFICATION_CONSTANTS = {
  // Durées (en secondes)
  DEFAULT_QUESTION_TIME: 120,
  MAX_SESSION_DURATION: 1800, // 30 minutes
  MIN_ANSWER_DURATION: 5,
  MAX_ANSWER_DURATION: 300,

  // Scoring
  MIN_PASSING_SCORE: 60,
  EXCELLENT_SCORE_THRESHOLD: 85,
  GOOD_SCORE_THRESHOLD: 70,

  // Limites techniques
  MAX_QUESTIONS_PER_TEST: 20,
  MAX_RETRIES: 3,
  CONNECTION_TIMEOUT: 30000,

  // Audio
  SAMPLE_RATE: 24000,
  AUDIO_CHANNELS: 1,
  NOISE_GATE_THRESHOLD: -50, // dB

  // Catégories de questions
  QUESTION_CATEGORIES: {
    TECHNICAL: 'technical',
    BEHAVIORAL: 'behavioral',
    SITUATIONAL: 'situational',
    PROBLEM_SOLVING: 'problem_solving',
    COMMUNICATION: 'communication',
    EXPERIENCE: 'experience'
  } as const,

  // Difficultés
  DIFFICULTIES: {
    EASY: 'easy',
    MEDIUM: 'medium',
    HARD: 'hard',
    EXPERT: 'expert'
  } as const,

  // Statuts de test
  TEST_STATUSES: {
    INITIALIZED: 'initialized',
    IN_PROGRESS: 'in_progress',
    PAUSED: 'paused',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired'
  } as const,

  // Niveaux de qualification
  QUALIFICATION_LEVELS: {
    VALIDATED: 'validated',     // 80-100%
    STAND_BY: 'stand_by',      // 60-79%
    REJECTED: 'rejected',      // 0-59%
    NEEDS_REVIEW: 'needs_review' // Cas spéciaux
  } as const,

  // Types de recommandations
  RECOMMENDATION_TYPES: {
    SKILL_IMPROVEMENT: 'skill_improvement',
    PRACTICE_SUGGESTION: 'practice_suggestion',
    LEARNING_RESOURCE: 'learning_resource',
    CERTIFICATION: 'certification',
    EXPERIENCE_GAP: 'experience_gap',
    COMMUNICATION_TIP: 'communication_tip'
  } as const,

  // Types de messages temps réel
  MESSAGE_TYPES: {
    SESSION_START: 'session_start',
    SESSION_END: 'session_end',
    QUESTION: 'question',
    ANSWER: 'answer',
    FEEDBACK: 'feedback',
    ERROR: 'error',
    HEARTBEAT: 'heartbeat',
    CONFIG_UPDATE: 'config_update'
  } as const,

  // Configuration OpenAI
  OPENAI_CONFIG: {
    MODEL: 'gpt-4o-realtime-preview-2024-10-01',
    VOICE: 'alloy',
    INPUT_AUDIO_FORMAT: 'pcm16',
    OUTPUT_AUDIO_FORMAT: 'pcm16',
    TURN_DETECTION_THRESHOLD: 0.5,
    SILENCE_DURATION_MS: 500
  } as const,

  // Couleurs de statut pour l'UI
  STATUS_COLORS: {
    initialized: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    paused: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
    expired: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
  } as const,

  // Validation
  VALIDATION: {
    MAX_QUESTION_LENGTH: 1000,
    MAX_ANSWER_LENGTH: 5000,
    MIN_SESSION_DURATION: 300, // 5 minutes
    MAX_CANDIDATE_PROFILE_AGE_DAYS: 30,
    REQUIRED_PERMISSIONS: ['microphone']
  } as const
} as const;

// ==========================================
// FONCTIONS UTILITAIRES
// ==========================================

/**
 * Calcule le niveau de qualification basé sur le score
 */
export const calculateQualificationLevel = (score: number): QualificationLevel => {
  if (score >= 80) return 'validated';
  if (score >= 60) return 'stand_by';
  return 'rejected';
};

/**
 * Formate la durée d'une session en format lisible
 */
export const formatSessionDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs.toString().padStart(2, '0')}s`;
  } else {
    return `${secs}s`;
  }
};

/**
 * Obtient la couleur d'un statut de test
 */
export const getTestStatusColor = (status: string): string => {
  return QUALIFICATION_CONSTANTS.STATUS_COLORS[status as keyof typeof QUALIFICATION_CONSTANTS.STATUS_COLORS] ||
         QUALIFICATION_CONSTANTS.STATUS_COLORS.initialized;
};

/**
 * Valide un profil candidat pour la qualification
 */
export const validateCandidateProfile = (profile: CandidateProfile): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!profile.firstName || profile.firstName.trim().length === 0) {
    errors.push('Le prénom est requis');
  }

  if (!profile.lastName || profile.lastName.trim().length === 0) {
    errors.push('Le nom de famille est requis');
  }

  if (!profile.email || !profile.email.includes('@')) {
    errors.push('Un email valide est requis');
  }

  if (!profile.profession) {
    errors.push('La profession doit être renseignée');
  }

  if (!profile.expertises || profile.expertises.length === 0) {
    errors.push('Au moins une expertise doit être renseignée');
  }

  if (!profile.preferredLanguage) {
    errors.push('La langue préférée doit être spécifiée');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Génère un ID unique pour une session
 */
export const generateSessionId = (): string => {
  return `qual_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Vérifie si le navigateur supporte les fonctionnalités requises
 */
export const checkBrowserSupport = (): { supported: boolean; missing: string[] } => {
  const missing: string[] = [];

  if (!navigator.mediaDevices?.getUserMedia) {
    missing.push('getUserMedia (accès microphone)');
  }

  if (!window.MediaRecorder) {
    missing.push('MediaRecorder (enregistrement audio)');
  }

  if (!window.AudioContext && !(window as any).webkitAudioContext) {
    missing.push('AudioContext (traitement audio)');
  }

  if (!window.WebSocket) {
    missing.push('WebSocket (connexion temps réel)');
  }

  return {
    supported: missing.length === 0,
    missing
  };
};

/**
 * Calcule le score de confiance global d'une analyse IA
 */
export const calculateOverallConfidence = (analysis: AIAnalysis): number => {
  const scores = [
    analysis.technicalSkills,
    analysis.communicationSkills,
    analysis.problemSolvingSkills,
    analysis.experienceLevel
  ];

  // Moyenne pondérée avec facteur de fiabilité
  const average = scores.reduce((acc, score) => acc + score, 0) / scores.length;
  return Math.round(average * (analysis.reliabilityScore / 100));
};

// ==========================================
// DOCUMENTATION DU MODULE
// ==========================================

/**
 * ## Module IA QUALIFICATION
 *
 * ### Fonctionnalités principales :
 *
 * 1. **Qualification vocale temps réel**
 *    - Intégration OpenAI Realtime API
 *    - Questions adaptatives selon profil
 *    - Transcription automatique
 *    - Analyse vocale avancée
 *
 * 2. **Interface utilisateur moderne**
 *    - Design glassmorphism avec effets néon
 *    - Animations fluides avec Framer Motion
 *    - Support dark/light mode complet
 *    - Monitoring audio temps réel
 *
 * 3. **Intelligence artificielle**
 *    - Génération automatique de questions
 *    - Scoring intelligent multi-critères
 *    - Analyse comportementale vocale
 *    - Recommandations personnalisées
 *
 * 4. **Gestion des sessions**
 *    - États complets (pause, reprise, annulation)
 *    - Timer par question avec timeout
 *    - Qualité de connexion monitoring
 *    - Gestion d'erreurs robuste
 *
 * 5. **Architecture WebRTC**
 *    - Audio bidirectionnel haute qualité
 *    - Réduction de bruit automatique
 *    - Serveurs TURN/STUN intégrés
 *    - Faible latence optimisée
 *
 * ### Architecture :
 *
 * - **Services** : QualificationAPI + RealtimeAudioService
 * - **Hooks** : useQualification + useRealtimeAudio
 * - **Composants** : ModularQualificationView avec sous-composants
 * - **Types** : Plus de 40 interfaces TypeScript
 *
 * ### Integration avec OpenAI :
 *
 * - Modèle : gpt-4o-realtime-preview-2024-10-01
 * - Format audio : PCM16 à 24kHz
 * - Détection de parole automatique
 * - Feedback temps réel
 *
 * ### Usage :
 *
 * ```typescript
 * import { ModularQualificationView, useQualification } from '@/modules/ia-qualification';
 *
 * // Dans un composant candidat
 * <ModularQualificationView
 *   candidateProfile={candidate}
 *   onTestComplete={handleResults}
 *   autoStart={true}
 *   showProgress={true}
 *   theme="dark"
 * />
 *
 * // Ou utiliser les hooks directement
 * const { startTest, submitAnswer, currentQuestion } = useQualification();
 * const { connect, startRecording, transcript } = useRealtimeAudio();
 * ```
 *
 * ### Performance :
 *
 * - Latence audio : < 200ms
 * - Transcription temps réel : < 1s
 * - Analyse IA : < 3s par réponse
 * - Support jusqu'à 20 questions par session
 *
 * ### Sécurité :
 *
 * - Chiffrement audio bout-en-bout
 * - Pas de stockage local des enregistrements
 * - Respect RGPD avec consentement explicite
 * - Anonymisation des données analysées
 */

// Import de types pour éviter les erreurs TypeScript
import type { QualificationLevel, AIAnalysis, CandidateProfile } from './types';