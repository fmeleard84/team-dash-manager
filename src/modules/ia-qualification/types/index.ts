/**
 * Module IA QUALIFICATION - Types Principal
 *
 * Types TypeScript pour le système de qualification IA avec :
 * - Qualification audio en temps réel via OpenAI Realtime
 * - Tests adaptatifs basés sur profil candidat
 * - Scoring automatique et feedback détaillé
 * - Gestion des sessions de test
 */

// ==========================================
// CORE TYPES - QUALIFICATION
// ==========================================

export interface Question {
  id: string;
  question: string;
  category: QuestionCategory;
  difficulty: QuestionDifficulty;
  expectedKeywords?: string[];
  metadata?: {
    profession?: string;
    seniority?: string;
    domain?: string;
    estimatedDuration?: number; // en secondes
  };
}

export interface Answer {
  questionId: string;
  userAnswer: string;
  audioData?: string; // Base64 encoded audio
  transcript?: string; // Transcription de la réponse
  score: number; // Score entre 0 et 100
  feedback?: string;
  timestamp: Date;
  duration: number; // Durée de la réponse en secondes
  confidence: number; // Niveau de confiance IA
  keywords: {
    expected: string[];
    found: string[];
    missing: string[];
  };
}

export interface QualificationTest {
  id: string;
  candidateId: string;
  candidateProfile: CandidateProfile;

  // Configuration du test
  testConfig: TestConfig;

  // Questions et réponses
  questions: Question[];
  answers: Answer[];

  // Résultats
  overallScore: number;
  status: TestStatus;
  qualificationLevel: QualificationLevel;

  // Métadonnées
  startedAt: string;
  completedAt?: string;
  duration?: number; // Durée totale en secondes

  // AI Assessment
  aiAnalysis: AIAnalysis;

  // Recommandations
  recommendations: Recommendation[];
}

export interface TestSession {
  id: string;
  testId: string;

  // État de la session
  currentQuestionIndex: number;
  isActive: boolean;
  isPaused: boolean;

  // Audio et connexion
  isConnected: boolean;
  isRecording: boolean;
  isMuted: boolean;
  audioLevel: number;
  volume: number;

  // Transcription temps réel
  currentTranscript: string;
  assistantMessage: string;

  // État technique
  error: string | null;
  retryCount: number;
  connectionQuality: 'excellent' | 'good' | 'poor';
}

// ==========================================
// CONFIGURATION ET PARAMÈTRES
// ==========================================

export interface TestConfig {
  // Paramètres généraux
  maxQuestions: number;
  timePerQuestion: number; // en secondes
  adaptiveMode: boolean; // Questions adaptées selon les réponses

  // Critères de sélection des questions
  categories: QuestionCategory[];
  difficulties: QuestionDifficulty[];
  profession?: string;
  seniority?: string;

  // Paramètres audio
  audioConfig: {
    sampleRate: number;
    channels: number;
    enableNoiseReduction: boolean;
    enableEchoCancellation: boolean;
  };

  // Scoring
  passingScore: number; // Score minimum pour être qualifié
  scoringWeights: {
    technical: number;
    communication: number;
    problemSolving: number;
    experience: number;
  };
}

export interface CandidateProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;

  // Profil professionnel
  profession?: string;
  seniority?: string;
  expertises: string[];
  languages: string[];

  // Expérience
  yearsOfExperience?: number;
  previousTests?: string[]; // IDs des tests précédents

  // Préférences
  preferredLanguage: string;
  timezone: string;
}

// ==========================================
// ANALYSE IA ET RÉSULTATS
// ==========================================

export interface AIAnalysis {
  // Scores par catégorie
  technicalSkills: number;
  communicationSkills: number;
  problemSolvingSkills: number;
  experienceLevel: number;

  // Analyse qualitative
  strengths: string[];
  weaknesses: string[];
  improvementAreas: string[];

