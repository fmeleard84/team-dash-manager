/**
 * Module PARAMÈTRES CLIENT - Index Principal
 *
 * Point d'entrée unique pour le module paramètres client.
 * Centralise tous les exports : composants, hooks, services, types et constantes.
 *
 * Architecture modulaire complète pour la gestion des paramètres client
 * avec validation temps réel, auto-sauvegarde, import/export et système
 * de sauvegardes/restauration.
 *
 * @version 1.0.0
 * @author Team Dash Manager
 * @created 2025-09-27
 */

// Export des composants principaux
export {
  ModularClientSettingsView,
  ClientSettingsManager,
  ClientParametersView,
  ClientConfigurationPanel,
  ClientPreferencesInterface,
  ClientSettingsInterface
} from './components';

// Export des hooks
export { useClientSettings } from './hooks';

// Export des services
export { ClientSettingsAPI } from './services';

// Export de tous les types
export type {
  // Interfaces principales
  ClientSettings,
  ClientSettingsResponse,
  UseClientSettingsReturn,
  SettingsSection,

  // Sections de paramètres
  GeneralSettings,
  UserPreferences,
  SecuritySettings,
  NotificationSettings,
  BillingSettings,
  TeamSettings,
  IntegrationsSettings,
  InterfaceSettings,

  // Opérations
  UpdateSettingsRequest,
  UpdateSettingsResponse,
  SettingsBackup,

  // Validation
  ValidationError,
  ValidationSeverity,
  FieldValidationRule,
  SectionValidationRules,

  // Configuration
  AutoSaveConfig,
  ImportExportOptions,
  BackupOptions,

  // Intégrations
  SlackIntegration,
  TeamsIntegration,
  DiscordIntegration,
  WebhookIntegration,

  // Notifications
  EmailNotificationSettings,
  PushNotificationSettings,
  NotificationFrequency,
  NotificationChannels
} from './types';

/**
 * CONSTANTES MODULE PARAMÈTRES CLIENT
 *
 * Configuration centralisée du module avec tous les paramètres
 * par défaut, règles de validation et options de configuration.
 */
