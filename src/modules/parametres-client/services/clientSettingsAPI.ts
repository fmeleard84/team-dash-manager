/**
 * Service Principal - Module PARAMÈTRES CLIENT
 *
 * Gère toutes les interactions avec les paramètres et configurations client.
 * Fournit une API complète pour la gestion des préférences utilisateur.
 *
 * Fonctionnalités :
 * - CRUD complet des paramètres client
 * - Validation avancée des configurations
 * - Sauvegarde et restauration automatique
 * - Import/export des paramètres
 * - Gestion des versions et audit trail
 * - Intégration avec les services externes
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  ClientSettings,
  ClientSettingsResponse,
  UpdateSettingsRequest,
  UpdateSettingsResponse,
  SettingsBackup,
  ValidationError,
  SettingsSection,
  GeneralSettings,
  UserPreferences,
  SecuritySettings,
  NotificationSettings,
  BillingSettings,
  TeamSettings,
  IntegrationsSettings,
  InterfaceSettings
} from '../types';

/**
 * Service API pour la gestion des paramètres client
 */
export class ClientSettingsAPI {
  private static readonly TABLE_SETTINGS = 'client_settings';
  private static readonly TABLE_BACKUPS = 'client_settings_backups';
  private static readonly TABLE_AUDIT = 'client_settings_audit';

  // ==========================================
  // LECTURE DES PARAMÈTRES
  // ==========================================

