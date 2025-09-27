/**
 * Module ONBOARDING - Index Principal
 *
 * Module complet d'onboarding des candidats pour Team Dash Manager.
 * Centralise toutes les fonctionnalités d'onboarding avec architecture modulaire.
 *
 * Fonctionnalités:
 * - Processus d'onboarding en 6 étapes guidées
 * - API complète avec cache et optimisations
 * - Hook React avec gestion d'état avancée
 * - Interface utilisateur moderne avec stepper progressif
 * - Sauvegarde automatique et persistance des données
 * - Intégration avec le système de qualification IA
 * - Matching de projets en temps réel
 * - Gestion des données référentielles (métiers, compétences, langues)
 * - Workflow complet avec validation et feedback
 * - Compatibilité totale avec composants existants
 *
 * @version 1.0.0
 * @created 2025-09-27
 */

// ==========================================
// EXPORTS TYPES
// ==========================================

export type {
  // Types de base
  QualificationStatus,
  BillingType,
  SeniorityLevel,
  OnboardingStep,
  StepStatus,

  // Interfaces principales
  CandidateProfile,
  CandidateExpertise,
  CandidateLanguage,
  OnboardingData,

  // Données référentielles
  HRCategory,
  HRProfile,
  HRExpertise,
  HRLanguage,

  // Tests et qualification
  TestQuestion,
  TestAnswers,
  QualificationResult,

  // Matching et projets
  ProjectMatch,
  ImprovementSuggestion,

  // Composants
  ModularCandidateOnboardingProps,
  OnboardingStepProps,
  WelcomeStepProps,
  JobStepProps,
  ExpertisesStepProps,
  LanguagesStepProps,
  SeniorityStepProps,
  BillingStepProps,
  TestStepProps,
  ValidationStepProps,
  ProjectsStepProps,

  // Hooks et services
  UseOnboardingProps,
  UseOnboardingReturn,
  CompleteOnboardingRequest,
  OnboardingResponse,
  ProjectSearchParams,
  OnboardingStats,

  // Événements et utilitaires
  OnboardingEvent,
  OnboardingEventData,
  StepValidation,
  StepConfiguration,
  StepTheme
} from './types';

// ==========================================
// EXPORTS SERVICES
// ==========================================

export { OnboardingAPI } from './services';

// ==========================================
// EXPORTS HOOKS
// ==========================================

export { useOnboarding, useCandidateOnboarding } from './hooks';

// ==========================================
// EXPORTS COMPOSANTS
// ==========================================

export {
  ModularCandidateOnboarding,
  CandidateOnboarding,
  OnboardingWizard,
  OnboardingFlow,
  CandidateOnboardingView,
  OnboardingManager,
  CandidateOnboardingDefault
} from './components';

// ==========================================
// CONSTANTES ET CONFIGURATION
// ==========================================

/**
 * Configuration des étapes d'onboarding
 */
export const ONBOARDING_CONSTANTS = {
  // Étapes du processus
  STEPS: {
    WELCOME: 1,
    JOB: 2,
    SKILLS: 3,
    LANGUAGES: 4,
    SENIORITY: 5,
    BILLING: 6
  } as const,

  // Statuts de qualification
  QUALIFICATION_STATUS: {
    PENDING: 'pending',
    STAND_BY: 'stand_by',
    QUALIFIED: 'qualified',
    REJECTED: 'rejected',
    ACCEPTED: 'accepted'
  } as const,

  // Types de facturation
  BILLING_TYPES: {
    COMPANY: 'company',
    MICRO: 'micro'
  } as const,

  // Niveaux de séniorité
  SENIORITY_LEVELS: {
    JUNIOR: 'junior',
    CONFIRMED: 'confirmé',
    SENIOR: 'senior',
    EXPERT: 'expert'
  } as const,

  // Statuts d'étape
  STEP_STATUS: {
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    SKIPPED: 'skipped'
  } as const,

  // Configuration UI
  UI: {
    MAX_CUSTOM_SKILLS: 10,
    MIN_SELECTED_SKILLS: 1,
    MIN_SELECTED_LANGUAGES: 1,
    STEP_ANIMATION_DURATION: 300,
    STEPPER_PROGRESS_ANIMATION: 500,
    AUTO_SAVE_DELAY: 2000 // ms
  },

  // Validation
  VALIDATION: {
    COMPANY_NAME_MIN_LENGTH: 2,
    SIRET_LENGTH: 14,
    CUSTOM_SKILL_MIN_LENGTH: 2,
    CUSTOM_SKILL_MAX_LENGTH: 50
  },

  // Messages
  MESSAGES: {
    LOADING: 'Chargement du profil candidat...',
    SAVING: 'Sauvegarde en cours...',
    COMPLETING: 'Finalisation de l\'onboarding...',
    SUCCESS: 'Profil complété avec succès ! Vous recevrez bientôt des propositions de mission.',
    ERROR: 'Erreur lors de la sauvegarde. Veuillez réessayer.',
    VALIDATION_ERROR: 'Veuillez remplir tous les champs obligatoires.',
    SIRET_INVALID: 'Numéro SIRET invalide. Veuillez vérifier.',
    NETWORK_ERROR: 'Erreur de connexion. Vérifiez votre connexion internet.'
  }
};

