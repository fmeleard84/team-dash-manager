/**
 * Module PARAMÈTRES CANDIDAT - Types TypeScript
 *
 * Types complets pour la gestion des paramètres et profils candidat.
 * Basé sur la logique métier existante de CandidateSettings.tsx.
 *
 * Fonctionnalités couvertes:
 * - Gestion profil personnel et professionnel
 * - Calcul automatique des tarifs selon séniorité
 * - Gestion des compétences (langues, expertises)
 * - Système de qualification intégré
 * - Préférences utilisateur et notifications
 * - Paramètres de compte et sécurité
 *
 * @version 1.0.0
 * @created 2025-09-27
 */

// ==========================================
// INTERFACES PRINCIPALES
// ==========================================

/**
 * Structure principale des paramètres candidat
 * Regroupe toutes les sections de configuration
 */
export interface CandidateSettings {
  id: string;
  candidateId: string;

  // Sections de paramètres
  personal: PersonalSettings;
  professional: ProfessionalSettings;
  skills: SkillsSettings;
  qualification: QualificationSettings;
  preferences: CandidatePreferences;
  notifications: CandidateNotificationSettings;
  security: CandidateSecuritySettings;
  privacy: PrivacySettings;

  // Métadonnées
  createdAt: string;
  updatedAt: string;
  version: number;
}

/**
 * Section informations personnelles
 * Gestion des données de base du candidat
 */
export interface PersonalSettings {
  // Informations de base
  firstName: string;
  lastName: string;
  email: string;
  phone: string;

  // Adresse
  address?: {
    street?: string;
    city?: string;
    zipCode?: string;
    country: string;
  };

  // Informations complémentaires
  dateOfBirth?: string;
  nationality?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;

  // Statut et disponibilité
  status: CandidateStatus;
  availabilityDate?: string;
  workLocation: WorkLocationType[];
  remoteWorkPercentage: number; // 0-100%
}

/**
 * Section profil professionnel
 * Gestion métier, séniorité et tarification
 */
export interface ProfessionalSettings {
  // Profil métier
  profileId?: string;
  jobTitle?: string;
  category?: string;

  // Séniorité et expérience
  seniority: SeniorityLevel;
  yearsOfExperience: number;

  // Tarification
  dailyRate?: number;
  basePrice?: number;
  calculatedRate?: number;
  rateWithExpertise?: number;
  currency: string;

  // Configuration tarifaire
  rateSettings: {
    autoCalculate: boolean;
    includeExpertiseBonus: boolean;
    includeLanguageBonus: boolean;
    customMultiplier?: number;
  };

  // Préférences de mission
  missionPreferences: {
    minDuration: number; // en jours
    maxDuration?: number;
    preferredProjectTypes: string[];
    teamSizePreference: TeamSizePreference;
  };
}

/**
 * Section compétences et expertises
 * Gestion des langues et expertises techniques
 */
export interface SkillsSettings {
  // Langues parlées
  languages: CandidateLanguage[];

  // Expertises techniques
  expertises: CandidateExpertise[];

  // Compétences personnalisées
  customSkills: CustomSkill[];

  // Certifications
  certifications: Certification[];

  // Formation
  education: Education[];

  // Portfolio et réalisations
  portfolio: PortfolioItem[];
}

/**
 * Section qualification et évaluation
 * Intégration avec le système IA de qualification
 */
export interface QualificationSettings {
  // Statut de qualification
  qualificationStatus: QualificationStatus;
  qualificationScore?: number;
  lastQualificationDate?: string;

  // Résultats détaillés
  qualificationResults?: QualificationResult[];

  // Préférences de qualification
  qualificationPreferences: {
    allowAutoQualification: boolean;
    preferredQualificationMethod: QualificationMethod;
    availableForRequalification: boolean;
  };

  // Évaluations et feedback
  evaluations: CandidateEvaluation[];
  clientFeedback: ClientFeedback[];
}

/**
 * Section préférences utilisateur
 * Configuration de l'interface et comportement
 */
export interface CandidatePreferences {
  // Interface
  theme: ThemePreference;
  language: LanguagePreference;
  timezone: string;

  // Dashboard et affichage
  dashboardLayout: DashboardLayout;
  showAdvancedFeatures: boolean;
  compactMode: boolean;

