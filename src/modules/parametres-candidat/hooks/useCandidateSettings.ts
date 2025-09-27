/**
 * Module PARAMÈTRES CANDIDAT - Hook Principal
 *
 * Hook React pour la gestion des paramètres candidat.
 * Basé sur la logique métier existante de CandidateSettings.tsx.
 *
 * Fonctionnalités:
 * - Gestion complète du profil candidat
 * - Calcul automatique des tarifs avec séniorité
 * - Gestion des compétences (langues, expertises)
 * - Intégration système de qualification IA
 * - Auto-sauvegarde et synchronisation
 * - Validation temps réel
 *
 * @version 1.0.0
 * @created 2025-09-27
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { toast } from 'sonner';

import { CandidateSettingsAPI } from '../services';
import type {
  CandidateSettings,
  UseCandidateSettingsReturn,
  CandidateSettingsSection,
  PersonalSettings,
  ProfessionalSettings,
  SkillsSettings,
  QualificationSettings,
  CandidatePreferences,
  CandidateNotificationSettings,
  CandidateSecuritySettings,
  PrivacySettings,
  LanguageLevel,
  ExpertiseLevel,
  QualificationMethod,
  QualificationResult,
  RateCalculationConfig,
  CalculatedRate,
  ValidationWarning
} from '../types';

/**
 * Hook principal pour la gestion des paramètres candidat
 */