  // Confiance de l'IA
  overallConfidence: number;
  reliabilityScore: number;

  // Comparaison avec les pairs
  peerComparison: {
    percentile: number;
    averageScore: number;
    sampleSize: number;
  };

  // Métadonnées de l'analyse
  modelVersion: string;
  analysisTimestamp: string;
  processingTimeMs: number;
}

export interface Recommendation {
  id: string;
  type: RecommendationType;
  priority: 'high' | 'medium' | 'low';

  title: string;
  description: string;
  actionable: boolean;

  // Ressources suggérées
  resources?: {
    type: 'article' | 'course' | 'practice' | 'mentoring';
    title: string;
    url?: string;
    duration?: string;
  }[];

  // Estimation d'amélioration
  expectedImprovement?: {
    skillArea: string;
    estimatedGainPoints: number;
    timeToImprove: string;
  };
}

// ==========================================
// TYPES TEMPS RÉEL ET AUDIO
// ==========================================

export interface RealtimeConnection {
  // État de la connexion
  isConnected: boolean;
  connectionId?: string;
  ephemeralKey?: string;

  // WebRTC
  peerConnection?: RTCPeerConnection;
  dataChannel?: RTCDataChannel;
  mediaStream?: MediaStream;

  // Qualité
  latency: number;
  jitter: number;
  packetLoss: number;

  // Événements
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onMessage?: (message: RealtimeMessage) => void;
}

export interface RealtimeMessage {
  type: MessageType;
  data: any;
  timestamp: string;
  id?: string;
}

export interface AudioAnalysis {
  // Analyse vocale
  speakingRate: number; // mots par minute
  pauseCount: number;
  averagePauseLength: number;
  volumeVariation: number;

  // Qualité audio
  signalToNoiseRatio: number;
  clarity: number;
  backgroundNoiseLevel: number;

  // Détection émotionnelle (basique)
  confidence: number;
  stress: number;
  engagement: number;
}

// ==========================================
// ENUMS ET CONSTANTES
// ==========================================

export type QuestionCategory =
  | 'technical'
  | 'behavioral'
  | 'situational'
  | 'problem_solving'
  | 'communication'
  | 'experience';

export type QuestionDifficulty =
  | 'easy'
  | 'medium'
  | 'hard'
  | 'expert';

export type TestStatus =
  | 'initialized'
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'expired';

export type QualificationLevel =
  | 'validated'     // 80-100%
  | 'stand_by'      // 60-79%
  | 'rejected'      // 0-59%
  | 'needs_review'; // Cas spéciaux

export type RecommendationType =
  | 'skill_improvement'
  | 'practice_suggestion'
  | 'learning_resource'
  | 'certification'
  | 'experience_gap'
  | 'communication_tip';

export type MessageType =
  | 'session_start'
  | 'session_end'
  | 'question'
  | 'answer'
  | 'feedback'
  | 'error'
  | 'heartbeat'
  | 'config_update';

// ==========================================
// API RESPONSE TYPES
// ==========================================

export interface QualificationAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  metadata?: {
    requestId?: string;
    timestamp?: string;
    processingTime?: number;
  };
}

export interface GenerateQuestionsRequest {
  candidateProfile: CandidateProfile;
  testConfig: TestConfig;
  excludeQuestions?: string[]; // IDs des questions à exclure
}

export interface GenerateQuestionsResponse {
  questions: Question[];
  estimatedDuration: number;
  adaptiveParams: {
    startingDifficulty: QuestionDifficulty;
    adjustmentStrategy: 'conservative' | 'aggressive' | 'balanced';
  };
}

export interface StartSessionRequest {
  testId: string;
  candidateId: string;
  audioConfig?: Partial<TestConfig['audioConfig']>;
}

export interface StartSessionResponse {
  sessionId: string;
  connectionParams: {
    ephemeralKey: string;
    serverUrl: string;
    turnServers?: RTCIceServer[];
  };
  firstQuestion: Question;
}

