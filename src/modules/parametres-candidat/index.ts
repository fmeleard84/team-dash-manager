/**
 * Module PARAMÈTRES CANDIDAT - Index Principal
 *
 * Point d'entrée unique pour le module paramètres candidat.
 * Centralise tous les exports : composants, hooks, services, types et constantes.
 *
 * Architecture modulaire complète pour la gestion des paramètres candidat
 * avec profil personnel/professionnel, compétences, qualification IA,
 * calcul automatique des tarifs et système de préférences avancé.
 *
 * @version 1.0.0
 * @author Team Dash Manager
 * @created 2025-09-27
 */

// Export des composants principaux
export {
  ModularCandidateSettingsView,
  CandidateSettingsManager,
  CandidateParametersView,
  CandidateProfileManager,
  CandidateConfigurationPanel,
  CandidateSettingsInterface
} from './components';

// Export des hooks
export { useCandidateSettings } from './hooks';

// Export des services
export { CandidateSettingsAPI } from './services';

// Export de tous les types
export type {
  // Interfaces principales
  CandidateSettings,
  CandidateSettingsResponse,
  UseCandidateSettingsReturn,
  CandidateSettingsSection,

  // Sections de paramètres
  PersonalSettings,
  ProfessionalSettings,
  SkillsSettings,
  QualificationSettings,
  CandidatePreferences,
  CandidateNotificationSettings,
  CandidateSecuritySettings,
  PrivacySettings,

  // Types d'énumération
  CandidateStatus,
  QualificationStatus,
  SeniorityLevel,
  WorkLocationType,
  TeamSizePreference,
  QualificationMethod,
  LanguageLevel,
  ExpertiseLevel,

  // Compétences
  CandidateLanguage,
  CandidateExpertise,
  CustomSkill,
  Certification,
  Education,
  PortfolioItem,

  // Qualification
  QualificationResult,
  QualificationSection,
  CandidateEvaluation,
  ClientFeedback,

  // Calcul de tarifs
  RateCalculationConfig,
  CalculatedRate,
  RateBreakdown,

  // Validation
  ValidationWarning,
  ValidationSeverity,

  // Opérations API
  UpdateCandidateSettingsRequest,
  UpdateCandidateSettingsResponse
} from './types';

/**
 * CONSTANTES MODULE PARAMÈTRES CANDIDAT
 *
 * Configuration centralisée du module avec tous les paramètres
 * par défaut, multiplicateurs de tarifs et options de configuration.
 */
