/**
 * Module PARAMÈTRES CLIENT - Types Principal
 *
 * Types TypeScript pour le système de paramètres et configuration client :
 * - Gestion complète des paramètres de compte
 * - Configuration des notifications et préférences
 * - Paramètres de sécurité et authentification
 * - Gestion de la facturation et des abonnements
 * - Paramètres d'équipe et de collaboration
 * - Configuration des intégrations externes
 * - Paramètres d'interface et d'affichage
 */

// ==========================================
// CORE TYPES - PARAMÈTRES CLIENT
// ==========================================

export interface ClientSettings {
  id: string;
  clientId: string;

  // Informations générales
  general: GeneralSettings;

  // Préférences utilisateur
  preferences: UserPreferences;

  // Paramètres de sécurité
  security: SecuritySettings;

  // Configuration des notifications
  notifications: NotificationSettings;

  // Paramètres de facturation
  billing: BillingSettings;

  // Paramètres d'équipe
  team: TeamSettings;

  // Intégrations externes
  integrations: IntegrationsSettings;

  // Paramètres d'interface
  interface: InterfaceSettings;

  // Métadonnées
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface GeneralSettings {
  // Informations entreprise
  companyName: string;
  industry: string;
  companySize: CompanySize;
  website?: string;
  description?: string;

  // Contact principal
  primaryContact: ContactInfo;

  // Adresse
  address: AddressInfo;

  // Timezone et locale
  timezone: string;
  locale: string;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;

  // Paramètres régionaux
  currency: Currency;
  country: string;

  // Paramètres métier
  businessHours: BusinessHours;
  fiscalYearStart: string; // MM-DD format
}

export interface UserPreferences {
  // Interface utilisateur
  theme: Theme;
  language: Language;
  density: UIDensity;

  // Navigation
  defaultDashboard: DashboardType;
  sidebarCollapsed: boolean;
  showTooltips: boolean;

  // Tableaux et listes
  defaultPageSize: number;
  sortPreferences: SortPreference[];
  columnPreferences: ColumnPreference[];

  // Notifications
  emailDigest: EmailDigestFrequency;
  desktopNotifications: boolean;
  soundEnabled: boolean;

  // Raccourcis clavier
  keyboardShortcuts: boolean;
  customShortcuts: KeyboardShortcut[];

  // Accessibilité
  highContrast: boolean;
  largeText: boolean;
  reduceMotion: boolean;
  screenReader: boolean;
}

export interface SecuritySettings {
  // Authentification
  twoFactorEnabled: boolean;
  twoFactorMethod: TwoFactorMethod;
  backupCodes: string[];

  // Sessions
  sessionTimeout: number; // en minutes
  multipleSessionsAllowed: boolean;
  logoutOnInactive: boolean;

  // Mot de passe
  passwordPolicy: PasswordPolicy;
  passwordExpiration: number; // en jours, 0 = jamais

  // Accès et permissions
  ipWhitelist: string[];
  allowedDomains: string[];
  restrictTimeAccess: boolean;
  allowedTimeRanges: TimeRange[];

  // Audit et logging
  auditLogRetention: number; // en jours
  logFailedAttempts: boolean;
  alertOnSuspiciousActivity: boolean;

  // Confidentialité
  dataRetention: DataRetentionSettings;
  shareAnalytics: boolean;
  allowCookies: CookieSettings;
}

export interface NotificationSettings {
  // Canaux de notification
  channels: NotificationChannel[];

  // Types de notifications
  projectUpdates: NotificationPreference;
  teamActivity: NotificationPreference;
  systemAlerts: NotificationPreference;
  invoicingBilling: NotificationPreference;
  newCandidates: NotificationPreference;
  deadlines: NotificationPreference;

  // Paramètres avancés
  quietHours: QuietHours;
  batchNotifications: boolean;
  smartNotifications: boolean; // IA pour prioriser

  // Intégrations
  slackIntegration: SlackNotificationSettings;
  teamsIntegration: TeamsNotificationSettings;
  webhooks: WebhookSettings[];
}

export interface BillingSettings {
  // Plan et abonnement
  currentPlan: SubscriptionPlan;
  billingCycle: BillingCycle;
  autoRenewal: boolean;

  // Informations de facturation
  billingContact: ContactInfo;
  billingAddress: AddressInfo;

  // Méthodes de paiement
  paymentMethods: PaymentMethod[];
  defaultPaymentMethod: string; // ID de la méthode par défaut

  // Facturation
  invoiceSettings: InvoiceSettings;
  taxSettings: TaxSettings;

  // Limites et quotas
  usageLimits: UsageLimits;
  overage: OverageSettings;