  /**
   * Récupère tous les paramètres d'un client
   */
  static async getClientSettings(clientId: string): Promise<ClientSettingsResponse<ClientSettings>> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_SETTINGS)
        .select('*')
        .eq('clientId', clientId)
        .single();

      if (error && error.code !== 'PGRST116') { // Pas d'erreur si pas de résultat
        throw error;
      }

      // Si aucun paramètre n'existe, créer les paramètres par défaut
      if (!data) {
        const defaultSettings = this.getDefaultSettings(clientId);
        const createResponse = await this.createDefaultSettings(defaultSettings);

        if (!createResponse.success) {
          return createResponse;
        }

        return {
          success: true,
          data: createResponse.data,
          message: 'Paramètres par défaut créés'
        };
      }

      return {
        success: true,
        data,
        metadata: {
          version: data.version,
          lastModified: data.updatedAt
        }
      };

    } catch (error) {
      console.error('[ClientSettingsAPI] Erreur getClientSettings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Récupère une section spécifique des paramètres
   */
  static async getSettingsSection(
    clientId: string,
    section: SettingsSection
  ): Promise<ClientSettingsResponse<any>> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_SETTINGS)
        .select(section)
        .eq('clientId', clientId)
        .single();

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: data[section]
      };

    } catch (error) {
      console.error('[ClientSettingsAPI] Erreur getSettingsSection:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  // ==========================================
  // MISE À JOUR DES PARAMÈTRES
  // ==========================================

  /**
   * Met à jour les paramètres client
   */
  static async updateSettings(
    request: UpdateSettingsRequest & { clientId: string }
  ): Promise<ClientSettingsResponse<UpdateSettingsResponse>> {
    try {
      const { clientId, section, settings, reason } = request;

      // 1. Validation des paramètres
      const validationErrors = this.validateSettingsSection(section, settings[section]);
      if (validationErrors.length > 0) {
        return {
          success: false,
          error: 'Erreurs de validation',
          data: { validationErrors } as any
        };
      }

      // 2. Créer une sauvegarde avant modification
      const backupId = await this.createBackupInternal(clientId, reason || 'Mise à jour manuelle');

      // 3. Récupérer les paramètres actuels
      const currentResponse = await this.getClientSettings(clientId);
      if (!currentResponse.success || !currentResponse.data) {
        return {
          success: false,
          error: 'Impossible de récupérer les paramètres actuels'
        };
      }

      const currentSettings = currentResponse.data;

      // 4. Fusionner les nouveaux paramètres
      const updatedSettings = {
        ...currentSettings,
        [section]: {
          ...currentSettings[section],
          ...settings[section]
        },
        updatedAt: new Date().toISOString(),
        version: currentSettings.version + 1
      };

      // 5. Sauvegarder les paramètres mis à jour
      const { data, error } = await supabase
        .from(this.TABLE_SETTINGS)
        .update(updatedSettings)
        .eq('clientId', clientId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // 6. Journaliser la modification
      await this.logSettingsChange(clientId, section, settings[section], reason);

      // 7. Déterminer les champs modifiés
      const changedFields = this.getChangedFields(currentSettings[section], settings[section]);

      const response: UpdateSettingsResponse = {
        settings: data,
        changedFields,
        backupCreated: !!backupId
      };

      return {
        success: true,
        data: response,
        message: 'Paramètres mis à jour avec succès',
        metadata: {
          version: data.version,
          lastModified: data.updatedAt
        }
      };

    } catch (error) {
      console.error('[ClientSettingsAPI] Erreur updateSettings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Remet à zéro une section de paramètres
   */
  static async resetSection(
    clientId: string,
    section: SettingsSection
  ): Promise<ClientSettingsResponse<ClientSettings>> {
    try {
      // Créer une sauvegarde
      await this.createBackupInternal(clientId, `Reset section ${section}`);

      // Récupérer les paramètres par défaut pour cette section
      const defaultSettings = this.getDefaultSettings(clientId);
      const defaultSectionSettings = defaultSettings[section];

      // Mettre à jour la section
      const updateRequest: UpdateSettingsRequest & { clientId: string } = {
        clientId,
        section,
        settings: {
          [section]: defaultSectionSettings
        } as any,
        reason: `Reset section ${section}`
      };

      const response = await this.updateSettings(updateRequest);

      if (!response.success) {
        return response as ClientSettingsResponse<ClientSettings>;
      }

      return {
        success: true,
        data: response.data!.settings,
        message: `Section ${section} remise à zéro`
      };

    } catch (error) {
      console.error('[ClientSettingsAPI] Erreur resetSection:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Remet à zéro tous les paramètres
   */
  static async resetAllSettings(clientId: string): Promise<ClientSettingsResponse<ClientSettings>> {
    try {
      // Créer une sauvegarde complète
      await this.createBackupInternal(clientId, 'Reset complet des paramètres');

      // Supprimer les paramètres existants
      await supabase
        .from(this.TABLE_SETTINGS)
        .delete()
        .eq('clientId', clientId);

      // Créer de nouveaux paramètres par défaut
      const defaultSettings = this.getDefaultSettings(clientId);
      const response = await this.createDefaultSettings(defaultSettings);

      if (!response.success) {
        return response;
      }

      return {
        success: true,
        data: response.data!,
        message: 'Tous les paramètres ont été remis à zéro'
      };

    } catch (error) {
      console.error('[ClientSettingsAPI] Erreur resetAllSettings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  // ==========================================
  // SAUVEGARDE ET RESTAURATION
  // ==========================================

  /**
   * Crée une sauvegarde des paramètres
   */
  static async createBackup(
    clientId: string,
    reason: string
  ): Promise<ClientSettingsResponse<string>> {
    try {
      const backupId = await this.createBackupInternal(clientId, reason);

      if (!backupId) {
        return {
          success: false,
          error: 'Erreur lors de la création de la sauvegarde'
        };
      }

      return {
        success: true,
        data: backupId,
        message: 'Sauvegarde créée avec succès'
      };

    } catch (error) {
      console.error('[ClientSettingsAPI] Erreur createBackup:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Récupère la liste des sauvegardes
   */
  static async getBackups(clientId: string): Promise<ClientSettingsResponse<SettingsBackup[]>> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_BACKUPS)
        .select('*')
        .eq('clientId', clientId)
        .order('createdAt', { ascending: false })
        .limit(50);

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: data || []
      };

    } catch (error) {
      console.error('[ClientSettingsAPI] Erreur getBackups:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Restaure des paramètres depuis une sauvegarde
   */
  static async restoreBackup(
    clientId: string,
    backupId: string
  ): Promise<ClientSettingsResponse<ClientSettings>> {
    try {
      // 1. Récupérer la sauvegarde
      const { data: backup, error: backupError } = await supabase
        .from(this.TABLE_BACKUPS)
        .select('*')
        .eq('id', backupId)
        .eq('clientId', clientId)
        .single();

      if (backupError || !backup) {
        return {
          success: false,
          error: 'Sauvegarde non trouvée'
        };
      }

      // 2. Créer une sauvegarde de l'état actuel
      await this.createBackupInternal(clientId, `Avant restauration de ${backupId}`);

      // 3. Restaurer les paramètres
      const restoredSettings = {
        ...backup.settings,
        updatedAt: new Date().toISOString(),
        version: backup.settings.version + 1
      };

      const { data, error } = await supabase
        .from(this.TABLE_SETTINGS)
        .upsert(restoredSettings, { onConflict: 'clientId' })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // 4. Journaliser la restauration
      await this.logSettingsChange(
        clientId,
        'all' as SettingsSection,
        restoredSettings,
        `Restauration depuis sauvegarde ${backupId}`
      );

      return {
        success: true,
        data,
        message: 'Paramètres restaurés avec succès'
      };

    } catch (error) {
      console.error('[ClientSettingsAPI] Erreur restoreBackup:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  // ==========================================
  // IMPORT/EXPORT
  // ==========================================

  /**
   * Exporte les paramètres au format JSON
   */
  static async exportSettings(clientId: string): Promise<ClientSettingsResponse<string>> {
    try {
      const response = await this.getClientSettings(clientId);

      if (!response.success || !response.data) {
        return response as ClientSettingsResponse<string>;
      }

      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        clientId,
        settings: response.data
      };

      const jsonString = JSON.stringify(exportData, null, 2);

      return {
        success: true,
        data: jsonString,
        message: 'Paramètres exportés avec succès'
      };

    } catch (error) {
      console.error('[ClientSettingsAPI] Erreur exportSettings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Importe des paramètres depuis JSON
   */
  static async importSettings(
    clientId: string,
    settingsJson: string
  ): Promise<ClientSettingsResponse<ClientSettings>> {
    try {
      // 1. Parser le JSON
      let importData: any;
      try {
        importData = JSON.parse(settingsJson);
      } catch {
        return {
          success: false,
          error: 'Format JSON invalide'
        };
      }

      // 2. Valider la structure
      if (!importData.settings || !importData.version) {
        return {
          success: false,
          error: 'Structure d\'import invalide'
        };
      }

      // 3. Créer une sauvegarde
      await this.createBackupInternal(clientId, 'Avant import de paramètres');

      // 4. Valider les paramètres importés
      const validationErrors = this.validateAllSettings(importData.settings);
      if (validationErrors.length > 0) {
        return {
          success: false,
          error: 'Erreurs de validation dans les paramètres importés',
          data: { validationErrors } as any
        };
      }

      // 5. Importer les paramètres
      const importedSettings = {
        ...importData.settings,
        clientId,
        id: importData.settings.id || clientId,
        updatedAt: new Date().toISOString(),
        version: (importData.settings.version || 0) + 1
      };

      const { data, error } = await supabase
        .from(this.TABLE_SETTINGS)
        .upsert(importedSettings, { onConflict: 'clientId' })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // 6. Journaliser l'import
      await this.logSettingsChange(
        clientId,
        'all' as SettingsSection,
        importedSettings,
        'Import de paramètres'
      );

      return {
        success: true,
        data,
        message: 'Paramètres importés avec succès'
      };

    } catch (error) {
      console.error('[ClientSettingsAPI] Erreur importSettings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  // ==========================================
  // MÉTHODES PRIVÉES - HELPERS
  // ==========================================

  /**
   * Crée les paramètres par défaut pour un client
   */
  private static async createDefaultSettings(
    settings: ClientSettings
  ): Promise<ClientSettingsResponse<ClientSettings>> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_SETTINGS)
        .insert(settings)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return {
        success: true,
        data
      };

    } catch (error) {
      console.error('[ClientSettingsAPI] Erreur createDefaultSettings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur création paramètres par défaut'
      };
    }
  }

  /**
   * Génère les paramètres par défaut pour un client
   */
  private static getDefaultSettings(clientId: string): ClientSettings {
    return {
      id: clientId,
      clientId,
      general: {
        companyName: '',
        industry: '',
        companySize: 'small',
        primaryContact: {
          firstName: '',
          lastName: '',
          email: '',
          phone: ''
        },
        address: {
          street: '',
          city: '',
          postalCode: '',
          country: 'FR'
        },
        timezone: 'Europe/Paris',
        locale: 'fr',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        currency: 'EUR',
        country: 'France',
        businessHours: this.getDefaultBusinessHours(),
        fiscalYearStart: '01-01'
      },
      preferences: {
        theme: 'auto',
        language: 'fr',
        density: 'comfortable',
        defaultDashboard: 'overview',
        sidebarCollapsed: false,
        showTooltips: true,
        defaultPageSize: 20,
        sortPreferences: [],
        columnPreferences: [],
        emailDigest: 'weekly',
        desktopNotifications: true,
        soundEnabled: false,
        keyboardShortcuts: true,
        customShortcuts: [],
        highContrast: false,
        largeText: false,
        reduceMotion: false,
        screenReader: false
      },
      security: {
        twoFactorEnabled: false,
        twoFactorMethod: 'email',
        backupCodes: [],
        sessionTimeout: 480, // 8 heures
        multipleSessionsAllowed: true,
        logoutOnInactive: true,
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: false,
          preventReuse: 5,
          preventCommonPasswords: true
        },
        passwordExpiration: 0,
        ipWhitelist: [],
        allowedDomains: [],
        restrictTimeAccess: false,
        allowedTimeRanges: [],
        auditLogRetention: 90,
        logFailedAttempts: true,
        alertOnSuspiciousActivity: true,
        dataRetention: {
          projectData: 365,
          candidateData: 365,
          financialData: 2190, // 6 ans
          logData: 90,
          autoDeleteEnabled: false
        },
        shareAnalytics: false,
        allowCookies: {
          essential: true,
          analytics: false,
          marketing: false,
          personalization: false
        }
      },
      notifications: {
        channels: [],
        projectUpdates: { enabled: true, channels: ['email'], frequency: 'daily', quietHours: true },
        teamActivity: { enabled: true, channels: ['email'], frequency: 'weekly', quietHours: true },
        systemAlerts: { enabled: true, channels: ['email'], frequency: 'instant', quietHours: false },
        invoicingBilling: { enabled: true, channels: ['email'], frequency: 'instant', quietHours: false },
        newCandidates: { enabled: true, channels: ['email'], frequency: 'daily', quietHours: true },
        deadlines: { enabled: true, channels: ['email'], frequency: 'daily', quietHours: true },
        quietHours: {
          enabled: true,
          startTime: '22:00',
          endTime: '08:00',
          timezone: 'Europe/Paris',
          days: [0, 1, 2, 3, 4, 5, 6]
        },
        batchNotifications: true,
        smartNotifications: false,
        slackIntegration: { enabled: false, customFormat: false, mentionUsers: false },
        teamsIntegration: { enabled: false, customFormat: false },
        webhooks: []
      },
      billing: {
        currentPlan: {
          id: 'basic',
          name: 'Basic',
          tier: 'basic',
          features: [],
          limits: {
            maxProjects: 5,
            maxTeamMembers: 3,
            maxCandidates: 100,
            storageGB: 1,
            apiCallsPerMonth: 1000
          },
          pricing: { monthly: 0, yearly: 0, currency: 'EUR' }
        },
        billingCycle: 'monthly',
        autoRenewal: true,
        billingContact: {
          firstName: '',
          lastName: '',
          email: ''
        },
        billingAddress: {
          street: '',
          city: '',
          postalCode: '',
          country: 'FR'
        },
        paymentMethods: [],
        defaultPaymentMethod: '',
        invoiceSettings: {
          invoicePrefix: 'INV',
          invoiceNumbering: 'yearly_reset',
          paymentTerms: 30,
          lateFeePercent: 0,
          includeTax: true,
          customFields: []
        },
        taxSettings: {
          taxRates: [],
          applyTaxByLocation: true,
          includeTaxInPrices: true
        },
        usageLimits: {
          projects: 5,
          teamMembers: 3,
          candidates: 100,
          storage: 1,
          apiCalls: 1000
        },
        overage: {
          enabled: false,
          rates: {
            extraProjects: 5,
            extraTeamMembers: 10,
            extraStorage: 2,
            extraApiCalls: 0.01
          },
          limits: {}
        },
        billingHistory: [],
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      team: {
        maxTeamMembers: 3,
        defaultUserRole: 'member',
        rolePermissions: [],
        projectVisibility: 'team',
        allowExternalCollaborators: false,
        externalDomainWhitelist: [],
        invitationSettings: {
          requireApproval: false,
          allowSelfRegistration: false,
          defaultRole: 'member',
          invitationExpiryDays: 7
        },
        onboardingEnabled: true,
        customOnboardingFlow: [],
        departments: [],
        hierarchyEnabled: false,
        approvalWorkflows: []
      },
      integrations: {
        availableIntegrations: [],
        activeIntegrations: [],
        apiKeys: [],
        webhookEndpoints: [],
        calendarIntegrations: [],
        communicationTools: [],
        projectManagementTools: [],
        cloudStorageIntegrations: [],
        accountingIntegrations: []
      },
      interface: {
        layout: 'sidebar',
        compactMode: false,
        fluidLayout: true,
        customBranding: {
          enabled: false,
          primaryColor: '#8b5cf6',
          secondaryColor: '#ec4899',
          logoUrl: '',
          faviconUrl: '',
          customCSS: ''
        },
        accentColor: '#8b5cf6',
        enabledWidgets: [],
        widgetPositions: [],
        tableSettings: {
          defaultPageSize: 20,
          showRowNumbers: false,
          allowColumnResize: true,
          stickyHeaders: true,
          zebraStripes: true
        },
        chartSettings: {
          defaultType: 'line',
          colorPalette: ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981'],
          showLegend: true,
          showGridLines: true,
          animations: true
        },
        animationsEnabled: true,
        transitionSpeed: 'normal'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    };
  }

  /**
   * Génère les heures d'ouverture par défaut
   */
  private static getDefaultBusinessHours(): any {
    const workingDay = {
      isWorkingDay: true,
      startTime: '09:00',
      endTime: '17:00',
      breaks: [{ startTime: '12:00', endTime: '13:00', label: 'Déjeuner' }]
    };

    const weekend = {
      isWorkingDay: false
    };

    return {
      monday: workingDay,
      tuesday: workingDay,
      wednesday: workingDay,
      thursday: workingDay,
      friday: workingDay,
      saturday: weekend,
      sunday: weekend,
      timezone: 'Europe/Paris'
    };
  }

  /**
   * Crée une sauvegarde interne
   */
  private static async createBackupInternal(clientId: string, reason: string): Promise<string | null> {
    try {
      const { data: currentSettings } = await supabase
        .from(this.TABLE_SETTINGS)
        .select('*')
        .eq('clientId', clientId)
        .single();

      if (!currentSettings) {
        return null;
      }

      const backup: Omit<SettingsBackup, 'id'> = {
        clientId,
        createdAt: new Date().toISOString(),
        version: currentSettings.version,
        settings: currentSettings,
        reason,
        createdBy: (await supabase.auth.getUser()).data.user?.id || 'system'
      };

      const { data, error } = await supabase
        .from(this.TABLE_BACKUPS)
        .insert(backup)
        .select('id')
        .single();

      if (error) {
        console.error('[ClientSettingsAPI] Erreur createBackupInternal:', error);
        return null;
      }

      return data.id;

    } catch (error) {
      console.error('[ClientSettingsAPI] Erreur createBackupInternal:', error);
      return null;
    }
  }

  /**
   * Journalise un changement de paramètres
   */
  private static async logSettingsChange(
    clientId: string,
    section: SettingsSection,
    changes: any,
    reason?: string
  ): Promise<void> {
    try {
      const logEntry = {
        clientId,
        section,
        changes,
        reason,
        userId: (await supabase.auth.getUser()).data.user?.id,
        timestamp: new Date().toISOString()
      };

      await supabase.from(this.TABLE_AUDIT).insert(logEntry);
    } catch (error) {
      console.error('[ClientSettingsAPI] Erreur logSettingsChange:', error);
      // Ne pas faire échouer l'opération principale
    }
  }

  /**
   * Détermine les champs qui ont changé
   */
  private static getChangedFields(oldSettings: any, newSettings: any): string[] {
    const changes: string[] = [];

    const compareObjects = (oldObj: any, newObj: any, prefix = '') => {
      for (const key in newObj) {
        const fieldPath = prefix ? `${prefix}.${key}` : key;

        if (oldObj[key] !== newObj[key]) {
          if (typeof newObj[key] === 'object' && newObj[key] !== null) {
            compareObjects(oldObj[key] || {}, newObj[key], fieldPath);
          } else {
            changes.push(fieldPath);
          }
        }
      }
    };

    compareObjects(oldSettings, newSettings);
    return changes;
  }

  /**
   * Valide une section de paramètres
   */
  private static validateSettingsSection(section: SettingsSection, settings: any): ValidationError[] {
    const errors: ValidationError[] = [];

    try {
      switch (section) {
        case 'general':
          this.validateGeneralSettings(settings, errors);
          break;
        case 'preferences':
          this.validatePreferencesSettings(settings, errors);
          break;
        case 'security':
          this.validateSecuritySettings(settings, errors);
          break;
        case 'notifications':
          this.validateNotificationSettings(settings, errors);
          break;
        case 'billing':
          this.validateBillingSettings(settings, errors);
          break;
        case 'team':
          this.validateTeamSettings(settings, errors);
          break;
        case 'integrations':
          this.validateIntegrationsSettings(settings, errors);
          break;
        case 'interface':
          this.validateInterfaceSettings(settings, errors);
          break;
      }
    } catch (error) {
      errors.push({
        field: section,
        message: 'Erreur de validation générale',
        code: 'VALIDATION_ERROR',
        severity: 'error'
      });
    }

    return errors;
  }

  /**
   * Valide tous les paramètres
   */
  private static validateAllSettings(settings: ClientSettings): ValidationError[] {
    const errors: ValidationError[] = [];

    errors.push(...this.validateGeneralSettings(settings.general, []));
    errors.push(...this.validatePreferencesSettings(settings.preferences, []));
    errors.push(...this.validateSecuritySettings(settings.security, []));
    errors.push(...this.validateNotificationSettings(settings.notifications, []));
    errors.push(...this.validateBillingSettings(settings.billing, []));
    errors.push(...this.validateTeamSettings(settings.team, []));
    errors.push(...this.validateIntegrationsSettings(settings.integrations, []));
    errors.push(...this.validateInterfaceSettings(settings.interface, []));

    return errors;
  }

  // Méthodes de validation spécifiques (simplifiées pour l'exemple)
  private static validateGeneralSettings(settings: GeneralSettings, errors: ValidationError[]): ValidationError[] {
    if (!settings.companyName?.trim()) {
      errors.push({
        field: 'general.companyName',
        message: 'Le nom de l\'entreprise est requis',
        code: 'REQUIRED_FIELD',
        severity: 'error'
      });
    }

    if (settings.primaryContact?.email && !this.isValidEmail(settings.primaryContact.email)) {
      errors.push({
        field: 'general.primaryContact.email',
        message: 'Format d\'email invalide',
        code: 'INVALID_EMAIL',
        severity: 'error'
      });
    }

    return errors;
  }

  private static validatePreferencesSettings(settings: UserPreferences, errors: ValidationError[]): ValidationError[] {
    if (settings.defaultPageSize < 5 || settings.defaultPageSize > 100) {
      errors.push({
        field: 'preferences.defaultPageSize',
        message: 'La taille de page doit être entre 5 et 100',
        code: 'OUT_OF_RANGE',
        severity: 'warning'
      });
    }

    return errors;
  }

  private static validateSecuritySettings(settings: SecuritySettings, errors: ValidationError[]): ValidationError[] {
    if (settings.sessionTimeout < 5) {
      errors.push({
        field: 'security.sessionTimeout',
        message: 'Le timeout de session ne peut pas être inférieur à 5 minutes',
        code: 'MIN_VALUE',
        severity: 'error'
      });
    }

    return errors;
  }

  private static validateNotificationSettings(settings: NotificationSettings, errors: ValidationError[]): ValidationError[] {
    // Validation des paramètres de notification
    return errors;
  }

  private static validateBillingSettings(settings: BillingSettings, errors: ValidationError[]): ValidationError[] {
    // Validation des paramètres de facturation
    return errors;
  }

  private static validateTeamSettings(settings: TeamSettings, errors: ValidationError[]): ValidationError[] {
    if (settings.maxTeamMembers < 1) {
      errors.push({
        field: 'team.maxTeamMembers',
        message: 'Le nombre maximum de membres d\'équipe doit être d\'au moins 1',
        code: 'MIN_VALUE',
        severity: 'error'
      });
    }

    return errors;
  }

  private static validateIntegrationsSettings(settings: IntegrationsSettings, errors: ValidationError[]): ValidationError[] {
    // Validation des paramètres d'intégrations
    return errors;
  }

  private static validateInterfaceSettings(settings: InterfaceSettings, errors: ValidationError[]): ValidationError[] {
    // Validation des paramètres d'interface
    return errors;
  }

  /**
   * Valide un format d'email
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}