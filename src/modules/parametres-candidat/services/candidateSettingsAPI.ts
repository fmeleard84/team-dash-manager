/**
 * Module PARAMÈTRES CANDIDAT - Service API
 *
 * Service complet pour la gestion des paramètres candidat.
 * Basé sur la logique métier existante de CandidateSettings.tsx.
 *
 * Fonctionnalités:
 * - CRUD complet des paramètres candidat
 * - Calcul automatique des tarifs avec séniorité
 * - Gestion des compétences (langues, expertises)
 * - Intégration système de qualification IA
 * - Validation et sécurité des données
 * - Synchronisation avec hr_profiles et Supabase
 *
 * @version 1.0.0
 * @created 2025-09-27
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  CandidateSettings,
  CandidateSettingsResponse,
  UpdateCandidateSettingsRequest,
  UpdateCandidateSettingsResponse,
  CandidateSettingsSection,
  PersonalSettings,
  ProfessionalSettings,
  SkillsSettings,
  QualificationSettings,
  CandidatePreferences,
  CandidateNotificationSettings,
  CandidateSecuritySettings,
  PrivacySettings,
  SeniorityLevel,
  CandidateLanguage,
  CandidateExpertise,
  LanguageLevel,
  ExpertiseLevel,
  QualificationMethod,
  QualificationResult,
  RateCalculationConfig,
  CalculatedRate,
  ValidationWarning,
  CandidateStatus
} from '../types';

/**
 * API Client pour la gestion des paramètres candidat
 */
export class CandidateSettingsAPI {
  private static readonly CACHE_TTL = 1000 * 60 * 5; // 5 minutes
  private static cache = new Map<string, { data: any; timestamp: number }>();

  /**
   * Cache simple pour optimiser les performances
   */
  private static getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private static setCached<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  // ==========================================
  // MÉTHODES PRINCIPALES
  // ==========================================