  // Historique
  billingHistory: BillingHistoryEntry[];
  nextBillingDate: string;
  trialEndDate?: string;
}

export interface TeamSettings {
  // Structure d'équipe
  maxTeamMembers: number;
  defaultUserRole: UserRole;

  // Permissions et accès
  rolePermissions: RolePermission[];
  projectVisibility: ProjectVisibility;

  // Collaboration
  allowExternalCollaborators: boolean;
  externalDomainWhitelist: string[];

  // Invitation et onboarding
  invitationSettings: InvitationSettings;
  onboardingEnabled: boolean;
  customOnboardingFlow: OnboardingStep[];

  // Départements et hiérarchie
  departments: Department[];
  hierarchyEnabled: boolean;
  approvalWorkflows: ApprovalWorkflow[];
}

export interface IntegrationsSettings {
  // Intégrations disponibles
  availableIntegrations: Integration[];
  activeIntegrations: ActiveIntegration[];

  // API et webhooks
  apiKeys: APIKey[];
  webhookEndpoints: WebhookEndpoint[];

  // Calendriers
  calendarIntegrations: CalendarIntegration[];

  // Outils de communication
  communicationTools: CommunicationIntegration[];

  // Outils de gestion de projet
  projectManagementTools: ProjectToolIntegration[];

  // Stockage cloud
  cloudStorageIntegrations: CloudStorageIntegration[];

  // Comptabilité
  accountingIntegrations: AccountingIntegration[];
}

export interface InterfaceSettings {
  // Layout et mise en page
  layout: LayoutType;
  compactMode: boolean;
  fluidLayout: boolean;

  // Couleurs et branding
  customBranding: BrandingSettings;
  accentColor: string;
  logoUrl?: string;
  faviconUrl?: string;

  // Widgets et dashboard
  enabledWidgets: DashboardWidget[];
  widgetPositions: WidgetPosition[];

  // Tableaux
  tableSettings: TableSettings;

  // Charts et graphiques
  chartSettings: ChartSettings;

  // Animations et transitions
  animationsEnabled: boolean;
  transitionSpeed: TransitionSpeed;
}

// ==========================================
// TYPES DÉTAILLÉS ET ENUMS
// ==========================================

export type CompanySize =
  | 'startup'      // 1-10 employés
  | 'small'        // 11-50 employés
  | 'medium'       // 51-200 employés
  | 'large'        // 201-1000 employés
  | 'enterprise';  // 1000+ employés

export type Theme = 'light' | 'dark' | 'auto' | 'custom';
export type Language = 'fr' | 'en' | 'es' | 'de' | 'it';
export type UIDensity = 'compact' | 'comfortable' | 'spacious';
export type DashboardType = 'overview' | 'projects' | 'team' | 'analytics' | 'custom';
export type EmailDigestFrequency = 'never' | 'daily' | 'weekly' | 'monthly';

export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' | 'DD-MM-YYYY';
export type TimeFormat = '12h' | '24h';
export type Currency = 'EUR' | 'USD' | 'GBP' | 'CAD' | 'CHF' | 'JPY';

export type TwoFactorMethod = 'sms' | 'email' | 'authenticator' | 'hardware_key';
export type BillingCycle = 'monthly' | 'quarterly' | 'yearly';
export type UserRole = 'admin' | 'manager' | 'member' | 'viewer' | 'custom';
export type ProjectVisibility = 'private' | 'team' | 'public' | 'custom';

export type LayoutType = 'sidebar' | 'topbar' | 'hybrid';
export type TransitionSpeed = 'slow' | 'normal' | 'fast' | 'none';

// ==========================================
// INTERFACES DÉTAILLÉES
// ==========================================

export interface ContactInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  position?: string;
}

export interface AddressInfo {
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export interface BusinessHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
  timezone: string;
}

export interface DaySchedule {
  isWorkingDay: boolean;
  startTime?: string; // HH:mm format
  endTime?: string;   // HH:mm format
  breaks?: TimeSlot[];
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  label?: string;
}

export interface TimeRange {
  start: string; // HH:mm
  end: string;   // HH:mm
  days: number[]; // 0-6 (dimanche-samedi)
}

export interface SortPreference {
  table: string;
  column: string;
  direction: 'asc' | 'desc';
}

export interface ColumnPreference {
  table: string;
  columns: {
    id: string;
    visible: boolean;
    order: number;
    width?: number;
  }[];
}

export interface KeyboardShortcut {
  id: string;
  key: string;
  modifiers: string[];
  action: string;
  description: string;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventReuse: number; // Nombre de mots de passe précédents à éviter
  preventCommonPasswords: boolean;
}

