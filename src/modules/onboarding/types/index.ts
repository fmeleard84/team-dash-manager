/**
 * Module ONBOARDING - Types et Interfaces
 *
 * Types complets pour le système d'onboarding des candidats.
 * Basé sur la logique métier existante de CandidateOnboarding.tsx.
 *
 * Fonctionnalités types:
 * - Processus d'onboarding en 6 étapes
 * - Profil candidat et statuts
 * - Données métier et compétences
 * - Configuration facturation et entreprise
 * - Tests de qualification et validation
 * - Matching de projets et recommandations
 * - Workflow complet avec persistance
 *
 * @version 1.0.0
 * @created 2025-09-27
 */

// ==========================================
// ENUMS ET CONSTANTES
// ==========================================

/**
 * Statuts de qualification candidat
 */
export type QualificationStatus =
  | 'pending'      // En attente de qualification
  | 'stand_by'     // En pause
  | 'qualified'    // Qualifié et actif
  | 'rejected'     // Non qualifié
  | 'accepted';    // Accepté pour missions

/**
 * Types de facturation
 */
export type BillingType =
  | 'company'      // Société existante
  | 'micro';       // Micro-entreprise

/**
 * Niveaux de séniorité
 */
export type SeniorityLevel =
  | 'junior'       // Junior (< 2 ans)
  | 'confirmé'     // Confirmé (2-5 ans)
  | 'senior'       // Senior (5-10 ans)
  | 'expert';      // Expert (> 10 ans)

/**
 * Étapes du processus d'onboarding
 */
export type OnboardingStep =
  | 1  // Bienvenue
  | 2  // Métier
  | 3  // Compétences
  | 4  // Langues
  | 5  // Séniorité
  | 6; // Facturation

/**
 * Statuts d'étape d'onboarding
 */
export type StepStatus =
  | 'pending'      // Non commencé
  | 'in_progress'  // En cours
  | 'completed'    // Terminé
  | 'skipped';     // Sauté

// ==========================================
// INTERFACES PRINCIPALES
// ==========================================

/**
 * Profil candidat pour l'onboarding
 */
export interface CandidateProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  profile_id?: string;
  category_id?: string;
  seniority?: SeniorityLevel;
  qualification_status?: QualificationStatus;
  onboarding_step?: number;
  created_at?: string;
  updated_at?: string;
  last_seen?: string;

  // Données facturation
  billing_type?: BillingType;
  company_name?: string;
  siret?: string;

  // Métadonnées
  avatar_url?: string;
  bio?: string;
  linkedin_url?: string;
  portfolio_url?: string;

  // Relations avec les données métier (calculées)
  category_name?: string;
  profile_name?: string;
  expertises?: CandidateExpertise[];
  languages?: CandidateLanguage[];
}

/**
 * Expertise d'un candidat
 */
export interface CandidateExpertise {
  id: string;
  candidate_id: string;
  expertise_id: string;
  expertise_name?: string;
  level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  years_experience?: number;
  certified?: boolean;
  created_at?: string;
}

/**
 * Langue parlée par un candidat
 */
export interface CandidateLanguage {
  id: string;
  candidate_id: string;
  language_id: string;
  language_name?: string;
  level?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'native';
  certified?: boolean;
  created_at?: string;
}

/**
 * Données collectées lors de l'onboarding
 */
export interface OnboardingData {
  step: OnboardingStep;

  // Étape 2 - Métier
  selectedCategory?: string;
  selectedProfile?: string;

  // Étape 3 - Compétences
  selectedExpertises: string[];
  customExpertises: string[];

  // Étape 4 - Langues
  selectedLanguages: string[];

  // Étape 5 - Séniorité
  seniority?: SeniorityLevel;

  // Étape 6 - Facturation
  billingType?: BillingType;
  companyName?: string;
  siret?: string;

  // Tests et qualification
  testAnswers?: TestAnswers;
  testScore?: number;
  qualificationStatus?: QualificationStatus;

  // Projets suggérés
  suggestedProjects: ProjectMatch[];

  // Métadonnées
  startedAt?: string;
  completedAt?: string;
  currentStepStartedAt?: string;
}

/**
 * Référentiel des catégories métier
 */
export interface HRCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  order_index?: number;
  active?: boolean;
  created_at?: string;
}

/**
 * Référentiel des profils métier
 */
export interface HRProfile {
  id: string;
  category_id: string;
  name: string;
  description?: string;
  base_price?: number;
  skills?: string[];
  requirements?: string[];
  active?: boolean;
  created_at?: string;

  // Relations
  category_name?: string;
}

/**
 * Référentiel des expertises
 */
export interface HRExpertise {
  id: string;
  category_id: string;
  name: string;
  description?: string;
  level?: 'basic' | 'intermediate' | 'advanced';
  popular?: boolean;
  active?: boolean;
  created_at?: string;

  // Relations
  category_name?: string;
}

/**
 * Référentiel des langues
 */