  /**
   * Récupère les paramètres complets d'un candidat
   */
  static async getCandidateSettings(candidateId: string): Promise<CandidateSettingsResponse<CandidateSettings>> {
    try {
      console.log('[CandidateSettingsAPI] Loading settings for candidate:', candidateId);

      // Vérifier le cache
      const cacheKey = `settings_${candidateId}`;
      const cached = this.getCached<CandidateSettings>(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      // Récupérer le profil candidat principal
      const { data: candidateData, error: candidateError } = await supabase
        .from('candidate_profiles')
        .select('*')
        .eq('id', candidateId)
        .single();

      if (candidateError) {
        throw new Error(`Erreur récupération candidat: ${candidateError.message}`);
      }

      if (!candidateData) {
        throw new Error('Candidat non trouvé');
      }

      // Récupérer le profil hr associé
      let profileData = null;
      if (candidateData.profile_id) {
        const { data: hrProfile, error: profileError } = await supabase
          .from('hr_profiles')
          .select(`
            id,
            name,
            base_price,
            hr_categories (
              id,
              name
            )
          `)
          .eq('id', candidateData.profile_id)
          .single();

        if (!profileError && hrProfile) {
          profileData = hrProfile;
        }
      }

      // Récupérer les langues
      const { data: languages } = await supabase
        .from('candidate_languages')
        .select(`
          id,
          hr_languages (
            id,
            name
          )
        `)
        .eq('candidate_id', candidateId);

      // Récupérer les expertises
      const { data: expertises } = await supabase
        .from('candidate_expertises')
        .select(`
          id,
          hr_expertises (
            id,
            name
          )
        `)
        .eq('candidate_id', candidateId);

      // Calculer le tarif si les données sont disponibles
      let calculatedRate = candidateData.daily_rate;
      let rateWithExpertise = candidateData.daily_rate;

      if (profileData?.base_price && candidateData.seniority) {
        calculatedRate = this.calculateDailyRate(profileData.base_price, candidateData.seniority);
        rateWithExpertise = this.calculateRateWithExpertise(
          calculatedRate,
          expertises?.length || 0,
          languages?.length || 0
        );

        // Mettre à jour le tarif si nécessaire
        if (!candidateData.daily_rate || Math.abs(candidateData.daily_rate - calculatedRate) > 1) {
          await supabase
            .from('candidate_profiles')
            .update({ daily_rate: calculatedRate })
            .eq('id', candidateId);
        }
      }

      // Construire l'objet paramètres complet
      const settings: CandidateSettings = {
        id: candidateData.id,
        candidateId: candidateId,

        personal: this.buildPersonalSettings(candidateData),
        professional: this.buildProfessionalSettings(candidateData, profileData, calculatedRate, rateWithExpertise),
        skills: this.buildSkillsSettings(languages, expertises),
        qualification: this.buildQualificationSettings(candidateData),
        preferences: this.buildDefaultPreferences(),
        notifications: this.buildDefaultNotificationSettings(),
        security: this.buildDefaultSecuritySettings(),
        privacy: this.buildDefaultPrivacySettings(),

        createdAt: candidateData.created_at || new Date().toISOString(),
        updatedAt: candidateData.updated_at || new Date().toISOString(),
        version: 1
      };

      // Mettre en cache
      this.setCached(cacheKey, settings);

      console.log('[CandidateSettingsAPI] Settings loaded successfully');
      return { success: true, data: settings };

    } catch (error) {
      console.error('[CandidateSettingsAPI] Error loading settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur chargement paramètres'
      };
    }
  }

  /**
   * Met à jour une section des paramètres candidat
   */
  static async updateCandidateSettings(
    request: UpdateCandidateSettingsRequest
  ): Promise<CandidateSettingsResponse<UpdateCandidateSettingsResponse>> {
    try {
      console.log('[CandidateSettingsAPI] Updating settings section:', request.section);

      const { candidateId, section, settings } = request;

      // Invalider le cache
      this.cache.delete(`settings_${candidateId}`);

      let updateData: any = {};
      const validationWarnings: ValidationWarning[] = [];

      // Préparer les données selon la section
      switch (section) {
        case 'personal':
          updateData = this.preparePersonalUpdate(settings.personal!);
          break;

        case 'professional':
          updateData = await this.prepareProfessionalUpdate(candidateId, settings.professional!);
          break;

        case 'skills':
          // Gérée séparément via addLanguage/addExpertise
          break;

        case 'qualification':
          updateData = this.prepareQualificationUpdate(settings.qualification!);
          break;

        default:
          // Pour les autres sections, stocker dans une table dédiée si nécessaire
          break;
      }

      // Effectuer la mise à jour si des données à mettre à jour
      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from('candidate_profiles')
          .update(updateData)
          .eq('id', candidateId);

        if (error) {
          throw new Error(`Erreur mise à jour: ${error.message}`);
        }

        // Mettre à jour aussi profiles si nécessaire (ID universel)
        if (updateData.first_name || updateData.last_name || updateData.phone) {
          await supabase
            .from('profiles')
            .update({
              first_name: updateData.first_name,
              last_name: updateData.last_name,
              phone: updateData.phone
            })
            .eq('id', candidateId);
        }
      }

      // Récupérer les paramètres mis à jour
      const updatedSettings = await this.getCandidateSettings(candidateId);

      if (!updatedSettings.success || !updatedSettings.data) {
        throw new Error('Erreur rechargement paramètres');
      }

      const response: UpdateCandidateSettingsResponse = {
        settings: updatedSettings.data,
        updatedFields: Object.keys(updateData),
        validationWarnings
      };

      console.log('[CandidateSettingsAPI] Settings updated successfully');
      return { success: true, data: response };

    } catch (error) {
      console.error('[CandidateSettingsAPI] Error updating settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur mise à jour paramètres'
      };
    }
  }

  // ==========================================
  // GESTION DES COMPÉTENCES
  // ==========================================