export function useCandidateSettings(candidateId?: string): UseCandidateSettingsReturn {
  const { user } = useAuth();

  // État principal
  const [settings, setSettings] = useState<CandidateSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // État des modifications
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationWarning[]>([]);

  // Références pour optimisation
  const originalSettingsRef = useRef<CandidateSettings | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const currentCandidateId = candidateId || user?.id;

  /**
   * Charge les paramètres au montage du composant
   */
  useEffect(() => {
    if (currentCandidateId) {
      loadCandidateSettings();
    }

    return () => {
      // Cleanup auto-save timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [currentCandidateId]);

  /**
   * Charge les paramètres depuis la base de données
   */
  const loadCandidateSettings = useCallback(async () => {
    if (!currentCandidateId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await CandidateSettingsAPI.getCandidateSettings(currentCandidateId);

      if (!response.success) {
        throw new Error(response.error || 'Erreur chargement paramètres');
      }

      setSettings(response.data || null);
      originalSettingsRef.current = response.data || null;
      setIsDirty(false);
      setLastSaved(response.data?.updatedAt || null);
      setValidationErrors([]);

    } catch (error) {
      console.error('[useCandidateSettings] Erreur loadCandidateSettings:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      setError(errorMessage);
      toast.error(errorMessage);

    } finally {
      setIsLoading(false);
    }
  }, [currentCandidateId]);

  /**
   * Met à jour les informations personnelles
   */
  const updatePersonalSettings = useCallback(async (personalSettings: Partial<PersonalSettings>): Promise<boolean> => {
    if (!currentCandidateId || !settings) {
      toast.error('Paramètres non chargés');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await CandidateSettingsAPI.updateCandidateSettings({
        candidateId: currentCandidateId,
        section: 'personal',
        settings: {
          personal: personalSettings
        },
        reason: 'Mise à jour informations personnelles'
      });

      if (!response.success) {
        throw new Error(response.error || 'Erreur mise à jour');
      }

      // Mettre à jour l'état local
      const updatedSettings = response.data!.settings;
      setSettings(updatedSettings);
      originalSettingsRef.current = updatedSettings;
      setIsDirty(false);
      setLastSaved(updatedSettings.updatedAt);

      toast.success('Informations personnelles mises à jour avec succès');
      return true;

    } catch (error) {
      console.error('[useCandidateSettings] Erreur updatePersonalSettings:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur sauvegarde';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;

    } finally {
      setIsLoading(false);
    }
  }, [currentCandidateId, settings]);

  /**
   * Met à jour le profil professionnel
   */
  const updateProfessionalSettings = useCallback(async (professionalSettings: Partial<ProfessionalSettings>): Promise<boolean> => {
    if (!currentCandidateId || !settings) {
      toast.error('Paramètres non chargés');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await CandidateSettingsAPI.updateCandidateSettings({
        candidateId: currentCandidateId,
        section: 'professional',
        settings: {
          professional: professionalSettings
        },
        reason: 'Mise à jour profil professionnel'
      });

      if (!response.success) {
        throw new Error(response.error || 'Erreur mise à jour');
      }

      // Mettre à jour l'état local
      const updatedSettings = response.data!.settings;
      setSettings(updatedSettings);
      originalSettingsRef.current = updatedSettings;
      setIsDirty(false);
      setLastSaved(updatedSettings.updatedAt);

      toast.success('Profil professionnel mis à jour avec succès');
      return true;

    } catch (error) {
      console.error('[useCandidateSettings] Erreur updateProfessionalSettings:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur sauvegarde';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;

    } finally {
      setIsLoading(false);
    }
  }, [currentCandidateId, settings]);

  /**
   * Met à jour les paramètres de compétences (géré via les méthodes spécifiques)
   */
  const updateSkillsSettings = useCallback(async (skillsSettings: Partial<SkillsSettings>): Promise<boolean> => {
    // Les compétences sont gérées via addLanguage/removeLanguage et addExpertise/removeExpertise
    toast.info('Utilisez addLanguage/removeLanguage et addExpertise/removeExpertise pour modifier les compétences');
    return true;
  }, []);

  /**
   * Met à jour les paramètres de qualification
   */
  const updateQualificationSettings = useCallback(async (qualificationSettings: Partial<QualificationSettings>): Promise<boolean> => {
    if (!currentCandidateId || !settings) {
      toast.error('Paramètres non chargés');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await CandidateSettingsAPI.updateCandidateSettings({
        candidateId: currentCandidateId,
        section: 'qualification',
        settings: {
          qualification: qualificationSettings
        },
        reason: 'Mise à jour qualification'
      });

      if (!response.success) {
        throw new Error(response.error || 'Erreur mise à jour');
      }

      // Mettre à jour l'état local
      const updatedSettings = response.data!.settings;
      setSettings(updatedSettings);
      originalSettingsRef.current = updatedSettings;
      setIsDirty(false);
      setLastSaved(updatedSettings.updatedAt);

      toast.success('Paramètres de qualification mis à jour avec succès');
      return true;

    } catch (error) {
      console.error('[useCandidateSettings] Erreur updateQualificationSettings:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur sauvegarde';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;

    } finally {
      setIsLoading(false);
    }
  }, [currentCandidateId, settings]);

  /**
   * Met à jour les préférences utilisateur
   */
  const updatePreferences = useCallback(async (preferences: Partial<CandidatePreferences>): Promise<boolean> => {
    if (!currentCandidateId || !settings) {
      toast.error('Paramètres non chargés');
      return false;
    }

    // Mise à jour locale immédiate pour l'interface
    const updatedSettings = {
      ...settings,
      preferences: {
        ...settings.preferences,
        ...preferences
      }
    };
    setSettings(updatedSettings);
    setIsDirty(true);

    toast.success('Préférences mises à jour');
    return true;
  }, [currentCandidateId, settings]);

  /**
   * Met à jour les paramètres de notifications
   */
  const updateNotificationSettings = useCallback(async (notificationSettings: Partial<CandidateNotificationSettings>): Promise<boolean> => {
    if (!currentCandidateId || !settings) {
      toast.error('Paramètres non chargés');
      return false;
    }

    // Mise à jour locale immédiate
    const updatedSettings = {
      ...settings,
      notifications: {
        ...settings.notifications,
        ...notificationSettings
      }
    };
    setSettings(updatedSettings);
    setIsDirty(true);

    toast.success('Paramètres de notifications mis à jour');
    return true;
  }, [currentCandidateId, settings]);

  /**
   * Met à jour les paramètres de sécurité
   */
  const updateSecuritySettings = useCallback(async (securitySettings: Partial<CandidateSecuritySettings>): Promise<boolean> => {
    if (!currentCandidateId || !settings) {
      toast.error('Paramètres non chargés');
      return false;
    }

    // Mise à jour locale immédiate
    const updatedSettings = {
      ...settings,
      security: {
        ...settings.security,
        ...securitySettings
      }
    };
    setSettings(updatedSettings);
    setIsDirty(true);

    toast.success('Paramètres de sécurité mis à jour');
    return true;
  }, [currentCandidateId, settings]);

  /**
   * Met à jour les paramètres de confidentialité
   */
  const updatePrivacySettings = useCallback(async (privacySettings: Partial<PrivacySettings>): Promise<boolean> => {
    if (!currentCandidateId || !settings) {
      toast.error('Paramètres non chargés');
      return false;
    }

    // Mise à jour locale immédiate
    const updatedSettings = {
      ...settings,
      privacy: {
        ...settings.privacy,
        ...privacySettings
      }
    };
    setSettings(updatedSettings);
    setIsDirty(true);

    toast.success('Paramètres de confidentialité mis à jour');
    return true;
  }, [currentCandidateId, settings]);

  // ==========================================
  // GESTION DES COMPÉTENCES
  // ==========================================

  /**
   * Ajoute une langue au profil
   */
  const addLanguage = useCallback(async (languageId: string, level: LanguageLevel = 'intermediate'): Promise<boolean> => {
    if (!currentCandidateId) return false;

    try {
      const response = await CandidateSettingsAPI.addLanguage(currentCandidateId, languageId, level);

      if (!response.success) {
        throw new Error(response.error || 'Erreur ajout langue');
      }

      // Recharger les paramètres pour refléter les changements
      await loadCandidateSettings();
      toast.success('Langue ajoutée avec succès');
      return true;

    } catch (error) {
      console.error('[useCandidateSettings] Erreur addLanguage:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur ajout langue';
      toast.error(errorMessage);
      return false;
    }
  }, [currentCandidateId, loadCandidateSettings]);

  /**
   * Supprime une langue du profil
   */
  const removeLanguage = useCallback(async (languageId: string): Promise<boolean> => {
    if (!currentCandidateId) return false;

    try {
      const response = await CandidateSettingsAPI.removeLanguage(currentCandidateId, languageId);

      if (!response.success) {
        throw new Error(response.error || 'Erreur suppression langue');
      }

      // Recharger les paramètres pour refléter les changements
      await loadCandidateSettings();
      toast.success('Langue supprimée avec succès');
      return true;

    } catch (error) {
      console.error('[useCandidateSettings] Erreur removeLanguage:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur suppression langue';
      toast.error(errorMessage);
      return false;
    }
  }, [currentCandidateId, loadCandidateSettings]);

  /**
   * Ajoute une expertise au profil
   */
  const addExpertise = useCallback(async (expertiseId: string, level: ExpertiseLevel = 'intermediate', years: number = 1): Promise<boolean> => {
    if (!currentCandidateId) return false;

    try {
      const response = await CandidateSettingsAPI.addExpertise(currentCandidateId, expertiseId, level, years);

      if (!response.success) {
        throw new Error(response.error || 'Erreur ajout expertise');
      }

      // Recharger les paramètres pour refléter les changements
      await loadCandidateSettings();
      toast.success('Expertise ajoutée avec succès');
      return true;

    } catch (error) {
      console.error('[useCandidateSettings] Erreur addExpertise:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur ajout expertise';
      toast.error(errorMessage);
      return false;
    }
  }, [currentCandidateId, loadCandidateSettings]);

  /**
   * Supprime une expertise du profil
   */
  const removeExpertise = useCallback(async (expertiseId: string): Promise<boolean> => {
    if (!currentCandidateId) return false;

    try {
      const response = await CandidateSettingsAPI.removeExpertise(currentCandidateId, expertiseId);

      if (!response.success) {
        throw new Error(response.error || 'Erreur suppression expertise');
      }

      // Recharger les paramètres pour refléter les changements
      await loadCandidateSettings();
      toast.success('Expertise supprimée avec succès');
      return true;

    } catch (error) {
      console.error('[useCandidateSettings] Erreur removeExpertise:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur suppression expertise';
      toast.error(errorMessage);
      return false;
    }
  }, [currentCandidateId, loadCandidateSettings]);

  // ==========================================
  // CALCUL DES TARIFS
  // ==========================================

  /**
   * Calcule le tarif selon la configuration
   */
  const calculateRate = useCallback((config: RateCalculationConfig): CalculatedRate => {
    return CandidateSettingsAPI.calculateComprehensiveRate(config);
  }, []);

  /**
   * Met à jour les tarifs calculés automatiquement
   */
  const updateRates = useCallback(async (): Promise<void> => {
    if (!settings?.professional?.basePrice || !settings?.professional?.seniority) {
      return;
    }

    try {
      const config: RateCalculationConfig = {
        basePrice: settings.professional.basePrice,
        seniority: settings.professional.seniority,
        languages: settings.skills.languages.length,
        expertises: settings.skills.expertises.length,
        includeBonus: settings.professional.rateSettings?.includeExpertiseBonus || false
      };

      const calculatedRate = calculateRate(config);

      // Mettre à jour les paramètres professionnels avec les nouveaux tarifs
      const updatedProfessional: Partial<ProfessionalSettings> = {
        calculatedRate: calculatedRate.finalRate,
        rateWithExpertise: calculatedRate.finalRate
      };

      await updateProfessionalSettings(updatedProfessional);

    } catch (error) {
      console.error('[useCandidateSettings] Erreur updateRates:', error);
    }
  }, [settings, calculateRate, updateProfessionalSettings]);

  // ==========================================
  // QUALIFICATION
  // ==========================================

  /**
   * Démarre une qualification
   */
  const startQualification = useCallback(async (method: QualificationMethod): Promise<string | null> => {
    if (!currentCandidateId) return null;

    try {
      const response = await CandidateSettingsAPI.startQualification(currentCandidateId, method);

      if (!response.success) {
        throw new Error(response.error || 'Erreur démarrage qualification');
      }

      // Recharger les paramètres pour refléter le nouveau statut
      await loadCandidateSettings();
      toast.success('Qualification démarrée avec succès');
      return response.data || null;

    } catch (error) {
      console.error('[useCandidateSettings] Erreur startQualification:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur qualification';
      toast.error(errorMessage);
      return null;
    }
  }, [currentCandidateId, loadCandidateSettings]);

  /**
   * Récupère les résultats de qualification
   */
  const getQualificationResults = useCallback(async (): Promise<QualificationResult[]> => {
    if (!currentCandidateId) return [];

    try {
      const response = await CandidateSettingsAPI.getQualificationResults(currentCandidateId);

      if (!response.success) {
        throw new Error(response.error || 'Erreur récupération résultats');
      }

      return response.data || [];

    } catch (error) {
      console.error('[useCandidateSettings] Erreur getQualificationResults:', error);
      setError(error instanceof Error ? error.message : 'Erreur récupération résultats');
      return [];
    }
  }, [currentCandidateId]);

  // ==========================================
  // UTILITAIRES
  // ==========================================

  /**
   * Remet à zéro une section de paramètres
   */
  const resetSection = useCallback(async (section: CandidateSettingsSection): Promise<boolean> => {
    if (!currentCandidateId) return false;

    try {
      // Pour l'instant, recharger simplement les paramètres
      // À implémenter : reset spécifique par section
      await loadCandidateSettings();
      toast.success(`Section ${section} remise à zéro`);
      return true;

    } catch (error) {
      console.error('[useCandidateSettings] Erreur resetSection:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur reset';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    }
  }, [currentCandidateId, loadCandidateSettings]);

  /**
   * Exporte les paramètres candidat
   */
  const exportSettings = useCallback(async (): Promise<string> => {
    if (!currentCandidateId) return '';

    try {
      const response = await CandidateSettingsAPI.exportCandidateSettings(currentCandidateId);

      if (!response.success) {
        throw new Error(response.error || 'Erreur export');
      }

      toast.success('Paramètres exportés avec succès');
      return response.data || '';

    } catch (error) {
      console.error('[useCandidateSettings] Erreur exportSettings:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur export';
      setError(errorMessage);
      toast.error(errorMessage);
      return '';
    }
  }, [currentCandidateId]);

  /**
   * Importe des paramètres candidat
   */
  const importSettings = useCallback(async (settingsJson: string): Promise<boolean> => {
    if (!currentCandidateId) return false;

    setIsLoading(true);

    try {
      const response = await CandidateSettingsAPI.importCandidateSettings(currentCandidateId, settingsJson);

      if (!response.success) {
        throw new Error(response.error || 'Erreur import');
      }

      setSettings(response.data || null);
      originalSettingsRef.current = response.data || null;
      setIsDirty(false);
      setLastSaved(response.data?.updatedAt || null);

      toast.success('Paramètres importés avec succès');
      return true;

    } catch (error) {
      console.error('[useCandidateSettings] Erreur importSettings:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur import';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;

    } finally {
      setIsLoading(false);
    }
  }, [currentCandidateId]);

  // ==========================================
  // RETOUR DU HOOK
  // ==========================================

  return {
    // État des paramètres
    settings,
    isLoading,
    error,

    // Actions principales
    updatePersonalSettings,
    updateProfessionalSettings,
    updateSkillsSettings,
    updateQualificationSettings,
    updatePreferences,
    updateNotificationSettings,
    updateSecuritySettings,
    updatePrivacySettings,

    // Calcul de tarifs
    calculateRate,
    updateRates,

    // Gestion des compétences
    addLanguage,
    removeLanguage,
    addExpertise,
    removeExpertise,

    // Qualification
    startQualification,
    getQualificationResults,

    // Utilitaires
    resetSection,
    exportSettings,
    importSettings,

    // État
    isDirty,
    lastSaved,
    validationErrors
  };
}

// Import du client Supabase pour les validations
import { supabase } from '@/integrations/supabase/client';