  // Communication
  communicationPreferences: {
    preferredContactMethod: ContactMethod;
    responseTimeExpectation: ResponseTime;
    availabilityHours: AvailabilityHours;
  };

  // Projets et missions
  projectPreferences: {
    autoAcceptMatching: boolean;
    showOnlyRelevantProjects: boolean;
    hideCompletedProjects: boolean;
    projectSortOrder: ProjectSortOrder;
  };
}

/**
 * Section notifications candidat
 * Gestion fine des préférences de notification
 */
export interface CandidateNotificationSettings {
  // Notifications par email
  email: {
    newProjectOpportunities: boolean;
    projectUpdates: boolean;
    teamMessages: boolean;
    clientMessages: boolean;
    qualificationResults: boolean;
    invoiceUpdates: boolean;
    systemUpdates: boolean;
    marketingEmails: boolean;
  };

  // Notifications push
  push: {
    enabled: boolean;
    newOpportunities: boolean;
    urgentMessages: boolean;
    projectDeadlines: boolean;
    qualificationReminders: boolean;
  };

  // Notifications SMS
  sms: {
    enabled: boolean;
    urgentOnly: boolean;
    projectStartReminders: boolean;
  };

  // Fréquence et timing
  frequency: NotificationFrequency;
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm
    end: string; // HH:mm
    timezone: string;
  };

  // Canaux spécifiques
  slackIntegration?: SlackNotificationSettings;
  discordIntegration?: DiscordNotificationSettings;
}

/**
 * Section sécurité candidat
 * Paramètres de sécurité du compte
 */
export interface CandidateSecuritySettings {
  // Authentification
  twoFactorEnabled: boolean;
  biometricEnabled: boolean;

  // Sécurité des sessions
  sessionTimeout: number; // minutes
  allowMultipleSessions: boolean;
  trustedDevices: TrustedDevice[];

  // Alertes de sécurité
  loginAlerts: boolean;
  suspiciousActivityAlerts: boolean;
  deviceChangeAlerts: boolean;

  // Accès et permissions
  dataAccessLog: boolean;
  allowDataExport: boolean;
  allowAccountDeletion: boolean;

  // Backup et récupération
  recoveryEmail?: string;
  recoveryPhone?: string;
  backupCodes: string[];
}

/**
 * Section confidentialité
 * Gestion de la confidentialité des données
 */
export interface PrivacySettings {
  // Visibilité du profil
  profileVisibility: ProfileVisibility;
  showRatesPublicly: boolean;
  showExperienceDetails: boolean;

  // Partage de données
  allowAnalytics: boolean;
  allowPerformanceTracking: boolean;
  allowMarketingCommunications: boolean;

  // Données tierces
  linkedinSyncing: boolean;
  portfolioSyncing: boolean;

  // Rétention des données
  dataRetentionPeriod: number; // mois
  autoDeleteInactiveData: boolean;

  // Consentements RGPD
  gdprConsents: GDPRConsent[];
}

// ==========================================
// TYPES ÉNUMÉRATIONS ET CONSTANTES
// ==========================================

/**
 * Statuts possibles pour un candidat
 */
export type CandidateStatus =
  | 'qualification'      // En cours de qualification
  | 'disponible'        // Disponible pour missions
  | 'en_pause'          // En pause volontaire
  | 'indisponible'      // Indisponible temporairement
  | 'inactif';          // Compte inactif

/**
 * Statuts de qualification candidat
 */
export type QualificationStatus =
  | 'pending'           // En attente de qualification
  | 'in_progress'       // Qualification en cours
  | 'stand_by'          // En attente de complément
  | 'qualified'         // Qualifié et validé
  | 'rejected'          // Refusé
  | 'expired';          // Qualification expirée

/**
 * Niveaux de séniorité
 * Avec multiplicateurs de tarification
 */
export type SeniorityLevel =
  | 'junior'            // x1.0
  | 'intermediate'      // x1.15
  | 'confirmé'          // x1.3
  | 'senior'            // x1.6
  | 'expert';           // x2.0

/**
 * Types de localisation de travail
 */
export type WorkLocationType =
  | 'remote'            // 100% télétravail
  | 'onsite'            // Sur site client
  | 'hybrid'            // Hybride
  | 'office';           // En bureau/coworking

/**
 * Préférences de taille d'équipe
 */
