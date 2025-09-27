/**
 * Hook Principal - Module PARAMÈTRES CLIENT
 *
 * Gère l'état et les opérations des paramètres client.
 * Fournit une interface React complète pour la configuration.
 *
 * Fonctionnalités :
 * - CRUD complet des paramètres
 * - Validation en temps réel
 * - Auto-sauvegarde configurable
 * - Gestion des sauvegardes et restauration
 * - Import/export des configurations
 * - Synchronisation temps réel
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { toast } from 'sonner';

import { ClientSettingsAPI } from '../services';
import type {
  ClientSettings,
  SettingsBackup,
  ValidationError,
  UseClientSettingsReturn,
  SettingsSection
} from '../types';

/**
 * Hook principal pour la gestion des paramètres client
 */
export function useClientSettings(clientId?: string): UseClientSettingsReturn {
  const { user } = useAuth();

  // État principal
  const [settings, setSettings] = useState<ClientSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // État des modifications
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

  // Références pour optimisation
  const originalSettingsRef = useRef<ClientSettings | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const currentClientId = clientId || user?.id;

  /**
   * Charge les paramètres au montage du composant
   */
  useEffect(() => {
    if (currentClientId) {
      loadSettings();
    }

    return () => {
      // Cleanup auto-save timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [currentClientId]);

  /**
   * Auto-sauvegarde quand les paramètres sont modifiés
   */
  useEffect(() => {
    if (isDirty && autoSaveEnabled && settings && originalSettingsRef.current) {
      // Annuler le timeout précédent
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      // Programmer l'auto-sauvegarde après 2 secondes d'inactivité
      autoSaveTimeoutRef.current = setTimeout(() => {
        handleAutoSave();
      }, 2000);
    }
  }, [settings, isDirty, autoSaveEnabled]);

  /**
   * Charge les paramètres depuis la base de données
   */
  const loadSettings = useCallback(async () => {
    if (!currentClientId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await ClientSettingsAPI.getClientSettings(currentClientId);

      if (!response.success) {
        throw new Error(response.error || 'Erreur chargement paramètres');
      }

      setSettings(response.data || null);
      originalSettingsRef.current = response.data || null;
      setIsDirty(false);
      setLastSaved(response.data?.updatedAt || null);

    } catch (error) {
      console.error('[useClientSettings] Erreur loadSettings:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      setError(errorMessage);
      toast.error(errorMessage);

    } finally {
      setIsLoading(false);
    }
  }, [currentClientId]);

  /**
   * Met à jour une section des paramètres
   */
  const updateSettings = useCallback(async (
    section: SettingsSection,
    newSettings: any
  ): Promise<boolean> => {
    if (!currentClientId || !settings) {
      toast.error('Paramètres non chargés');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await ClientSettingsAPI.updateSettings({
        clientId: currentClientId,
        section,
        settings: {
          [section]: newSettings
        },
        reason: `Mise à jour section ${section}`
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

      toast.success('Paramètres sauvegardés avec succès');
      return true;

    } catch (error) {
      console.error('[useClientSettings] Erreur updateSettings:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur sauvegarde';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;

    } finally {
      setIsLoading(false);
    }
  }, [currentClientId, settings]);

  /**
   * Remet à zéro une section de paramètres
   */
  const resetSection = useCallback(async (section: SettingsSection): Promise<boolean> => {
    if (!currentClientId) return false;

    setIsLoading(true);

    try {
      const response = await ClientSettingsAPI.resetSection(currentClientId, section);

      if (!response.success) {
        throw new Error(response.error || 'Erreur reset section');
      }

      setSettings(response.data || null);
      originalSettingsRef.current = response.data || null;
      setIsDirty(false);
      setLastSaved(response.data?.updatedAt || null);

      toast.success(`Section ${section} remise à zéro`);
      return true;

    } catch (error) {
      console.error('[useClientSettings] Erreur resetSection:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur reset';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;

    } finally {
      setIsLoading(false);
    }
  }, [currentClientId]);

  /**
   * Remet à zéro tous les paramètres
   */
  const resetAllSettings = useCallback(async (): Promise<boolean> => {
    if (!currentClientId) return false;

    setIsLoading(true);

    try {
      const response = await ClientSettingsAPI.resetAllSettings(currentClientId);

      if (!response.success) {
        throw new Error(response.error || 'Erreur reset complet');
      }

      setSettings(response.data || null);
      originalSettingsRef.current = response.data || null;
      setIsDirty(false);
      setLastSaved(response.data?.updatedAt || null);

      toast.success('Tous les paramètres ont été remis à zéro');
      return true;

    } catch (error) {
      console.error('[useClientSettings] Erreur resetAllSettings:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur reset complet';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;

    } finally {
      setIsLoading(false);
    }
  }, [currentClientId]);

  /**
   * Crée une sauvegarde des paramètres actuels
   */
  const createBackup = useCallback(async (reason: string): Promise<string | null> => {
    if (!currentClientId) return null;

    try {
      const response = await ClientSettingsAPI.createBackup(currentClientId, reason);

      if (!response.success) {
        throw new Error(response.error || 'Erreur création sauvegarde');
      }

      toast.success('Sauvegarde créée avec succès');
      return response.data || null;

    } catch (error) {
      console.error('[useClientSettings] Erreur createBackup:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur sauvegarde';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    }
  }, [currentClientId]);

  /**
   * Restaure une sauvegarde
   */
  const restoreBackup = useCallback(async (backupId: string): Promise<boolean> => {
    if (!currentClientId) return false;

    setIsLoading(true);

    try {
      const response = await ClientSettingsAPI.restoreBackup(currentClientId, backupId);

      if (!response.success) {
        throw new Error(response.error || 'Erreur restauration');
      }

      setSettings(response.data || null);
      originalSettingsRef.current = response.data || null;
      setIsDirty(false);
      setLastSaved(response.data?.updatedAt || null);

      toast.success('Sauvegarde restaurée avec succès');
      return true;

    } catch (error) {
      console.error('[useClientSettings] Erreur restoreBackup:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur restauration';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;

    } finally {
      setIsLoading(false);
    }
  }, [currentClientId]);

  /**
   * Récupère la liste des sauvegardes
   */
  const getBackups = useCallback(async (): Promise<SettingsBackup[]> => {
    if (!currentClientId) return [];

    try {
      const response = await ClientSettingsAPI.getBackups(currentClientId);

      if (!response.success) {
        throw new Error(response.error || 'Erreur récupération sauvegardes');
      }

      return response.data || [];

    } catch (error) {
      console.error('[useClientSettings] Erreur getBackups:', error);
      setError(error instanceof Error ? error.message : 'Erreur récupération sauvegardes');
      return [];
    }
  }, [currentClientId]);

  /**
   * Valide des paramètres avant sauvegarde
   */
  const validateSettings = useCallback((
    section: SettingsSection,
    sectionSettings: any
  ): ValidationError[] => {
    try {
      // Utiliser la validation du service
      return ClientSettingsAPI.validateSettingsSection?.(section, sectionSettings) || [];
    } catch (error) {
      console.error('[useClientSettings] Erreur validateSettings:', error);
      return [{
        field: section,
        message: 'Erreur de validation',
        code: 'VALIDATION_ERROR',
        severity: 'error'
      }];
    }
  }, []);

  /**
   * Exporte les paramètres en JSON
   */
  const exportSettings = useCallback(async (): Promise<string> => {
    if (!currentClientId) return '';

    try {
      const response = await ClientSettingsAPI.exportSettings(currentClientId);

      if (!response.success) {
        throw new Error(response.error || 'Erreur export');
      }

      toast.success('Paramètres exportés avec succès');
      return response.data || '';

    } catch (error) {
      console.error('[useClientSettings] Erreur exportSettings:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur export';
      setError(errorMessage);
      toast.error(errorMessage);
      return '';
    }
  }, [currentClientId]);

  /**
   * Importe des paramètres depuis JSON
   */
  const importSettings = useCallback(async (settingsJson: string): Promise<boolean> => {
    if (!currentClientId) return false;

    setIsLoading(true);

    try {
      const response = await ClientSettingsAPI.importSettings(currentClientId, settingsJson);

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
      console.error('[useClientSettings] Erreur importSettings:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur import';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;

    } finally {
      setIsLoading(false);
    }
  }, [currentClientId]);

  /**
   * Active/désactive l'auto-sauvegarde
   */
  const toggleAutoSave = useCallback(() => {
    setAutoSaveEnabled(prev => {
      const newValue = !prev;
      toast.info(`Auto-sauvegarde ${newValue ? 'activée' : 'désactivée'}`);
      return newValue;
    });
  }, []);

  /**
   * Met à jour un paramètre local (sans sauvegarder)
   */
  const updateLocalSettings = useCallback((
    section: SettingsSection,
    newSettings: any
  ) => {
    if (!settings) return;

    const updatedSettings = {
      ...settings,
      [section]: {
        ...settings[section],
        ...newSettings
      }
    };

    setSettings(updatedSettings);
    setIsDirty(true);
  }, [settings]);

  /**
   * Gère l'auto-sauvegarde
   */
  const handleAutoSave = useCallback(async () => {
    if (!settings || !isDirty || !originalSettingsRef.current) return;

    try {
      // Déterminer les sections modifiées
      const modifiedSections = getModifiedSections(originalSettingsRef.current, settings);

      // Sauvegarder chaque section modifiée
      for (const section of modifiedSections) {
        await updateSettings(section, settings[section]);
      }

    } catch (error) {
      console.error('[useClientSettings] Erreur handleAutoSave:', error);
      toast.error('Erreur auto-sauvegarde');
    }
  }, [settings, isDirty, updateSettings]);

  /**
   * Détermine les sections qui ont été modifiées
   */
  const getModifiedSections = useCallback((
    original: ClientSettings,
    current: ClientSettings
  ): SettingsSection[] => {
    const sections: SettingsSection[] = [];

    const sectionsToCheck: SettingsSection[] = [
      'general', 'preferences', 'security', 'notifications',
      'billing', 'team', 'integrations', 'interface'
    ];

    for (const section of sectionsToCheck) {
      if (JSON.stringify(original[section]) !== JSON.stringify(current[section])) {
        sections.push(section);
      }
    }

    return sections;
  }, []);

  /**
   * Annule les modifications en cours
   */
  const cancelChanges = useCallback(() => {
    if (originalSettingsRef.current) {
      setSettings({ ...originalSettingsRef.current });
      setIsDirty(false);
      toast.info('Modifications annulées');
    }
  }, []);

  /**
   * Sauvegarde manuelle des modifications
   */
  const saveChanges = useCallback(async (): Promise<boolean> => {
    if (!settings || !isDirty) return true;

    const modifiedSections = getModifiedSections(originalSettingsRef.current!, settings);

    for (const section of modifiedSections) {
      const success = await updateSettings(section, settings[section]);
      if (!success) return false;
    }

    return true;
  }, [settings, isDirty, getModifiedSections, updateSettings]);

  /**
   * Récupère une section spécifique
   */
  const getSection = useCallback((section: SettingsSection) => {
    return settings?.[section] || null;
  }, [settings]);

  /**
   * Vérifie si une section a été modifiée
   */
  const isSectionDirty = useCallback((section: SettingsSection): boolean => {
    if (!settings || !originalSettingsRef.current) return false;

    return JSON.stringify(originalSettingsRef.current[section]) !== JSON.stringify(settings[section]);
  }, [settings]);

  return {
    // État des paramètres
    settings,
    isLoading,
    error,

    // Actions principales
    updateSettings,
    resetSection,
    resetAllSettings,

    // Sauvegarde et restauration
    createBackup,
    restoreBackup,
    getBackups,

    // Validation
    validateSettings,

    // Import/Export
    exportSettings,
    importSettings,

    // Utilitaires
    isDirty,
    lastSaved,
    autoSaveEnabled,
    toggleAutoSave,

    // Méthodes additionnelles
    updateLocalSettings,
    cancelChanges,
    saveChanges,
    getSection,
    isSectionDirty,
    loadSettings
  };
}

// Import du client Supabase pour les validations
import { supabase } from '@/integrations/supabase/client';