export interface SubmitAnswerRequest {
  sessionId: string;
  questionId: string;
  answer: Omit<Answer, 'score' | 'feedback' | 'keywords'>;
}

export interface SubmitAnswerResponse {
  score: number;
  feedback: string;
  keywords: Answer['keywords'];
  nextQuestion?: Question;
  shouldContinue: boolean;
  currentProgress: {
    questionsAnswered: number;
    totalQuestions: number;
    currentScore: number;
  };
}

// ==========================================
// HOOKS RETURN TYPES
// ==========================================

export interface UseQualificationTestReturn {
  // État du test
  test: QualificationTest | null;
  session: TestSession | null;
  loading: boolean;
  error: string | null;

  // Actions principales
  startTest: (candidateProfile: CandidateProfile, config?: Partial<TestConfig>) => Promise<string | null>;
  submitAnswer: (answer: Omit<Answer, 'score' | 'feedback' | 'keywords'>) => Promise<boolean>;
  pauseTest: () => void;
  resumeTest: () => void;
  cancelTest: () => void;

  // Navigation
  currentQuestion: Question | null;
  goToNextQuestion: () => void;
  goToPreviousQuestion: () => void;

  // Progression
  progress: {
    current: number;
    total: number;
    percentage: number;
  };

  // Résultats
  getResults: () => Promise<QualificationTest | null>;

  // Utilitaires
  isTestComplete: boolean;
  canProceed: boolean;
  timeRemaining: number | null;
}

export interface UseRealtimeAudioReturn {
  // Connexion
  connection: RealtimeConnection | null;
  isConnected: boolean;
  isInitialized: boolean;

  // Audio
  isRecording: boolean;
  isMuted: boolean;
  audioLevel: number;
  volume: number;

  // Transcription
  transcript: string;
  assistantMessage: string;

  // Actions
  connect: (config?: Partial<TestConfig['audioConfig']>) => Promise<boolean>;
  disconnect: () => void;
  startRecording: () => void;
  stopRecording: () => void;
  toggleMute: () => void;
  setVolume: (volume: number) => void;

  // État
  error: string | null;
  connectionQuality: TestSession['connectionQuality'];

  // Événements
  onMessage: (callback: (message: RealtimeMessage) => void) => void;
  onTranscript: (callback: (transcript: string) => void) => void;
  onError: (callback: (error: Error) => void) => void;
}

// ==========================================
// COMPONENT PROPS
// ==========================================

export interface ModularQualificationViewProps {
  candidateProfile: CandidateProfile;
  onTestComplete: (result: QualificationTest) => void;
  onCancel?: () => void;

  // Configuration
  autoStart?: boolean;
  customConfig?: Partial<TestConfig>;
  showProgress?: boolean;
  showTimer?: boolean;

  // Style
  className?: string;
  theme?: 'light' | 'dark';
}

export interface QualificationTestUIProps {
  question: Question;
  onAnswer: (answer: string) => void;
  onSkip?: () => void;

  // État
  isRecording: boolean;
  transcript: string;
  timeRemaining?: number;

  // Actions audio
  onStartRecording: () => void;
  onStopRecording: () => void;
  onToggleMute: () => void;

  // Style
  disabled?: boolean;
  className?: string;
}

export interface TestResultsDisplayProps {
  test: QualificationTest;
  showDetails?: boolean;
  onRetry?: () => void;
  onClose?: () => void;

  className?: string;
}

// ==========================================
// UTILITAIRES ET CONFIGURATION
// ==========================================

export interface QualificationModuleConfig {
  name: string;
  version: string;
  features: string[];
  supportedLanguages: string[];
  audioFormats: string[];
  maxSessionDuration: number;
  maxRetryAttempts: number;
}

// Constantes
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
  NOISE_GATE_THRESHOLD: -50 // dB
} as const;

export type KeysOf<T> = keyof T;
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;