export type TeamSizePreference =
  | 'solo'              // Travail solo
  | 'small'             // Petite équipe (2-5)
  | 'medium'            // Équipe moyenne (6-15)
  | 'large'             // Grande équipe (15+)
  | 'no_preference';    // Pas de préférence

/**
 * Méthodes de qualification
 */
export type QualificationMethod =
  | 'ai_voice'          // Qualification vocale IA
  | 'ai_chat'           // Chat avec IA
  | 'human_interview'   // Entretien humain
  | 'portfolio_review'  // Revue de portfolio
  | 'test_technique';   // Test technique

/**
 * Préférences de thème
 */
export type ThemePreference =
  | 'light'             // Thème clair
  | 'dark'              // Thème sombre
  | 'system';           // Système

/**
 * Préférences de langue
 */
export type LanguagePreference = 'fr' | 'en' | 'es';

/**
 * Layouts de dashboard
 */
export type DashboardLayout =
  | 'cards'             // Vue en cartes
  | 'list'              // Vue en liste
  | 'compact'           // Vue compacte
  | 'kanban';           // Vue kanban

/**
 * Méthodes de contact préférées
 */
export type ContactMethod =
  | 'email'             // Email
  | 'phone'             // Téléphone
  | 'slack'             // Slack
  | 'teams'             // Microsoft Teams
  | 'discord';          // Discord

/**
 * Temps de réponse attendu
 */
export type ResponseTime =
  | 'immediate'         // Immédiat
  | 'within_hour'       // Dans l'heure
  | 'within_day'        // Dans la journée
  | 'within_week';      // Dans la semaine

/**
 * Ordres de tri pour les projets
 */
export type ProjectSortOrder =
  | 'date_desc'         // Plus récents d'abord
  | 'date_asc'          // Plus anciens d'abord
  | 'rate_desc'         // Tarif décroissant
  | 'rate_asc'          // Tarif croissant
  | 'relevance';        // Par pertinence

/**
 * Fréquence des notifications
 */
export type NotificationFrequency =
  | 'immediate'         // Immédiate
  | 'hourly'            // Toutes les heures
  | 'daily'             // Quotidienne
  | 'weekly';           // Hebdomadaire

/**
 * Visibilité du profil
 */
export type ProfileVisibility =
  | 'public'            // Public
  | 'clients_only'      // Clients seulement
  | 'verified_only'     // Clients vérifiés seulement
  | 'private';          // Privé

// ==========================================
// INTERFACES DÉTAILLÉES
// ==========================================

/**
 * Langue parlée par le candidat
 */
export interface CandidateLanguage {
  id: string;
  candidateId: string;
  languageId: string;
  languageName: string;
  level: LanguageLevel;
  certified: boolean;
  createdAt: string;
}

/**
 * Expertise technique du candidat
 */
export interface CandidateExpertise {
  id: string;
  candidateId: string;
  expertiseId: string;
  expertiseName: string;
  level: ExpertiseLevel;
  yearsOfExperience: number;
  certified: boolean;
  createdAt: string;
}

/**
 * Compétence personnalisée
 */
export interface CustomSkill {
  id: string;
  name: string;
  description: string;
  level: SkillLevel;
  category: string;
  verified: boolean;
}

/**
 * Certification professionnelle
 */
export interface Certification {
  id: string;
  name: string;
  organization: string;
  dateObtained: string;
  expirationDate?: string;
  credentialId?: string;
  verificationUrl?: string;
}

/**
 * Formation et éducation
 */
export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate?: string;
  description?: string;
  grade?: string;
}

/**
 * Élément de portfolio
 */
export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  category: string;
  technologies: string[];
  url?: string;
  imageUrl?: string;
  startDate: string;
  endDate?: string;
}

/**
 * Résultat de qualification détaillé
 */
export interface QualificationResult {
  id: string;
  candidateId: string;
  qualificationDate: string;
  method: QualificationMethod;
  score: number;
  maxScore: number;

  // Détail par section
  sections: QualificationSection[];

  // Feedback et recommandations
  feedback?: string;
  recommendations: string[];

  // Validateur
  validatedBy?: string;
  validationDate?: string;
}

/**
 * Section de qualification
 */
export interface QualificationSection {
  name: string;
  score: number;
  maxScore: number;
  details: string;
  strengths: string[];
  improvements: string[];
}