  /**
   * Ajoute une langue au profil candidat
   */
  static async addLanguage(
    candidateId: string,
    languageId: string,
    level: LanguageLevel = 'intermediate'
  ): Promise<CandidateSettingsResponse<CandidateLanguage>> {
    try {
      const { data, error } = await supabase
        .from('candidate_languages')
        .insert({
          candidate_id: candidateId,
          language_id: languageId
        })
        .select(`
          id,
          hr_languages (
            id,
            name
          )
        `)
        .single();

      if (error) {
        throw new Error(`Erreur ajout langue: ${error.message}`);
      }

      // Invalider le cache
      this.cache.delete(`settings_${candidateId}`);

      // Recalculer les tarifs
      await this.updateCandidateRates(candidateId);

      return {
        success: true,
        data: {
          id: data.id,
          candidateId: candidateId,
          languageId: languageId,
          languageName: data.hr_languages?.name || 'Inconnue',
          level,
          certified: false,
          createdAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('[CandidateSettingsAPI] Error adding language:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur ajout langue'
      };
    }
  }

  /**
   * Supprime une langue du profil candidat
   */
  static async removeLanguage(candidateId: string, languageId: string): Promise<CandidateSettingsResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('candidate_languages')
        .delete()
        .eq('candidate_id', candidateId)
        .eq('language_id', languageId);

      if (error) {
        throw new Error(`Erreur suppression langue: ${error.message}`);
      }

      // Invalider le cache
      this.cache.delete(`settings_${candidateId}`);

      // Recalculer les tarifs
      await this.updateCandidateRates(candidateId);

      return { success: true, data: true };

    } catch (error) {
      console.error('[CandidateSettingsAPI] Error removing language:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur suppression langue'
      };
    }
  }

  /**
   * Ajoute une expertise au profil candidat
   */
  static async addExpertise(
    candidateId: string,
    expertiseId: string,
    level: ExpertiseLevel = 'intermediate',
    years: number = 1
  ): Promise<CandidateSettingsResponse<CandidateExpertise>> {
    try {
      const { data, error } = await supabase
        .from('candidate_expertises')
        .insert({
          candidate_id: candidateId,
          expertise_id: expertiseId
        })
        .select(`
          id,
          hr_expertises (
            id,
            name
          )
        `)
        .single();

      if (error) {
        throw new Error(`Erreur ajout expertise: ${error.message}`);
      }

      // Invalider le cache
      this.cache.delete(`settings_${candidateId}`);

      // Recalculer les tarifs
      await this.updateCandidateRates(candidateId);

      return {
        success: true,
        data: {
          id: data.id,
          candidateId: candidateId,
          expertiseId: expertiseId,
          expertiseName: data.hr_expertises?.name || 'Inconnue',
          level,
          yearsOfExperience: years,
          certified: false,
          createdAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('[CandidateSettingsAPI] Error adding expertise:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur ajout expertise'
      };
    }
  }

  /**
   * Supprime une expertise du profil candidat
   */
  static async removeExpertise(candidateId: string, expertiseId: string): Promise<CandidateSettingsResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('candidate_expertises')
        .delete()
        .eq('candidate_id', candidateId)
        .eq('expertise_id', expertiseId);

      if (error) {
        throw new Error(`Erreur suppression expertise: ${error.message}`);
      }

      // Invalider le cache
      this.cache.delete(`settings_${candidateId}`);

      // Recalculer les tarifs
      await this.updateCandidateRates(candidateId);

      return { success: true, data: true };

    } catch (error) {
      console.error('[CandidateSettingsAPI] Error removing expertise:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur suppression expertise'
      };
    }
  }

  // ==========================================
  // CALCUL DES TARIFS
  // ==========================================