export const CLIENT_SETTINGS_CONSTANTS = {
  // Informations du module
  MODULE_INFO: {
    name: 'PARAMÈTRES CLIENT',
    version: '1.0.0',
    description: 'Gestion complète des paramètres et préférences client',
    author: 'Team Dash Manager',
    created: '2025-09-27'
  },

  // Sections disponibles
  SECTIONS: {
    GENERAL: 'general' as const,
    PREFERENCES: 'preferences' as const,
    SECURITY: 'security' as const,
    NOTIFICATIONS: 'notifications' as const,
    BILLING: 'billing' as const,
    TEAM: 'team' as const,
    INTEGRATIONS: 'integrations' as const,
    INTERFACE: 'interface' as const
  },

  // Configuration par défaut
  DEFAULT_SETTINGS: {
    // Paramètres généraux
    general: {
      companyName: '',
      industry: '',
      description: '',
      isPublicProfile: false,
      website: '',
      phone: '',
      address: {
        street: '',
        city: '',
        zipCode: '',
        country: 'FR'
      }
    },

    // Préférences utilisateur
    preferences: {
      language: 'fr' as const,
      timezone: 'Europe/Paris',
      dateFormat: 'dd/MM/yyyy' as const,
      timeFormat: '24h' as const,
      darkMode: false,
      compactMode: false,
      showTutorials: true,
      autoSaveInterval: 5
    },

    // Sécurité
    security: {
      twoFactorEnabled: false,
      loginAlerts: true,
      suspiciousActivityAlerts: true,
      sessionTimeout: 60,
      passwordStrength: 'medium' as const,
      allowedIPs: [],
      trustedDevices: []
    },

    // Notifications
    notifications: {
      email: {
        projectUpdates: true,
        teamMessages: true,
        billingAlerts: true,
        securityAlerts: true,
        marketingEmails: false,
        systemUpdates: true
      },
      push: {
        enabled: true,
        projectUpdates: true,
        teamMessages: true,
        urgentOnly: false
      },
      frequency: 'immediate' as const,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      }
    },

    // Facturation
    billing: {
      billingEmail: '',
      vatNumber: '',
      autoPayment: false,
      invoiceAlerts: true,
      paymentMethod: 'card' as const,
      billingCycle: 'monthly' as const,
      currency: 'EUR' as const
    },

    // Équipe
    team: {
      maxMembers: 10,
      inviteEnabled: true,
      requireApproval: false,
      defaultRole: 'member' as const,
      allowGuestAccess: false,
      sessionSharing: true
    },

    // Intégrations
    integrations: {
      slack: {
        enabled: false,
        webhookUrl: '',
        channel: '#general',
        notifications: []
      },
      teams: {
        enabled: false,
        webhookUrl: '',
        channel: 'General',
        notifications: []
      },
      discord: {
        enabled: false,
        webhookUrl: '',
        channel: 'general',
        notifications: []
      },
      webhook: {
        enabled: false,
        url: '',
        secret: '',
        events: []
      }
    },

    // Interface
    interface: {
      theme: 'system' as const,
      layout: 'comfortable' as const,
      sidebar: 'expanded' as const,
      animations: true,
      soundEffects: false,
      reducedMotion: false,
      highContrast: false,
      fontSize: 'medium' as const
    }
  },

  // Auto-sauvegarde
  AUTO_SAVE: {
    ENABLED: true,
    DELAY_MS: 2000,
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 1000
  },

  // Validation
  VALIDATION: {
    COMPANY_NAME: {
      MIN_LENGTH: 2,
      MAX_LENGTH: 100,
      REQUIRED: true
    },
    EMAIL: {
      PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      REQUIRED: true
    },
    PHONE: {
      PATTERN: /^[\+]?[0-9\s\-\(\)]{8,20}$/,
      REQUIRED: false
    },
    VAT_NUMBER: {
      PATTERN: /^[A-Z]{2}[0-9A-Z]{8,12}$/,
      REQUIRED: false
    },
    SESSION_TIMEOUT: {
      MIN: 5,
      MAX: 480,
      DEFAULT: 60
    },
    MAX_MEMBERS: {
      MIN: 1,
      MAX: 1000,
      DEFAULT: 10
    }
  },

  // Messages d'erreur
  ERROR_MESSAGES: {
    LOAD_FAILED: 'Impossible de charger les paramètres',
    SAVE_FAILED: 'Erreur lors de la sauvegarde',
    VALIDATION_FAILED: 'Données invalides',
    IMPORT_FAILED: 'Erreur lors de l\'import',
    EXPORT_FAILED: 'Erreur lors de l\'export',
    BACKUP_FAILED: 'Erreur lors de la sauvegarde',
    RESTORE_FAILED: 'Erreur lors de la restauration',
    NETWORK_ERROR: 'Erreur de connexion',
    PERMISSION_DENIED: 'Autorisation refusée',
    INVALID_FORMAT: 'Format invalide'
  },

  // Messages de succès
  SUCCESS_MESSAGES: {
    SETTINGS_SAVED: 'Paramètres sauvegardés avec succès',
    SETTINGS_IMPORTED: 'Paramètres importés avec succès',
    SETTINGS_EXPORTED: 'Paramètres exportés avec succès',
    BACKUP_CREATED: 'Sauvegarde créée avec succès',
    BACKUP_RESTORED: 'Sauvegarde restaurée avec succès',
    SECTION_RESET: 'Section remise à zéro avec succès',
    ALL_RESET: 'Tous les paramètres ont été remis à zéro'
  },

  // Intégrations supportées
  INTEGRATIONS: {
    SLACK: {
      name: 'Slack',
      type: 'webhook',
      icon: 'slack',
      fields: ['webhookUrl', 'channel']
    },
    TEAMS: {
      name: 'Microsoft Teams',
      type: 'webhook',
      icon: 'teams',
      fields: ['webhookUrl', 'channel']
    },
    DISCORD: {
      name: 'Discord',
      type: 'webhook',
      icon: 'discord',
      fields: ['webhookUrl', 'channel']
    },
    WEBHOOK: {
      name: 'Webhook personnalisé',
      type: 'webhook',
      icon: 'webhook',
      fields: ['url', 'secret']
    }
  },

  // Thèmes disponibles
  THEMES: {
    LIGHT: 'light',
    DARK: 'dark',
    SYSTEM: 'system'
  },

  // Langues supportées
  LANGUAGES: {
    FR: 'fr',
    EN: 'en',
    ES: 'es'
  },

  // Fuseaux horaires
  TIMEZONES: [
    'Europe/Paris',
    'America/New_York',
    'America/Los_Angeles',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney',
    'UTC'
  ],

  // Rôles d'équipe
  TEAM_ROLES: {
    ADMIN: 'admin',
    MEMBER: 'member',
    VIEWER: 'viewer'
  },

  // Devises supportées
  CURRENCIES: {
    EUR: 'EUR',
    USD: 'USD',
    GBP: 'GBP',
    JPY: 'JPY'
  },

  // API Endpoints
  API_ENDPOINTS: {
    GET_SETTINGS: '/api/client-settings',
    UPDATE_SETTINGS: '/api/client-settings/update',
    RESET_SECTION: '/api/client-settings/reset-section',
    RESET_ALL: '/api/client-settings/reset-all',
    CREATE_BACKUP: '/api/client-settings/backup',
    RESTORE_BACKUP: '/api/client-settings/restore',
    GET_BACKUPS: '/api/client-settings/backups',
    EXPORT_SETTINGS: '/api/client-settings/export',
    IMPORT_SETTINGS: '/api/client-settings/import',
    VALIDATE_SECTION: '/api/client-settings/validate'
  },

  // Permissions
  PERMISSIONS: {
    READ: 'settings:read',
    WRITE: 'settings:write',
    DELETE: 'settings:delete',
    BACKUP: 'settings:backup',
    RESTORE: 'settings:restore',
    IMPORT: 'settings:import',
    EXPORT: 'settings:export'
  }
} as const;