/**
 * Évaluation candidat par le système
 */
export interface CandidateEvaluation {
  id: string;
  candidateId: string;
  projectId?: string;
  evaluationType: EvaluationType;
  score: number;
  criteria: EvaluationCriteria[];
  feedback: string;
  evaluatedBy: string;
  evaluationDate: string;
}

/**
 * Feedback client sur le candidat
 */
export interface ClientFeedback {
  id: string;
  candidateId: string;
  clientId: string;
  projectId: string;
  rating: number; // 1-5
  comment: string;
  skills: SkillRating[];
  wouldRecommend: boolean;
  feedbackDate: string;
}

/**
 * Heures de disponibilité
 */
export interface AvailabilityHours {
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  wednesday: TimeSlot[];
  thursday: TimeSlot[];
  friday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
}

/**
 * Créneau horaire
 */
export interface TimeSlot {
  start: string; // HH:mm
  end: string;   // HH:mm
}

/**
 * Appareil de confiance
 */
export interface TrustedDevice {
  id: string;
  name: string;
  deviceType: DeviceType;
  browserInfo: string;
  lastUsed: string;
  ipAddress: string;
  location?: string;
}

/**
 * Consentement RGPD
 */
export interface GDPRConsent {
  type: ConsentType;
  given: boolean;
  date: string;
  version: string;
}

/**
 * Paramètres de notification Slack
 */
export interface SlackNotificationSettings {
  enabled: boolean;
  webhookUrl: string;
  channel: string;
  username: string;
  notifications: SlackNotificationType[];
}

/**
 * Paramètres de notification Discord
 */
export interface DiscordNotificationSettings {
  enabled: boolean;
  webhookUrl: string;
  channel: string;
  username: string;
  notifications: DiscordNotificationType[];
}

// ==========================================
// TYPES COMPLÉMENTAIRES
// ==========================================

/**
 * Niveaux de langue
 */
export type LanguageLevel =
  | 'A1' | 'A2'         // Débutant
  | 'B1' | 'B2'         // Intermédiaire
  | 'C1' | 'C2'         // Avancé
  | 'native';           // Langue maternelle

/**
 * Niveaux d'expertise
 */
export type ExpertiseLevel =
  | 'beginner'          // Débutant
  | 'intermediate'      // Intermédiaire
  | 'advanced'          // Avancé
  | 'expert';           // Expert

/**
 * Niveaux de compétence génériques
 */
export type SkillLevel =
  | 'novice'            // Novice
  | 'beginner'          // Débutant
  | 'intermediate'      // Intermédiaire
  | 'advanced'          // Avancé
  | 'expert';           // Expert

/**
 * Types d'évaluation
 */
export type EvaluationType =
  | 'technical'         // Technique
  | 'soft_skills'       // Compétences comportementales
  | 'communication'     // Communication
  | 'project_delivery'  // Livraison projet
  | 'overall';          // Global

/**
 * Critères d'évaluation
 */
export interface EvaluationCriteria {
  name: string;
  score: number;
  maxScore: number;
  weight: number;
}

/**
 * Évaluation de compétence
 */
export interface SkillRating {
  skill: string;
  rating: number; // 1-5
}

/**
 * Types d'appareils
 */
export type DeviceType =
  | 'desktop'           // Ordinateur de bureau
  | 'laptop'            // Ordinateur portable
  | 'tablet'            // Tablette
  | 'mobile';           // Mobile

/**
 * Types de consentement RGPD
 */
export type ConsentType =
  | 'data_processing'   // Traitement des données
  | 'marketing'         // Marketing
  | 'analytics'         // Analytique
  | 'third_party'       // Tiers
  | 'cookies';          // Cookies

/**
 * Types de notifications Slack
 */
export type SlackNotificationType =
  | 'new_opportunities' // Nouvelles opportunités
  | 'project_updates'   // Mises à jour projet
  | 'messages'          // Messages
  | 'deadlines';        // Échéances

/**
 * Types de notifications Discord
 */
export type DiscordNotificationType =
  | 'new_opportunities' // Nouvelles opportunités
  | 'project_updates'   // Mises à jour projet
  | 'messages'          // Messages
  | 'deadlines';        // Échéances

// ==========================================
// INTERFACES API ET OPÉRATIONS
// ==========================================

/**
 * Réponse API générique pour les paramètres candidat
 */