/**
 * Configuration des étapes avec métadonnées
 */
export const STEP_CONFIGURATIONS: Record<OnboardingStep, StepConfiguration> = {
  1: {
    step: 1,
    title: "Bienvenue",
    description: "Introduction et présentation du processus",
    icon: "Sparkles",
    color: "from-purple-500 to-pink-500",
    required: true,
    skippable: false,
    timeEstimate: 2,
    validationRules: []
  },
  2: {
    step: 2,
    title: "Métier",
    description: "Sélection du domaine d'activité et du poste",
    icon: "Briefcase",
    color: "from-blue-500 to-cyan-500",
    required: true,
    skippable: false,
    timeEstimate: 5,
    validationRules: ['selectedCategory', 'selectedProfile']
  },
  3: {
    step: 3,
    title: "Compétences",
    description: "Définition des expertises et compétences techniques",
    icon: "Target",
    color: "from-green-500 to-emerald-500",
    required: true,
    skippable: false,
    timeEstimate: 8,
    validationRules: ['selectedExpertises_or_customExpertises']
  },
  4: {
    step: 4,
    title: "Langues",
    description: "Sélection des langues parlées et niveaux",
    icon: "Globe",
    color: "from-yellow-500 to-orange-500",
    required: true,
    skippable: false,
    timeEstimate: 3,
    validationRules: ['selectedLanguages']
  },
  5: {
    step: 5,
    title: "Séniorité",
    description: "Définition du niveau d'expérience",
    icon: "Award",
    color: "from-purple-500 to-indigo-500",
    required: true,
    skippable: false,
    timeEstimate: 3,
    validationRules: ['seniority']
  },
  6: {
    step: 6,
    title: "Facturation",
    description: "Configuration du mode de facturation",
    icon: "Receipt",
    color: "from-red-500 to-pink-500",
    required: true,
    skippable: false,
    timeEstimate: 5,
    validationRules: ['billingType', 'siret_if_company']
  }
};

/**
 * Thèmes visuels pour les étapes
 */
export const STEP_THEMES: Record<OnboardingStep, StepTheme> = {
  1: {
    primaryColor: '#a855f7',
    secondaryColor: '#ec4899',
    gradientFrom: 'from-purple-500',
    gradientTo: 'to-pink-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    borderColor: 'border-purple-200 dark:border-purple-800',
    textColor: 'text-purple-900 dark:text-purple-100'
  },
  2: {
    primaryColor: '#3b82f6',
    secondaryColor: '#06b6d4',
    gradientFrom: 'from-blue-500',
    gradientTo: 'to-cyan-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
    textColor: 'text-blue-900 dark:text-blue-100'
  },
  3: {
    primaryColor: '#10b981',
    secondaryColor: '#059669',
    gradientFrom: 'from-green-500',
    gradientTo: 'to-emerald-500',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    borderColor: 'border-green-200 dark:border-green-800',
    textColor: 'text-green-900 dark:text-green-100'
  },
  4: {
    primaryColor: '#f59e0b',
    secondaryColor: '#ea580c',
    gradientFrom: 'from-yellow-500',
    gradientTo: 'to-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    borderColor: 'border-orange-200 dark:border-orange-800',
    textColor: 'text-orange-900 dark:text-orange-100'
  },
  5: {
    primaryColor: '#8b5cf6',
    secondaryColor: '#6366f1',
    gradientFrom: 'from-purple-500',
    gradientTo: 'to-indigo-500',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/30',
    borderColor: 'border-indigo-200 dark:border-indigo-800',
    textColor: 'text-indigo-900 dark:text-indigo-100'
  },
  6: {
    primaryColor: '#ef4444',
    secondaryColor: '#ec4899',
    gradientFrom: 'from-red-500',
    gradientTo: 'to-pink-500',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-200 dark:border-red-800',
    textColor: 'text-red-900 dark:text-red-100'
  }
};

/**
 * Helpers et utilitaires d'onboarding
 */