export interface HRLanguage {
  id: string;
  name: string;
  code: string; // ISO 639-1
  flag?: string;
  popular?: boolean;
  active?: boolean;
  created_at?: string;
}

// ==========================================
// TYPES DE TESTS ET QUALIFICATION
// ==========================================

/**
 * Question de test
 */
export interface TestQuestion {
  id: string;
  profile_id?: string;
  category_id?: string;
  question: string;
  type: 'multiple_choice' | 'single_choice' | 'text' | 'rating';
  options?: string[];
  correct_answer?: number | string;
  points?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  time_limit?: number; // en secondes
  order_index?: number;
  active?: boolean;
  created_at?: string;
}

/**
 * Réponses aux tests
 */
export interface TestAnswers {
  [questionId: string]: number | string | string[];
}

/**
 * Résultats de qualification
 */
export interface QualificationResult {
  id: string;
  candidate_id: string;
  test_answers: TestAnswers;
  score: number;
  max_score?: number;
  qualification_status: QualificationStatus;
  reviewer_id?: string;
  reviewer_notes?: string;
  completed_at?: string;
  created_at?: string;
  updated_at?: string;
}

// ==========================================
// MATCHING ET PROJETS
// ==========================================

/**
 * Projet correspondant au profil candidat
 */
export interface ProjectMatch {
  id: string;
  title: string;
  description: string;
  client_name?: string;
  client_id?: string;
  status: string;
  project_date: string;
  client_budget?: number;
  duration?: number;
  location?: string;
  remote_allowed?: boolean;

  // Données de matching
  match_score: number; // 0-100
  match_reasons: string[];
  required_skills: string[];
  required_expertises: string[];
  required_languages: string[];
  seniority_required?: SeniorityLevel;

  // Métadonnées
  created_at?: string;
  updated_at?: string;
}

/**
 * Suggestions d'amélioration du profil
 */
export interface ImprovementSuggestion {
  type: 'skill' | 'expertise' | 'language' | 'certification' | 'experience';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  potential_projects?: number; // nombre de projets additionnels potentiels
  skill_name?: string;
}

// ==========================================
// INTERFACES COMPOSANTS
// ==========================================

/**
 * Props du composant principal d'onboarding
 */
export interface ModularCandidateOnboardingProps {
  candidateId: string;
  initialStep?: OnboardingStep;
  onComplete?: (data?: OnboardingData) => void;
  onStepChange?: (step: OnboardingStep) => void;
  skipTests?: boolean;
  showProjects?: boolean;
  className?: string;
}

/**
 * Props des étapes individuelles
 */
export interface OnboardingStepProps {
  data: OnboardingData;
  onDataChange: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onPrev: () => void;
  isLoading?: boolean;
}

/**
 * Props de l'étape bienvenue
 */
export interface WelcomeStepProps extends OnboardingStepProps {
  candidateName?: string;
}

/**
 * Props de l'étape métier
 */
export interface JobStepProps extends OnboardingStepProps {
  categories: HRCategory[];
  profiles: HRProfile[];
  onCategoryChange: (categoryId: string) => void;
  onProfileChange: (profileId: string) => void;
}

/**
 * Props de l'étape compétences
 */
export interface ExpertisesStepProps extends OnboardingStepProps {
  expertises: HRExpertise[];
  onExpertisesChange: (expertiseIds: string[]) => void;
  onCustomExpertisesChange: (customs: string[]) => void;
}

/**
 * Props de l'étape langues
 */
export interface LanguagesStepProps extends OnboardingStepProps {
  languages: HRLanguage[];
  onLanguagesChange: (languageIds: string[]) => void;
}

/**
 * Props de l'étape séniorité
 */
export interface SeniorityStepProps extends OnboardingStepProps {
  onSeniorityChange: (seniority: SeniorityLevel) => void;
}

/**
 * Props de l'étape facturation
 */
export interface BillingStepProps extends OnboardingStepProps {
  onBillingTypeChange: (type: BillingType) => void;
  onCompanyDataChange: (name: string, siret: string) => void;
  onComplete: () => Promise<void>;
}

/**
 * Props de l'étape test
 */
export interface TestStepProps extends OnboardingStepProps {
  questions: TestQuestion[];
  testAnswers: TestAnswers;
  onAnswersChange: (answers: TestAnswers, score: number) => void;
  timeLimit?: number;
}

/**
 * Props de l'étape validation
 */
export interface ValidationStepProps extends OnboardingStepProps {
  testScore?: number;
  qualificationStatus?: QualificationStatus;
  onStatusChange: (status: QualificationStatus) => void;
}

/**
 * Props de l'étape projets
 */
export interface ProjectsStepProps extends OnboardingStepProps {
  candidateId: string;
  profileId?: string;
  expertises: string[];
  suggestedProjects: ProjectMatch[];
  improvementSuggestions?: ImprovementSuggestion[];
  onProjectsLoaded: (projects: ProjectMatch[]) => void;
  onComplete: () => void;
}