export interface DataRetentionSettings {
  projectData: number;    // en jours
  candidateData: number;
  financialData: number;
  logData: number;
  autoDeleteEnabled: boolean;
}

export interface CookieSettings {
  essential: boolean;     // toujours true
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
}

export interface NotificationChannel {
  type: 'email' | 'sms' | 'push' | 'slack' | 'webhook';
  address: string;
  enabled: boolean;
  verificationStatus: 'pending' | 'verified' | 'failed';
}

export interface NotificationPreference {
  enabled: boolean;
  channels: string[]; // IDs des canaux
  frequency: 'instant' | 'hourly' | 'daily' | 'weekly';
  quietHours: boolean;
}

export interface QuietHours {
  enabled: boolean;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  timezone: string;
  days: number[];    // 0-6
}

export interface SlackNotificationSettings {
  enabled: boolean;
  workspaceId?: string;
  channelId?: string;
  botToken?: string;
  customFormat: boolean;
  mentionUsers: boolean;
}

export interface TeamsNotificationSettings {
  enabled: boolean;
  tenantId?: string;
  channelId?: string;
  webhookUrl?: string;
  customFormat: boolean;
}

export interface WebhookSettings {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret?: string;
  headers: Record<string, string>;
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
  };
  enabled: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: 'basic' | 'pro' | 'enterprise' | 'custom';
  features: string[];
  limits: PlanLimits;
  pricing: {
    monthly: number;
    yearly: number;
    currency: Currency;
  };
}

export interface PlanLimits {
  maxProjects: number;
  maxTeamMembers: number;
  maxCandidates: number;
  storageGB: number;
  apiCallsPerMonth: number;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_transfer' | 'paypal' | 'stripe';
  provider: string;
  last4?: string;
  expiryDate?: string;
  isDefault: boolean;
  billingAddress: AddressInfo;
}

export interface InvoiceSettings {
  invoicePrefix: string;
  invoiceNumbering: 'sequential' | 'yearly_reset';
  paymentTerms: number; // en jours
  lateFeePercent: number;
  includeTax: boolean;
  customFields: InvoiceCustomField[];
  footerText?: string;
  logoUrl?: string;
}

export interface InvoiceCustomField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean';
  required: boolean;
  defaultValue?: string;
}

export interface TaxSettings {
  taxNumber?: string;
  vatNumber?: string;
  taxRates: TaxRate[];
  applyTaxByLocation: boolean;
  includeTaxInPrices: boolean;
}

export interface TaxRate {
  id: string;
  name: string;
  rate: number; // pourcentage
  region?: string;
  type: 'vat' | 'sales_tax' | 'gst' | 'other';
}

export interface UsageLimits {
  projects: number;
  teamMembers: number;
  candidates: number;
  storage: number; // en GB
  apiCalls: number; // par mois
}

export interface OverageSettings {
  enabled: boolean;
  rates: {
    extraProjects: number;    // prix par projet supplémentaire
    extraTeamMembers: number; // prix par membre supplémentaire
    extraStorage: number;     // prix par GB supplémentaire
    extraApiCalls: number;    // prix par 1000 appels API
  };
  limits: {
    maxExtraProjects?: number;
    maxExtraMembers?: number;
    maxExtraStorage?: number; // en GB
  };
}

export interface BillingHistoryEntry {
  id: string;
  date: string;
  amount: number;
  currency: Currency;
  description: string;
  invoiceUrl?: string;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
}

// ==========================================
// API ET RESPONSES
// ==========================================

export interface ClientSettingsResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  metadata?: {
    version?: number;
    lastModified?: string;
    modifiedBy?: string;
  };
}

export interface UpdateSettingsRequest {
  section: SettingsSection;
  settings: Partial<ClientSettings>;
  reason?: string;
}

export interface UpdateSettingsResponse {
  settings: ClientSettings;
  changedFields: string[];
  backupCreated: boolean;
  validationErrors?: ValidationError[];
}

export interface SettingsBackup {
  id: string;
  createdAt: string;
  version: number;
  settings: ClientSettings;
  reason: string;
  createdBy: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning' | 'info';
}

export type SettingsSection =
  | 'general'
  | 'preferences'
  | 'security'
  | 'notifications'
  | 'billing'
  | 'team'
  | 'integrations'
  | 'interface';

// ==========================================
// HOOKS RETURN TYPES
// ==========================================

export interface UseClientSettingsReturn {
  // État des paramètres
  settings: ClientSettings | null;
  isLoading: boolean;
  error: string | null;