export interface CandidateSettingsResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Requête de mise à jour des paramètres
 */
export interface UpdateCandidateSettingsRequest {
  candidateId: string;
  section: CandidateSettingsSection;
  settings: Partial<CandidateSettings>;
  reason?: string;
}

/**
 * Réponse de mise à jour des paramètres
 */
export interface UpdateCandidateSettingsResponse {
  settings: CandidateSettings;
  updatedFields: string[];
  validationWarnings?: ValidationWarning[];
}

/**
 * Sections des paramètres candidat
 */
export type CandidateSettingsSection =
  | 'personal'          // Informations personnelles
  | 'professional'      // Profil professionnel
  | 'skills'            // Compétences
  | 'qualification'     // Qualification
  | 'preferences'       // Préférences
  | 'notifications'     // Notifications
  | 'security'          // Sécurité
  | 'privacy';          // Confidentialité

/**
 * Avertissement de validation
 */
export interface ValidationWarning {
  field: string;
  message: string;
  severity: ValidationSeverity;
  suggestion?: string;
}

/**
 * Niveaux de sévérité de validation
 */
export type ValidationSeverity = 'info' | 'warning' | 'error';

/**
 * Configuration de calcul automatique des tarifs
 */
export interface RateCalculationConfig {
  basePrice: number;
  seniority: SeniorityLevel;
  languages: number;
  expertises: number;
  customMultiplier?: number;
  includeBonus: boolean;
}

/**
 * Résultat de calcul de tarif
 */
export interface CalculatedRate {
  baseRate: number;
  seniorityMultiplier: number;
  expertiseBonus: number;
  languageBonus: number;
  finalRate: number;
  breakdown: RateBreakdown[];
}

/**
 * Détail du calcul de tarif
 */
export interface RateBreakdown {
  component: string;
  value: number;
  percentage: number;
  description: string;
}

/**
 * Retour du hook useCandiDateSettings
 */
export interface UseCandidateSettingsReturn {
  // État des paramètres
  settings: CandidateSettings | null;
  isLoading: boolean;
  error: string | null;

  // Actions principales
  updatePersonalSettings: (settings: Partial<PersonalSettings>) => Promise<boolean>;
  updateProfessionalSettings: (settings: Partial<ProfessionalSettings>) => Promise<boolean>;
  updateSkillsSettings: (settings: Partial<SkillsSettings>) => Promise<boolean>;
  updateQualificationSettings: (settings: Partial<QualificationSettings>) => Promise<boolean>;
  updatePreferences: (preferences: Partial<CandidatePreferences>) => Promise<boolean>;
  updateNotificationSettings: (settings: Partial<CandidateNotificationSettings>) => Promise<boolean>;
  updateSecuritySettings: (settings: Partial<CandidateSecuritySettings>) => Promise<boolean>;
  updatePrivacySettings: (settings: Partial<PrivacySettings>) => Promise<boolean>;

  // Calcul de tarifs
  calculateRate: (config: RateCalculationConfig) => CalculatedRate;
  updateRates: () => Promise<void>;

  // Gestion des compétences
  addLanguage: (languageId: string, level: LanguageLevel) => Promise<boolean>;
  removeLanguage: (languageId: string) => Promise<boolean>;
  addExpertise: (expertiseId: string, level: ExpertiseLevel, years: number) => Promise<boolean>;
  removeExpertise: (expertiseId: string) => Promise<boolean>;

  // Qualification
  startQualification: (method: QualificationMethod) => Promise<string | null>;
  getQualificationResults: () => Promise<QualificationResult[]>;

  // Utilitaires
  resetSection: (section: CandidateSettingsSection) => Promise<boolean>;
  exportSettings: () => Promise<string>;
  importSettings: (settingsJson: string) => Promise<boolean>;

  // État
  isDirty: boolean;
  lastSaved: string | null;
  validationErrors: ValidationWarning[];
}

// Export par défaut de toutes les interfaces principales
export default {
  // Interfaces principales
  CandidateSettings,
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

  // Interfaces API
  CandidateSettingsResponse,
  UpdateCandidateSettingsRequest,
  UpdateCandidateSettingsResponse,
  UseCandidateSettingsReturn,

  // Types de calcul
  RateCalculationConfig,
  CalculatedRate,
  RateBreakdown
};