/**
 * Utilitaires pour les paramètres par défaut
 */
export const getDefaultClientSettings = () => ({
  id: '',
  clientId: '',
  ...CLIENT_SETTINGS_CONSTANTS.DEFAULT_SETTINGS,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

/**
 * Utilitaires de validation
 */
export const validateSettingsField = (
  field: string,
  value: any,
  rules = CLIENT_SETTINGS_CONSTANTS.VALIDATION
) => {
  const errors: string[] = [];

  // Validation email
  if (field.includes('email') || field.includes('Email')) {
    if (value && !rules.EMAIL.PATTERN.test(value)) {
      errors.push('Format email invalide');
    }
    if (rules.EMAIL.REQUIRED && !value) {
      errors.push('Email requis');
    }
  }

  // Validation téléphone
  if (field.includes('phone') || field.includes('Phone')) {
    if (value && !rules.PHONE.PATTERN.test(value)) {
      errors.push('Format téléphone invalide');
    }
  }

  // Validation nom entreprise
  if (field === 'companyName') {
    if (rules.COMPANY_NAME.REQUIRED && !value) {
      errors.push('Nom d\'entreprise requis');
    }
    if (value && (value.length < rules.COMPANY_NAME.MIN_LENGTH || value.length > rules.COMPANY_NAME.MAX_LENGTH)) {
      errors.push(`Nom doit contenir entre ${rules.COMPANY_NAME.MIN_LENGTH} et ${rules.COMPANY_NAME.MAX_LENGTH} caractères`);
    }
  }

  return errors;
};

/**
 * Calcul du score de configuration
 */
export const calculateSettingsCompletionScore = (settings: any) => {
  if (!settings) return 0;

  let totalFields = 0;
  let filledFields = 0;

  const checkFields = (obj: any, depth = 0) => {
    if (depth > 3) return; // Éviter la récursion infinie

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        checkFields(value, depth + 1);
      } else {
        totalFields++;
        if (value !== '' && value !== null && value !== undefined &&
            (Array.isArray(value) ? value.length > 0 : true)) {
          filledFields++;
        }
      }
    }
  };

  checkFields(settings);
  return totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
};

// Export par défaut du module
export default {
  ModularClientSettingsView,
  useClientSettings,
  ClientSettingsAPI,
  CLIENT_SETTINGS_CONSTANTS,
  getDefaultClientSettings,
  validateSettingsField,
  calculateSettingsCompletionScore
};