  // Actions principales
  updateSettings: (section: SettingsSection, newSettings: any) => Promise<boolean>;
  resetSection: (section: SettingsSection) => Promise<boolean>;
  resetAllSettings: () => Promise<boolean>;

  // Sauvegarde et restauration
  createBackup: (reason: string) => Promise<string | null>;
  restoreBackup: (backupId: string) => Promise<boolean>;
  getBackups: () => Promise<SettingsBackup[]>;

  // Validation
  validateSettings: (section: SettingsSection, settings: any) => ValidationError[];

  // Import/Export
  exportSettings: () => Promise<string>;
  importSettings: (settingsJson: string) => Promise<boolean>;

  // Utilitaires
  isDirty: boolean;
  lastSaved: string | null;
  autoSaveEnabled: boolean;
  toggleAutoSave: () => void;
}

// ==========================================
// COMPONENT PROPS
// ==========================================

export interface ModularClientSettingsProps {
  clientId: string;
  initialSection?: SettingsSection;
  onSettingsUpdated?: (settings: ClientSettings) => void;
  onError?: (error: string) => void;

  // Configuration d'affichage
  showSections?: SettingsSection[];
  readOnlyMode?: boolean;
  compactMode?: boolean;

  // Style et thème
  className?: string;
  theme?: 'light' | 'dark';
}

export interface SettingsSectionProps {
  section: SettingsSection;
  settings: ClientSettings;
  onUpdate: (newSettings: any) => Promise<boolean>;
  isLoading?: boolean;
  readOnly?: boolean;
}

// ==========================================
// CONFIGURATION ET UTILITAIRES
// ==========================================

export interface ClientSettingsModuleConfig {
  name: string;
  version: string;
  features: string[];
  supportedLocales: string[];
  defaultSettings: Partial<ClientSettings>;
  validationRules: ValidationRule[];
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'email' | 'url' | 'phone' | 'custom';
  message: string;
  validator?: (value: any) => boolean;
}

// Types simplifiés pour référence
export interface RolePermission {
  role: UserRole;
  permissions: string[];
}

export interface InvitationSettings {
  requireApproval: boolean;
  allowSelfRegistration: boolean;
  defaultRole: UserRole;
  invitationExpiryDays: number;
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: string;
  required: boolean;
  order: number;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  managerId?: string;
  parentId?: string;
  color?: string;
}

export interface ApprovalWorkflow {
  id: string;
  name: string;
  triggerConditions: string[];
  approvers: string[];
  requiredApprovals: number;
}

export interface Integration {
  id: string;
  name: string;
  type: string;
  description: string;
  logoUrl: string;
  category: string;
  isAvailable: boolean;
}

export interface ActiveIntegration {
  id: string;
  integrationId: string;
  config: Record<string, any>;
  status: 'active' | 'inactive' | 'error';
  lastSync?: string;
}

export interface APIKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  lastUsed?: string;
  expiresAt?: string;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
}

export interface CalendarIntegration {
  id: string;
  provider: 'google' | 'outlook' | 'caldav';
  accountEmail: string;
  syncEnabled: boolean;
  defaultCalendar: string;
}

export interface CommunicationIntegration {
  id: string;
  type: 'slack' | 'teams' | 'discord' | 'webhook';
  config: Record<string, any>;
}

export interface ProjectToolIntegration {
  id: string;
  tool: 'jira' | 'asana' | 'trello' | 'monday' | 'notion';
  config: Record<string, any>;
  syncSettings: {
    projects: boolean;
    tasks: boolean;
    members: boolean;
  };
}

export interface CloudStorageIntegration {
  id: string;
  provider: 'google_drive' | 'dropbox' | 'onedrive' | 's3';
  config: Record<string, any>;
  autoSync: boolean;
  defaultFolder: string;
}

export interface AccountingIntegration {
  id: string;
  software: 'quickbooks' | 'xero' | 'sage' | 'custom';
  config: Record<string, any>;
  syncInvoices: boolean;
  syncPayments: boolean;
}

export interface BrandingSettings {
  enabled: boolean;
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  faviconUrl?: string;
  customCSS?: string;
}

export interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  enabled: boolean;
  config: Record<string, any>;
}

export interface WidgetPosition {
  widgetId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TableSettings {
  defaultPageSize: number;
  showRowNumbers: boolean;
  allowColumnResize: boolean;
  stickyHeaders: boolean;
  zebraStripes: boolean;
}

export interface ChartSettings {
  defaultType: 'line' | 'bar' | 'pie' | 'area';
  colorPalette: string[];
  showLegend: boolean;
  showGridLines: boolean;
  animations: boolean;
}

// Types utilitaires
export type KeysOf<T> = keyof T;
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;