  /**
   * Calcule le tarif journalier basé sur le prix de base et la séniorité
   * Logique identique à CandidateSettings.tsx
   */
  static calculateDailyRate(basePrice: number, seniority: SeniorityLevel): number {
    // Prix de base par minute * 60 minutes * 8 heures = prix journalier de base
    const baseDailyRate = basePrice * 60 * 8;

    // Multiplicateurs selon la séniorité
    const seniorityMultipliers: Record<SeniorityLevel, number> = {
      'junior': 1.0,
      'intermediate': 1.15,
      'confirmé': 1.3,
      'senior': 1.6,
      'expert': 2.0
    };

    const multiplier = seniorityMultipliers[seniority] || 1.0;

    return Math.round(baseDailyRate * multiplier);
  }

  /**
   * Calcule le tarif avec bonus expertises et langues
   * Logique identique à CandidateSettings.tsx
   */
  static calculateRateWithExpertise(
    baseRate: number,
    expertiseCount: number,
    languageCount: number
  ): number {
    // 5% par expertise, 5% par langue
    const expertisePercentage = expertiseCount * 0.05;
    const languagePercentage = languageCount * 0.05;
    const totalPercentage = 1 + expertisePercentage + languagePercentage;

    return Math.round(baseRate * totalPercentage);
  }

  /**
   * Calcule les tarifs complets avec détails
   */
  static calculateComprehensiveRate(config: RateCalculationConfig): CalculatedRate {
    const baseRate = this.calculateDailyRate(config.basePrice, config.seniority);
    const seniorityMultipliers: Record<SeniorityLevel, number> = {
      'junior': 1.0,
      'intermediate': 1.15,
      'confirmé': 1.3,
      'senior': 1.6,
      'expert': 2.0
    };

    const seniorityMultiplier = seniorityMultipliers[config.seniority];
    const expertiseBonus = config.includeBonus ? config.expertises * 0.05 : 0;
    const languageBonus = config.includeBonus ? config.languages * 0.05 : 0;

    const finalRate = Math.round(
      baseRate * (1 + expertiseBonus + languageBonus) * (config.customMultiplier || 1)
    );

    return {
      baseRate: config.basePrice * 60 * 8,
      seniorityMultiplier,
      expertiseBonus: expertiseBonus * 100,
      languageBonus: languageBonus * 100,
      finalRate,
      breakdown: [
        {
          component: 'Tarif de base',
          value: config.basePrice * 60 * 8,
          percentage: 0,
          description: `${config.basePrice}€/min × 480min`
        },
        {
          component: 'Séniorité',
          value: baseRate - (config.basePrice * 60 * 8),
          percentage: (seniorityMultiplier - 1) * 100,
          description: `Niveau ${config.seniority}`
        },
        {
          component: 'Expertises',
          value: Math.round(baseRate * expertiseBonus),
          percentage: expertiseBonus * 100,
          description: `${config.expertises} expertises`
        },
        {
          component: 'Langues',
          value: Math.round(baseRate * languageBonus),
          percentage: languageBonus * 100,
          description: `${config.languages} langues`
        }
      ]
    };
  }

  /**
   * Met à jour les tarifs calculés du candidat
   */
  private static async updateCandidateRates(candidateId: string): Promise<void> {
    try {
      // Récupérer les données actuelles
      const { data: candidate } = await supabase
        .from('candidate_profiles')
        .select('profile_id, seniority')
        .eq('id', candidateId)
        .single();

      if (!candidate?.profile_id || !candidate?.seniority) return;

      // Récupérer le prix de base
      const { data: profile } = await supabase
        .from('hr_profiles')
        .select('base_price')
        .eq('id', candidate.profile_id)
        .single();

      if (!profile?.base_price) return;

      // Compter les compétences
      const [{ count: languageCount }, { count: expertiseCount }] = await Promise.all([
        supabase.from('candidate_languages').select('*', { count: 'exact', head: true }).eq('candidate_id', candidateId),
        supabase.from('candidate_expertises').select('*', { count: 'exact', head: true }).eq('candidate_id', candidateId)
      ]);

      // Calculer les nouveaux tarifs
      const dailyRate = this.calculateDailyRate(profile.base_price, candidate.seniority);

      // Mettre à jour
      await supabase
        .from('candidate_profiles')
        .update({ daily_rate: dailyRate })
        .eq('id', candidateId);

      console.log(`[CandidateSettingsAPI] Updated rates for candidate ${candidateId}: ${dailyRate}€`);

    } catch (error) {
      console.error('[CandidateSettingsAPI] Error updating rates:', error);
    }
  }