export const CANDIDATE_SETTINGS_CONSTANTS = {
  // Informations du module
  MODULE_INFO: {
    name: 'PARAMÈTRES CANDIDAT',
    version: '1.0.0',
    description: 'Gestion complète des paramètres et profils candidat',
    author: 'Team Dash Manager',
    created: '2025-09-27'
  },

  // Sections disponibles
  SECTIONS: {
    PERSONAL: 'personal' as const,
    PROFESSIONAL: 'professional' as const,
    SKILLS: 'skills' as const,
    QUALIFICATION: 'qualification' as const,
    PREFERENCES: 'preferences' as const,
    NOTIFICATIONS: 'notifications' as const,
    SECURITY: 'security' as const,
    PRIVACY: 'privacy' as const
  },

  // Statuts candidat
  CANDIDATE_STATUS: {
    QUALIFICATION: 'qualification',
    DISPONIBLE: 'disponible',
    EN_PAUSE: 'en_pause',
    INDISPONIBLE: 'indisponible',
    INACTIF: 'inactif'
  },

  // Niveaux de séniorité avec multiplicateurs
  SENIORITY_LEVELS: {
    JUNIOR: {
      key: 'junior' as const,
      label: 'Junior',
      multiplier: 1.0,
      description: 'Moins de 2 ans d\'expérience'
    },
    INTERMEDIATE: {
      key: 'intermediate' as const,
      label: 'Intermédiaire',
      multiplier: 1.15,
      description: '2-4 ans d\'expérience'
    },
    CONFIRME: {
      key: 'confirmé' as const,
      label: 'Confirmé',
      multiplier: 1.3,
      description: '4-8 ans d\'expérience'
    },
    SENIOR: {
      key: 'senior' as const,
      label: 'Senior',
      multiplier: 1.6,
      description: '8-15 ans d\'expérience'
    },
    EXPERT: {
      key: 'expert' as const,
      label: 'Expert',
      multiplier: 2.0,
      description: 'Plus de 15 ans d\'expérience'
    }
  },

  // Configuration du calcul des tarifs
  RATE_CALCULATION: {
    BASE_WORKING_HOURS: 8,           // Heures par jour
    MINUTES_PER_HOUR: 60,           // Minutes par heure
    EXPERTISE_BONUS_PERCENT: 0.05,  // 5% par expertise
    LANGUAGE_BONUS_PERCENT: 0.05,   // 5% par langue
    MAX_BONUS_PERCENT: 0.50         // Maximum 50% de bonus
  },

  // Types de localisation de travail
  WORK_LOCATION_TYPES: {
    REMOTE: {
      key: 'remote' as const,
      label: '100% Télétravail',
      icon: 'home'
    },
    ONSITE: {
      key: 'onsite' as const,
      label: 'Sur site client',
      icon: 'building'
    },
    HYBRID: {
      key: 'hybrid' as const,
      label: 'Hybride',
      icon: 'shuffle'
    },
    OFFICE: {
      key: 'office' as const,
      label: 'Bureau/Coworking',
      icon: 'briefcase'
    }
  },

  // Méthodes de qualification
  QUALIFICATION_METHODS: {
    AI_VOICE: {
      key: 'ai_voice' as const,
      label: 'Entretien vocal IA',
      duration: '15-30 min',
      icon: 'mic'
    },
    AI_CHAT: {
      key: 'ai_chat' as const,
      label: 'Chat avec IA',
      duration: '10-20 min',
      icon: 'message-circle'
    },
    HUMAN_INTERVIEW: {
      key: 'human_interview' as const,
      label: 'Entretien humain',
      duration: '30-60 min',
      icon: 'users'
    },
    PORTFOLIO_REVIEW: {
      key: 'portfolio_review' as const,
      label: 'Revue de portfolio',
      duration: '15-45 min',
      icon: 'folder'
    },
    TEST_TECHNIQUE: {
      key: 'test_technique' as const,
      label: 'Test technique',
      duration: '60-120 min',
      icon: 'code'
    }
  },

  // Niveaux de langue (Cadre Européen)
  LANGUAGE_LEVELS: {
    A1: { key: 'A1' as const, label: 'Débutant A1', description: 'Découverte' },
    A2: { key: 'A2' as const, label: 'Débutant A2', description: 'Élémentaire' },
    B1: { key: 'B1' as const, label: 'Intermédiaire B1', description: 'Seuil' },
    B2: { key: 'B2' as const, label: 'Intermédiaire B2', description: 'Avancé' },
    C1: { key: 'C1' as const, label: 'Avancé C1', description: 'Autonome' },
    C2: { key: 'C2' as const, label: 'Avancé C2', description: 'Maîtrise' },
    NATIVE: { key: 'native' as const, label: 'Langue maternelle', description: 'Natif' }
  },

  // Niveaux d'expertise
  EXPERTISE_LEVELS: {
    BEGINNER: { key: 'beginner' as const, label: 'Débutant', years: '0-1', color: 'gray' },
    INTERMEDIATE: { key: 'intermediate' as const, label: 'Intermédiaire', years: '1-3', color: 'blue' },
    ADVANCED: { key: 'advanced' as const, label: 'Avancé', years: '3-6', color: 'green' },
    EXPERT: { key: 'expert' as const, label: 'Expert', years: '6+', color: 'purple' }
  },

  // Paramètres par défaut
  DEFAULT_SETTINGS: {
    personal: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: {
        street: '',
        city: '',
        zipCode: '',
        country: 'FR'
      },
      status: 'disponible' as const,
      workLocation: ['remote', 'hybrid'] as const,
      remoteWorkPercentage: 80
    },

    professional: {
      seniority: 'junior' as const,
      yearsOfExperience: 1,
      currency: 'EUR',
      rateSettings: {
        autoCalculate: true,
        includeExpertiseBonus: true,
        includeLanguageBonus: true
      },
      missionPreferences: {
        minDuration: 5,
        maxDuration: 90,
        preferredProjectTypes: [],
        teamSizePreference: 'small' as const
      }
    },

    preferences: {
      theme: 'system' as const,
      language: 'fr' as const,
      timezone: 'Europe/Paris',
      dashboardLayout: 'cards' as const,
      showAdvancedFeatures: false,
      compactMode: false
    },

    notifications: {
      email: {
        newProjectOpportunities: true,
        projectUpdates: true,
        teamMessages: true,
        clientMessages: true,
        qualificationResults: true,
        invoiceUpdates: true,
        systemUpdates: false,
        marketingEmails: false
      },
      push: {
        enabled: true,
        newOpportunities: true,
        urgentMessages: true,
        projectDeadlines: true,
        qualificationReminders: true
      },
      frequency: 'immediate' as const
    },

    security: {
      twoFactorEnabled: false,
      sessionTimeout: 60,
      allowMultipleSessions: true,
      loginAlerts: true,
      suspiciousActivityAlerts: true
    },

    privacy: {
      profileVisibility: 'clients_only' as const,
      showRatesPublicly: false,
      showExperienceDetails: true,
      allowAnalytics: true,
      allowMarketingCommunications: false
    }
  },

  // Messages et notifications
  MESSAGES: {
    SUCCESS: {
      PERSONAL_UPDATED: 'Informations personnelles mises à jour avec succès',
      PROFESSIONAL_UPDATED: 'Profil professionnel mis à jour avec succès',
      SKILL_ADDED: 'Compétence ajoutée avec succès',
      SKILL_REMOVED: 'Compétence supprimée avec succès',
      PREFERENCES_UPDATED: 'Préférences mises à jour',
      SETTINGS_EXPORTED: 'Paramètres exportés avec succès',
      SETTINGS_IMPORTED: 'Paramètres importés avec succès',
      QUALIFICATION_STARTED: 'Qualification démarrée avec succès'
    },
    ERROR: {
      LOAD_FAILED: 'Erreur lors du chargement des paramètres',
      SAVE_FAILED: 'Erreur lors de la sauvegarde',
      SKILL_ADD_FAILED: 'Erreur lors de l\'ajout de la compétence',
      SKILL_REMOVE_FAILED: 'Erreur lors de la suppression de la compétence',
      EXPORT_FAILED: 'Erreur lors de l\'export',
      IMPORT_FAILED: 'Erreur lors de l\'import',
      QUALIFICATION_FAILED: 'Erreur lors du démarrage de la qualification'
    }
  },

  // Validation
  VALIDATION_RULES: {
    firstName: { minLength: 2, maxLength: 50, required: true },
    lastName: { minLength: 2, maxLength: 50, required: true },
    email: {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      required: true
    },
    phone: {
      pattern: /^[\+]?[0-9\s\-\(\)]{8,20}$/,
      required: false
    },
    yearsOfExperience: { min: 0, max: 50 },
    sessionTimeout: { min: 5, max: 480 }
  },

  // API Endpoints
  API_ENDPOINTS: {
    GET_SETTINGS: '/api/candidate-settings',
    UPDATE_SETTINGS: '/api/candidate-settings/update',
    ADD_LANGUAGE: '/api/candidate-settings/languages/add',
    REMOVE_LANGUAGE: '/api/candidate-settings/languages/remove',
    ADD_EXPERTISE: '/api/candidate-settings/expertises/add',
    REMOVE_EXPERTISE: '/api/candidate-settings/expertises/remove',
    START_QUALIFICATION: '/api/candidate-settings/qualification/start',
    GET_QUALIFICATION_RESULTS: '/api/candidate-settings/qualification/results',
    CALCULATE_RATE: '/api/candidate-settings/calculate-rate',
    EXPORT_SETTINGS: '/api/candidate-settings/export',
    IMPORT_SETTINGS: '/api/candidate-settings/import'
  },

  // Permissions
  PERMISSIONS: {
    READ_OWN: 'candidate_settings:read_own',
    UPDATE_OWN: 'candidate_settings:update_own',
    MANAGE_SKILLS: 'candidate_settings:manage_skills',
    START_QUALIFICATION: 'candidate_settings:start_qualification',
    EXPORT_IMPORT: 'candidate_settings:export_import'
  }
} as const;