// ==========================================
// INTERFACES HOOKS ET SERVICES
// ==========================================

/**
 * Props du hook d'onboarding
 */
export interface UseOnboardingProps {
  candidateId?: string;
  initialStep?: OnboardingStep;
  autoSave?: boolean;
  autoAdvance?: boolean;
}

/**
 * Retour du hook d'onboarding
 */
export interface UseOnboardingReturn {
  // État
  candidateProfile: CandidateProfile | null;
  needsOnboarding: boolean;
  isLoading: boolean;
  currentStep: OnboardingStep;
  data: OnboardingData;

  // Données référentielles
  categories: HRCategory[];
  profiles: HRProfile[];
  expertises: HRExpertise[];
  languages: HRLanguage[];
  testQuestions: TestQuestion[];

  // Actions
  updateData: (updates: Partial<OnboardingData>) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: OnboardingStep) => void;
  updateOnboardingStep: (step: number) => Promise<void>;
  completeOnboarding: (data: OnboardingData) => Promise<boolean>;
  resetOnboarding: () => Promise<void>;

  // Données calculées
  progress: number; // 0-100
  isStepCompleted: (step: OnboardingStep) => boolean;
  canAdvanceToStep: (step: OnboardingStep) => boolean;

  // Utilitaires
  refetchProfile: () => Promise<void>;
  loadReferentialData: () => Promise<void>;
}

/**
 * Requête de complétion d'onboarding
 */
export interface CompleteOnboardingRequest {
  candidateId: string;
  data: OnboardingData;
}

/**
 * Réponse de l'API d'onboarding
 */
export interface OnboardingResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  validation_errors?: Record<string, string>;
}

/**
 * Paramètres de recherche de projets
 */
export interface ProjectSearchParams {
  candidateId: string;
  profileId?: string;
  expertiseIds?: string[];
  languageIds?: string[];
  seniority?: SeniorityLevel;
  location?: string;
  remoteOnly?: boolean;
  maxResults?: number;
}

/**
 * Statistiques d'onboarding
 */
export interface OnboardingStats {
  totalCandidates: number;
  completedOnboarding: number;
  qualifiedCandidates: number;
  averageCompletionTime: number; // en minutes
  dropOffByStep: Record<OnboardingStep, number>;
  conversionRate: number; // pourcentage
}

// ==========================================
// TYPES D'ÉVÉNEMENTS
// ==========================================

/**
 * Événements d'onboarding
 */
export type OnboardingEvent =
  | 'started'
  | 'step_completed'
  | 'test_started'
  | 'test_completed'
  | 'qualification_pending'
  | 'qualification_approved'
  | 'qualification_rejected'
  | 'onboarding_completed'
  | 'projects_viewed';

/**
 * Données d'événement d'onboarding
 */
export interface OnboardingEventData {
  candidateId: string;
  event: OnboardingEvent;
  step?: OnboardingStep;
  timestamp: string;
  data?: any;
}

// ==========================================
// UTILITAIRES ET HELPERS
// ==========================================

/**
 * Validation d'une étape
 */
export interface StepValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Configuration d'une étape
 */
export interface StepConfiguration {
  step: OnboardingStep;
  title: string;
  description: string;
  icon: string;
  color: string;
  required: boolean;
  skippable: boolean;
  timeEstimate: number; // en minutes
  validationRules: string[];
}

/**
 * Thème et apparence des étapes
 */
export interface StepTheme {
  primaryColor: string;
  secondaryColor: string;
  gradientFrom: string;
  gradientTo: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

// Export par défaut de tous les types
export default {
  // Enums
  type QualificationStatus,
  type BillingType,
  type SeniorityLevel,
  type OnboardingStep,
  type StepStatus,

  // Interfaces principales
  type CandidateProfile,
  type CandidateExpertise,
  type CandidateLanguage,
  type OnboardingData,
  type HRCategory,
  type HRProfile,
  type HRExpertise,
  type HRLanguage,

  // Tests et qualification
  type TestQuestion,
  type TestAnswers,
  type QualificationResult,

  // Matching et projets
  type ProjectMatch,
  type ImprovementSuggestion,

  // Composants
  type ModularCandidateOnboardingProps,
  type OnboardingStepProps,
  type WelcomeStepProps,
  type JobStepProps,
  type ExpertisesStepProps,
  type LanguagesStepProps,
  type SeniorityStepProps,
  type BillingStepProps,
  type TestStepProps,
  type ValidationStepProps,
  type ProjectsStepProps,

  // Hooks et services
  type UseOnboardingProps,
  type UseOnboardingReturn,
  type CompleteOnboardingRequest,
  type OnboardingResponse,
  type ProjectSearchParams,
  type OnboardingStats,

  // Événements
  type OnboardingEvent,
  type OnboardingEventData,

  // Utilitaires
  type StepValidation,
  type StepConfiguration,
  type StepTheme
};