export const ONBOARDING_HELPERS = {
  /**
   * Calcule le pourcentage de progression
   */
  calculateProgress: (currentStep: OnboardingStep, totalSteps: number = 6): number => {
    return Math.round((currentStep / totalSteps) * 100);
  },

  /**
   * Vérifie si une étape est complétée
   */
  isStepCompleted: (step: OnboardingStep, data: OnboardingData): boolean => {
    switch (step) {
      case 1: return true; // Bienvenue toujours complète
      case 2: return !!(data.selectedProfile);
      case 3: return data.selectedExpertises.length > 0 || data.customExpertises.length > 0;
      case 4: return data.selectedLanguages.length > 0;
      case 5: return !!(data.seniority);
      case 6: return !!(data.billingType);
      default: return false;
    }
  },

  /**
   * Valide les données d'une étape
   */
  validateStep: (step: OnboardingStep, data: OnboardingData): StepValidation => {
    const errors: string[] = [];
    const warnings: string[] = [];

    switch (step) {
      case 2:
        if (!data.selectedCategory) errors.push('Veuillez sélectionner un domaine d\'activité');
        if (!data.selectedProfile) errors.push('Veuillez sélectionner un poste spécifique');
        break;

      case 3:
        if (data.selectedExpertises.length === 0 && data.customExpertises.length === 0) {
          errors.push('Veuillez sélectionner au moins une compétence');
        }
        if (data.customExpertises.length > ONBOARDING_CONSTANTS.UI.MAX_CUSTOM_SKILLS) {
          warnings.push(`Trop de compétences personnalisées (max ${ONBOARDING_CONSTANTS.UI.MAX_CUSTOM_SKILLS})`);
        }
        break;

      case 4:
        if (data.selectedLanguages.length === 0) {
          errors.push('Veuillez sélectionner au moins une langue');
        }
        break;

      case 5:
        if (!data.seniority) {
          errors.push('Veuillez sélectionner votre niveau de séniorité');
        }
        break;

      case 6:
        if (!data.billingType) {
          errors.push('Veuillez choisir un mode de facturation');
        }
        if (data.billingType === 'company' && !data.siret) {
          errors.push('Veuillez fournir un numéro SIRET valide');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  },

  /**
   * Génère un résumé des données d'onboarding
   */
  generateSummary: (data: OnboardingData): string => {
    const parts: string[] = [];

    if (data.selectedProfile) parts.push(`Métier sélectionné`);
    if (data.selectedExpertises.length > 0) parts.push(`${data.selectedExpertises.length} compétences`);
    if (data.customExpertises.length > 0) parts.push(`${data.customExpertises.length} compétences personnalisées`);
    if (data.selectedLanguages.length > 0) parts.push(`${data.selectedLanguages.length} langues`);
    if (data.seniority) parts.push(`Niveau ${data.seniority}`);
    if (data.billingType) parts.push(`Facturation ${data.billingType}`);

    return parts.join(' • ');
  },

  /**
   * Estime le temps restant
   */
  estimateTimeRemaining: (currentStep: OnboardingStep): number => {
    const remainingSteps = Object.keys(STEP_CONFIGURATIONS)
      .map(Number)
      .filter(step => step > currentStep)
      .map(step => STEP_CONFIGURATIONS[step as OnboardingStep].timeEstimate);

    return remainingSteps.reduce((total, time) => total + time, 0);
  }
};

/**
 * Données par défaut pour l'onboarding
 */
export const DEFAULT_ONBOARDING_DATA: Partial<OnboardingData> = {
  step: 1,
  selectedCategory: '',
  selectedProfile: '',
  selectedExpertises: [],
  customExpertises: [],
  selectedLanguages: [],
  seniority: undefined,
  billingType: undefined,
  companyName: '',
  siret: '',
  suggestedProjects: [],
  startedAt: undefined
};

/**
 * Configuration des événements d'onboarding
 */
export const ONBOARDING_EVENTS = {
  STARTED: 'started',
  STEP_COMPLETED: 'step_completed',
  TEST_STARTED: 'test_started',
  TEST_COMPLETED: 'test_completed',
  QUALIFICATION_PENDING: 'qualification_pending',
  QUALIFICATION_APPROVED: 'qualification_approved',
  QUALIFICATION_REJECTED: 'qualification_rejected',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  PROJECTS_VIEWED: 'projects_viewed'
} as const;

// ==========================================
// API QUICK ACCESS
// ==========================================

/**
 * API de raccourci pour les actions courantes
 */
export const onboardingAPI = {
  // Profil candidat
  getCandidateProfile: OnboardingAPI.getCandidateProfile,
  checkIfOnboardingNeeded: OnboardingAPI.checkIfOnboardingNeeded,
  updateOnboardingStep: OnboardingAPI.updateOnboardingStep,

  // Données référentielles
  getCategories: OnboardingAPI.getHRCategories,
  getProfiles: OnboardingAPI.getHRProfiles,
  getExpertises: OnboardingAPI.getHRExpertises,
  getLanguages: OnboardingAPI.getHRLanguages,

  // Compétences candidat
  getCandidateExpertises: OnboardingAPI.getCandidateExpertises,
  getCandidateLanguages: OnboardingAPI.getCandidateLanguages,
  saveExpertises: OnboardingAPI.saveCandidateExpertises,
  saveLanguages: OnboardingAPI.saveCandidateLanguages,

  // Workflow
  completeOnboarding: OnboardingAPI.completeOnboarding,
  resetOnboarding: OnboardingAPI.resetOnboarding,

  // Projets
  findMatchingProjects: OnboardingAPI.findMatchingProjects,
  generateSuggestions: OnboardingAPI.generateImprovementSuggestions
};

// Export par défaut du module complet
export default {
  OnboardingAPI,
  useOnboarding,
  useCandidateOnboarding,
  ModularCandidateOnboarding,
  CandidateOnboarding,
  ONBOARDING_CONSTANTS,
  STEP_CONFIGURATIONS,
  STEP_THEMES,
  ONBOARDING_HELPERS,
  DEFAULT_ONBOARDING_DATA,
  ONBOARDING_EVENTS,
  onboardingAPI
};