/**
 * Utilitaires pour les paramètres par défaut
 */
export const getDefaultCandidateSettings = (candidateId: string) => ({
  id: candidateId,
  candidateId: candidateId,
  ...CANDIDATE_SETTINGS_CONSTANTS.DEFAULT_SETTINGS,
  skills: {
    languages: [],
    expertises: [],
    customSkills: [],
    certifications: [],
    education: [],
    portfolio: []
  },
  qualification: {
    qualificationStatus: 'pending' as const,
    qualificationPreferences: {
      allowAutoQualification: true,
      preferredQualificationMethod: 'ai_voice' as const,
      availableForRequalification: true
    },
    evaluations: [],
    clientFeedback: []
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  version: 1
});

/**
 * Calculateur de tarif journalier avec séniorité
 * Logique identique à CandidateSettings.tsx existant
 */
export const calculateDailyRateFromBase = (basePrice: number, seniority: SeniorityLevel): number => {
  const baseDailyRate = basePrice * CANDIDATE_SETTINGS_CONSTANTS.RATE_CALCULATION.MINUTES_PER_HOUR * CANDIDATE_SETTINGS_CONSTANTS.RATE_CALCULATION.BASE_WORKING_HOURS;
  const multiplier = CANDIDATE_SETTINGS_CONSTANTS.SENIORITY_LEVELS[seniority.toUpperCase() as keyof typeof CANDIDATE_SETTINGS_CONSTANTS.SENIORITY_LEVELS]?.multiplier || 1.0;

  return Math.round(baseDailyRate * multiplier);
};

/**
 * Calculateur de tarif avec bonus compétences
 */
export const calculateRateWithSkillsBonus = (
  baseRate: number,
  expertiseCount: number,
  languageCount: number
): number => {
  const expertiseBonus = expertiseCount * CANDIDATE_SETTINGS_CONSTANTS.RATE_CALCULATION.EXPERTISE_BONUS_PERCENT;
  const languageBonus = languageCount * CANDIDATE_SETTINGS_CONSTANTS.RATE_CALCULATION.LANGUAGE_BONUS_PERCENT;
  const totalBonus = Math.min(
    expertiseBonus + languageBonus,
    CANDIDATE_SETTINGS_CONSTANTS.RATE_CALCULATION.MAX_BONUS_PERCENT
  );

  return Math.round(baseRate * (1 + totalBonus));
};

/**
 * Score de complétude du profil candidat
 */
export const calculateProfileCompletionScore = (settings: any): number => {
  if (!settings) return 0;

  let totalFields = 0;
  let filledFields = 0;

  // Informations personnelles (30%)
  const personalFields = ['firstName', 'lastName', 'email', 'phone'];
  personalFields.forEach(field => {
    totalFields++;
    if (settings.personal?.[field]?.trim()) filledFields++;
  });

  // Profil professionnel (40%)
  const professionalFields = ['profileId', 'seniority', 'yearsOfExperience'];
  professionalFields.forEach(field => {
    totalFields++;
    if (settings.professional?.[field]) filledFields++;
  });

  // Compétences (20%)
  totalFields++;
  if (settings.skills?.languages?.length > 0) filledFields++;

  totalFields++;
  if (settings.skills?.expertises?.length > 0) filledFields++;

  // Qualification (10%)
  totalFields++;
  if (settings.qualification?.qualificationStatus === 'qualified') filledFields++;

  return totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
};

/**
 * Validation d'un champ candidat
 */
export const validateCandidateField = (field: string, value: any): string[] => {
  const errors: string[] = [];
  const rules = CANDIDATE_SETTINGS_CONSTANTS.VALIDATION_RULES;

  switch (field) {
    case 'firstName':
    case 'lastName':
      const nameRule = rules[field as keyof typeof rules];
      if (nameRule.required && !value?.trim()) {
        errors.push(`${field === 'firstName' ? 'Prénom' : 'Nom'} requis`);
      }
      if (value && (value.length < nameRule.minLength || value.length > nameRule.maxLength)) {
        errors.push(`${field === 'firstName' ? 'Prénom' : 'Nom'} doit contenir entre ${nameRule.minLength} et ${nameRule.maxLength} caractères`);
      }
      break;

    case 'email':
      if (rules.email.required && !value?.trim()) {
        errors.push('Email requis');
      }
      if (value && !rules.email.pattern.test(value)) {
        errors.push('Format email invalide');
      }
      break;

    case 'phone':
      if (value && !rules.phone.pattern.test(value)) {
        errors.push('Format téléphone invalide');
      }
      break;

    case 'yearsOfExperience':
      if (value !== undefined && (value < rules.yearsOfExperience.min || value > rules.yearsOfExperience.max)) {
        errors.push(`Années d'expérience doit être entre ${rules.yearsOfExperience.min} et ${rules.yearsOfExperience.max}`);
      }
      break;
  }

  return errors;
};

// Export par défaut du module
export default {
  ModularCandidateSettingsView,
  useCandidateSettings,
  CandidateSettingsAPI,
  CANDIDATE_SETTINGS_CONSTANTS,
  getDefaultCandidateSettings,
  calculateDailyRateFromBase,
  calculateRateWithSkillsBonus,
  calculateProfileCompletionScore,
  validateCandidateField
};