  // ==========================================
  // QUALIFICATION
  // ==========================================

  /**
   * Démarre une qualification candidat
   */
  static async startQualification(
    candidateId: string,
    method: QualificationMethod
  ): Promise<CandidateSettingsResponse<string>> {
    try {
      console.log(`[CandidateSettingsAPI] Starting qualification for candidate ${candidateId} with method ${method}`);

      // Créer une session de qualification
      const sessionId = `qual_${candidateId}_${Date.now()}`;

      // Mettre à jour le statut
      await supabase
        .from('candidate_profiles')
        .update({
          qualification_status: 'in_progress',
          status: 'qualification'
        })
        .eq('id', candidateId);

      // Invalider le cache
      this.cache.delete(`settings_${candidateId}`);

      return { success: true, data: sessionId };

    } catch (error) {
      console.error('[CandidateSettingsAPI] Error starting qualification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur démarrage qualification'
      };
    }
  }

  /**
   * Récupère les résultats de qualification
   */
  static async getQualificationResults(candidateId: string): Promise<CandidateSettingsResponse<QualificationResult[]>> {
    try {
      // Pour l'instant, retourner un résultat basique
      // À intégrer avec le vrai système de qualification
      const mockResult: QualificationResult = {
        id: `result_${candidateId}`,
        candidateId: candidateId,
        qualificationDate: new Date().toISOString(),
        method: 'ai_voice',
        score: 85,
        maxScore: 100,
        sections: [
          {
            name: 'Compétences techniques',
            score: 80,
            maxScore: 100,
            details: 'Bonnes connaissances techniques',
            strengths: ['Expérience solide', 'Bonne compréhension'],
            improvements: ['Approfondir certains aspects']
          }
        ],
        recommendations: ['Continuer à développer les compétences', 'Pratiquer les entretiens']
      };

      return { success: true, data: [mockResult] };

    } catch (error) {
      console.error('[CandidateSettingsAPI] Error getting qualification results:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur récupération résultats'
      };
    }
  }

  // ==========================================
  // IMPORT/EXPORT
  // ==========================================

  /**
   * Exporte les paramètres candidat en JSON
   */
  static async exportCandidateSettings(candidateId: string): Promise<CandidateSettingsResponse<string>> {
    try {
      const settingsResponse = await this.getCandidateSettings(candidateId);

      if (!settingsResponse.success || !settingsResponse.data) {
        throw new Error('Impossible de récupérer les paramètres');
      }

      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        candidateId: candidateId,
        settings: settingsResponse.data
      };

      return {
        success: true,
        data: JSON.stringify(exportData, null, 2)
      };

    } catch (error) {
      console.error('[CandidateSettingsAPI] Error exporting settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur export paramètres'
      };
    }
  }

  /**
   * Importe des paramètres candidat depuis JSON
   */
  static async importCandidateSettings(
    candidateId: string,
    settingsJson: string
  ): Promise<CandidateSettingsResponse<CandidateSettings>> {
    try {
      const importData = JSON.parse(settingsJson);

      if (!importData.settings || !importData.version) {
        throw new Error('Format d\'import invalide');
      }

      // Valider et appliquer les paramètres
      const sections: CandidateSettingsSection[] = [
        'personal', 'professional', 'preferences', 'notifications', 'security', 'privacy'
      ];

      for (const section of sections) {
        if (importData.settings[section]) {
          await this.updateCandidateSettings({
            candidateId,
            section,
            settings: { [section]: importData.settings[section] }
          });
        }
      }

      // Récupérer les paramètres mis à jour
      const updatedSettings = await this.getCandidateSettings(candidateId);

      if (!updatedSettings.success) {
        throw new Error('Erreur rechargement après import');
      }

      return updatedSettings;

    } catch (error) {
      console.error('[CandidateSettingsAPI] Error importing settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur import paramètres'
      };
    }
  }

  // ==========================================
  // MÉTHODES UTILITAIRES PRIVÉES
  // ==========================================

  /**
   * Construit les paramètres personnels depuis les données candidat
   */
  private static buildPersonalSettings(candidateData: any): PersonalSettings {
    return {
      firstName: candidateData.first_name || '',
      lastName: candidateData.last_name || '',
      email: candidateData.email || '',
      phone: candidateData.phone || '',
      address: {
        street: candidateData.address?.street || '',
        city: candidateData.address?.city || '',
        zipCode: candidateData.address?.zipCode || '',
        country: candidateData.address?.country || 'FR'
      },
      status: candidateData.status || 'disponible',
      workLocation: ['remote', 'hybrid'],
      remoteWorkPercentage: 80
    };
  }

  /**
   * Construit les paramètres professionnels
   */
  private static buildProfessionalSettings(
    candidateData: any,
    profileData: any,
    calculatedRate?: number,
    rateWithExpertise?: number
  ): ProfessionalSettings {
    return {
      profileId: candidateData.profile_id,
      jobTitle: profileData?.name,
      category: profileData?.hr_categories?.name,
      seniority: candidateData.seniority || 'junior',
      yearsOfExperience: candidateData.years_of_experience || 1,
      dailyRate: calculatedRate || candidateData.daily_rate,
      basePrice: profileData?.base_price,
      calculatedRate,
      rateWithExpertise,
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
        teamSizePreference: 'small'
      }
    };
  }

  /**
   * Construit les paramètres de compétences
   */
  private static buildSkillsSettings(languages: any[], expertises: any[]): SkillsSettings {
    return {
      languages: languages?.map(lang => ({
        id: lang.id,
        candidateId: lang.candidate_id,
        languageId: lang.hr_languages?.id,
        languageName: lang.hr_languages?.name || 'Inconnue',
        level: 'intermediate' as LanguageLevel,
        certified: false,
        createdAt: new Date().toISOString()
      })) || [],
      expertises: expertises?.map(exp => ({
        id: exp.id,
        candidateId: exp.candidate_id,
        expertiseId: exp.hr_expertises?.id,
        expertiseName: exp.hr_expertises?.name || 'Inconnue',
        level: 'intermediate' as ExpertiseLevel,
        yearsOfExperience: 1,
        certified: false,
        createdAt: new Date().toISOString()
      })) || [],
      customSkills: [],
      certifications: [],
      education: [],
      portfolio: []
    };
  }

  /**
   * Construit les paramètres de qualification
   */
  private static buildQualificationSettings(candidateData: any): QualificationSettings {
    return {
      qualificationStatus: candidateData.qualification_status || 'pending',
      qualificationScore: candidateData.qualification_score,
      lastQualificationDate: candidateData.last_qualification_date,
      qualificationResults: [],
      qualificationPreferences: {
        allowAutoQualification: true,
        preferredQualificationMethod: 'ai_voice',
        availableForRequalification: true
      },
      evaluations: [],
      clientFeedback: []
    };
  }

  /**
   * Construit les préférences par défaut
   */
  private static buildDefaultPreferences(): CandidatePreferences {
    return {
      theme: 'system',
      language: 'fr',
      timezone: 'Europe/Paris',
      dashboardLayout: 'cards',
      showAdvancedFeatures: false,
      compactMode: false,
      communicationPreferences: {
        preferredContactMethod: 'email',
        responseTimeExpectation: 'within_day',
        availabilityHours: {
          monday: [{ start: '09:00', end: '18:00' }],
          tuesday: [{ start: '09:00', end: '18:00' }],
          wednesday: [{ start: '09:00', end: '18:00' }],
          thursday: [{ start: '09:00', end: '18:00' }],
          friday: [{ start: '09:00', end: '18:00' }],
          saturday: [],
          sunday: []
        }
      },
      projectPreferences: {
        autoAcceptMatching: false,
        showOnlyRelevantProjects: true,
        hideCompletedProjects: false,
        projectSortOrder: 'date_desc'
      }
    };
  }

  /**
   * Construit les paramètres de notifications par défaut
   */
  private static buildDefaultNotificationSettings(): CandidateNotificationSettings {
    return {
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
      sms: {
        enabled: false,
        urgentOnly: true,
        projectStartReminders: false
      },
      frequency: 'immediate',
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
        timezone: 'Europe/Paris'
      }
    };
  }

  /**
   * Construit les paramètres de sécurité par défaut
   */
  private static buildDefaultSecuritySettings(): CandidateSecuritySettings {
    return {
      twoFactorEnabled: false,
      biometricEnabled: false,
      sessionTimeout: 60,
      allowMultipleSessions: true,
      trustedDevices: [],
      loginAlerts: true,
      suspiciousActivityAlerts: true,
      deviceChangeAlerts: false,
      dataAccessLog: false,
      allowDataExport: true,
      allowAccountDeletion: false,
      backupCodes: []
    };
  }

  /**
   * Construit les paramètres de confidentialité par défaut
   */
  private static buildDefaultPrivacySettings(): PrivacySettings {
    return {
      profileVisibility: 'clients_only',
      showRatesPublicly: false,
      showExperienceDetails: true,
      allowAnalytics: true,
      allowPerformanceTracking: true,
      allowMarketingCommunications: false,
      linkedinSyncing: false,
      portfolioSyncing: false,
      dataRetentionPeriod: 24,
      autoDeleteInactiveData: false,
      gdprConsents: []
    };
  }

  /**
   * Prépare les données de mise à jour pour les informations personnelles
   */
  private static preparePersonalUpdate(personal: Partial<PersonalSettings>): any {
    const updateData: any = {};

    if (personal.firstName !== undefined) updateData.first_name = personal.firstName;
    if (personal.lastName !== undefined) updateData.last_name = personal.lastName;
    if (personal.email !== undefined) updateData.email = personal.email;
    if (personal.phone !== undefined) updateData.phone = personal.phone;
    if (personal.status !== undefined) updateData.status = personal.status;

    return updateData;
  }

  /**
   * Prépare les données de mise à jour pour le profil professionnel
   */
  private static async prepareProfessionalUpdate(
    candidateId: string,
    professional: Partial<ProfessionalSettings>
  ): Promise<any> {
    const updateData: any = {};

    if (professional.profileId !== undefined) updateData.profile_id = professional.profileId;
    if (professional.seniority !== undefined) updateData.seniority = professional.seniority;
    if (professional.yearsOfExperience !== undefined) updateData.years_of_experience = professional.yearsOfExperience;

    // Recalculer le tarif si nécessaire
    if (professional.seniority || professional.profileId) {
      // Récupérer le prix de base si pas fourni
      if (professional.profileId) {
        const { data: profile } = await supabase
          .from('hr_profiles')
          .select('base_price')
          .eq('id', professional.profileId)
          .single();

        if (profile?.base_price && professional.seniority) {
          const newDailyRate = this.calculateDailyRate(profile.base_price, professional.seniority);
          updateData.daily_rate = newDailyRate;
        }
      }
    }

    return updateData;
  }

  /**
   * Prépare les données de mise à jour pour la qualification
   */
  private static prepareQualificationUpdate(qualification: Partial<QualificationSettings>): any {
    const updateData: any = {};

    if (qualification.qualificationStatus !== undefined) {
      updateData.qualification_status = qualification.qualificationStatus;
    }
    if (qualification.qualificationScore !== undefined) {
      updateData.qualification_score = qualification.qualificationScore;
    }

    return updateData;
  }
}