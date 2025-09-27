/**
 * Module ONBOARDING - Hook useOnboarding
 *
 * Hook React complet pour la gestion de l'onboarding des candidats.
 * Basé sur la logique métier existante de useCandidateOnboarding.ts.
 *
 * Fonctionnalités:
 * - Gestion d'état complet du processus d'onboarding
 * - Navigation entre les étapes avec validation
 * - Chargement et cache des données référentielles
 * - Sauvegarde automatique et persistance
 * - Intégration avec le système de qualification
 * - Matching de projets et suggestions
 * - Workflow complet avec feedback utilisateur
 *
 * @version 1.0.0
 * @created 2025-09-27
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { toast } from 'sonner';

import { OnboardingAPI } from '../services';
import type {
  CandidateProfile,
  OnboardingData,
  HRCategory,
  HRProfile,
  HRExpertise,
  HRLanguage,
  TestQuestion,
  ProjectMatch,
  OnboardingStep,
  SeniorityLevel,
  BillingType,
  UseOnboardingProps,
  UseOnboardingReturn
} from '../types';

/**
 * Hook principal pour la gestion de l'onboarding candidat
 * Compatible avec l'implémentation existante
 */
export const useOnboarding = (props?: UseOnboardingProps): UseOnboardingReturn => {
  const {
    candidateId,
    initialStep = 1,
    autoSave = true,
    autoAdvance = false
  } = props || {};

  const { user } = useAuth();

  // États principaux
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(initialStep);

  // Données d'onboarding
  const [data, setData] = useState<OnboardingData>({
    step: initialStep,
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
    startedAt: new Date().toISOString()
  });

  // Données référentielles
  const [categories, setCategories] = useState<HRCategory[]>([]);
  const [profiles, setProfiles] = useState<HRProfile[]>([]);
  const [expertises, setExpertises] = useState<HRExpertise[]>([]);
  const [languages, setLanguages] = useState<HRLanguage[]>([]);
  const [testQuestions, setTestQuestions] = useState<TestQuestion[]>([]);

  // ID du candidat effectif
  const effectiveCandidateId = candidateId || user?.id || '';

  // ==========================================
  // CHARGEMENT INITIAL
  // ==========================================

  /**
   * Charge le profil candidat et détermine les besoins d'onboarding
   */
  const loadCandidateProfile = useCallback(async () => {
    if (!effectiveCandidateId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log('[useOnboarding] Loading candidate profile for:', effectiveCandidateId);

      const result = await OnboardingAPI.getCandidateProfile(effectiveCandidateId);

      if (result.success && result.data) {
        setCandidateProfile(result.data);

        // Déterminer si l'onboarding est nécessaire
        const needsOnboarding = OnboardingAPI.checkIfOnboardingNeeded(result.data);
        setNeedsOnboarding(needsOnboarding);

        // Définir l'étape actuelle selon le profil
        if (needsOnboarding && result.data.onboarding_step) {
          setCurrentStep(Math.min(result.data.onboarding_step, 6) as OnboardingStep);
        }

        // Pré-remplir les données si disponibles
        if (result.data.profile_id) {
          setData(prev => ({
            ...prev,
            selectedProfile: result.data!.profile_id!,
            selectedCategory: result.data!.category_id || '',
            seniority: result.data!.seniority,
            billingType: result.data!.billing_type,
            companyName: result.data!.company_name || '',
            siret: result.data!.siret || ''
          }));
        }

        console.log('[useOnboarding] Profile loaded, needs onboarding:', needsOnboarding);
      } else {
        console.error('[useOnboarding] Error loading profile:', result.error);
        toast.error(result.error || 'Erreur lors du chargement du profil');
      }
    } catch (error) {
      console.error('[useOnboarding] Exception loading profile:', error);
      toast.error('Erreur lors du chargement du profil');
    } finally {
      setIsLoading(false);
    }
  }, [effectiveCandidateId]);

  /**
   * Charge toutes les données référentielles
   */
  const loadReferentialData = useCallback(async () => {
    try {
      console.log('[useOnboarding] Loading referential data...');

      // Charger les catégories et langues en parallèle
      const [categoriesResult, languagesResult] = await Promise.all([
        OnboardingAPI.getHRCategories(),
        OnboardingAPI.getHRLanguages()
      ]);

      if (categoriesResult.success) {
        setCategories(categoriesResult.data || []);
      } else {
        console.warn('Error loading categories:', categoriesResult.error);
      }

      if (languagesResult.success) {
        setLanguages(languagesResult.data || []);
      } else {
        console.warn('Error loading languages:', languagesResult.error);
      }

      console.log('[useOnboarding] Referential data loaded successfully');
    } catch (error) {
      console.error('[useOnboarding] Error loading referential data:', error);
    }
  }, []);

  /**
   * Charge les profils d'une catégorie
   */
  const loadProfiles = useCallback(async (categoryId: string) => {
    try {
      console.log('[useOnboarding] Loading profiles for category:', categoryId);

      const result = await OnboardingAPI.getHRProfiles(categoryId);

      if (result.success) {
        setProfiles(result.data || []);
      } else {
        console.warn('Error loading profiles:', result.error);
        setProfiles([]);
      }
    } catch (error) {
      console.error('[useOnboarding] Error loading profiles:', error);
      setProfiles([]);
    }
  }, []);

  /**
   * Charge les expertises d'une catégorie
   */
  const loadExpertises = useCallback(async (categoryId: string) => {
    try {
      console.log('[useOnboarding] Loading expertises for category:', categoryId);

      const result = await OnboardingAPI.getHRExpertises(categoryId);

      if (result.success) {
        setExpertises(result.data || []);
      } else {
        console.warn('Error loading expertises:', result.error);
        setExpertises([]);
      }
    } catch (error) {
      console.error('[useOnboarding] Error loading expertises:', error);
      setExpertises([]);
    }
  }, []);

  // ==========================================
  // GESTION DES ÉTAPES
  // ==========================================

  /**
   * Met à jour les données d'onboarding
   */
  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData(prev => {
      const newData = { ...prev, ...updates };

      // Auto-save si activé
      if (autoSave && effectiveCandidateId) {
        // Sauvegarder l'étape actuelle
        OnboardingAPI.updateOnboardingStep(effectiveCandidateId, newData.step);
      }

      return newData;
    });
  }, [autoSave, effectiveCandidateId]);

  /**
   * Passe à l'étape suivante
   */
  const nextStep = useCallback(() => {
    if (currentStep < 6) {
      const nextStepNum = (currentStep + 1) as OnboardingStep;
      setCurrentStep(nextStepNum);
      updateData({
        step: nextStepNum,
        currentStepStartedAt: new Date().toISOString()
      });

      // Auto-advance si activé
      if (autoAdvance) {
        // Logique pour passer automatiquement selon les données
      }
    }
  }, [currentStep, updateData, autoAdvance]);

  /**
   * Revient à l'étape précédente
   */
  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      const prevStepNum = (currentStep - 1) as OnboardingStep;
      setCurrentStep(prevStepNum);
      updateData({
        step: prevStepNum,
        currentStepStartedAt: new Date().toISOString()
      });
    }
  }, [currentStep, updateData]);

  /**
   * Va directement à une étape spécifique
   */
  const goToStep = useCallback((step: OnboardingStep) => {
    if (step >= 1 && step <= 6) {
      setCurrentStep(step);
      updateData({
        step,
        currentStepStartedAt: new Date().toISOString()
      });
    }
  }, [updateData]);

  /**
   * Met à jour l'étape d'onboarding en base
   */
  const updateOnboardingStep = useCallback(async (step: number) => {
    if (!effectiveCandidateId) return;

    try {
      const result = await OnboardingAPI.updateOnboardingStep(effectiveCandidateId, step);

      if (result.success) {
        // Mettre à jour le profil local
        setCandidateProfile(prev => prev ? {
          ...prev,
          onboarding_step: step
        } : null);
      } else {
        toast.error(result.error || 'Erreur mise à jour étape');
      }
    } catch (error) {
      console.error('[useOnboarding] Error updating onboarding step:', error);
    }
  }, [effectiveCandidateId]);

  // ==========================================
  // ACTIONS SPÉCIFIQUES
  // ==========================================

  /**
   * Gère le changement de catégorie (étape métier)
   */
  const handleCategoryChange = useCallback((categoryId: string) => {
    updateData({ selectedCategory: categoryId });
    loadProfiles(categoryId);
    loadExpertises(categoryId);
  }, [updateData, loadProfiles, loadExpertises]);

  /**
   * Gère le changement de profil (étape métier)
   */
  const handleProfileChange = useCallback((profileId: string) => {
    updateData({ selectedProfile: profileId });
  }, [updateData]);

  /**
   * Termine l'onboarding
   */
  const completeOnboarding = useCallback(async (onboardingData: OnboardingData): Promise<boolean> => {
    if (!effectiveCandidateId) {
      toast.error('ID candidat manquant');
      return false;
    }

    try {
      console.log('[useOnboarding] Completing onboarding...');

      const result = await OnboardingAPI.completeOnboarding({
        candidateId: effectiveCandidateId,
        data: {
          ...onboardingData,
          completedAt: new Date().toISOString()
        }
      });

      if (result.success) {
        // Marquer l'onboarding comme terminé
        setNeedsOnboarding(false);

        // Mettre à jour le profil
        setCandidateProfile(prev => prev ? {
          ...prev,
          onboarding_step: 999,
          qualification_status: 'pending',
          profile_id: onboardingData.selectedProfile,
          seniority: onboardingData.seniority,
          billing_type: onboardingData.billingType,
          company_name: onboardingData.companyName,
          siret: onboardingData.siret
        } : null);

        console.log('[useOnboarding] Onboarding completed successfully');
        return true;
      } else {
        toast.error(result.error || 'Erreur lors de la finalisation');
        return false;
      }
    } catch (error) {
      console.error('[useOnboarding] Error completing onboarding:', error);
      toast.error('Erreur lors de la finalisation');
      return false;
    }
  }, [effectiveCandidateId]);

  /**
   * Remet à zéro l'onboarding
   */
  const resetOnboarding = useCallback(async () => {
    if (!effectiveCandidateId) return;

    try {
      const result = await OnboardingAPI.resetOnboarding(effectiveCandidateId);

      if (result.success) {
        setNeedsOnboarding(true);
        setCurrentStep(1);
        setData({
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
          startedAt: new Date().toISOString()
        });

        setCandidateProfile(prev => prev ? {
          ...prev,
          onboarding_step: 1,
          qualification_status: 'pending'
        } : null);

        toast.success('Onboarding remis à zéro');
      } else {
        toast.error(result.error || 'Erreur lors de la remise à zéro');
      }
    } catch (error) {
      console.error('[useOnboarding] Error resetting onboarding:', error);
    }
  }, [effectiveCandidateId]);

  // ==========================================
  // DONNÉES CALCULÉES
  // ==========================================

  /**
   * Calcule le progrès en pourcentage
   */
  const progress = useMemo(() => {
    return Math.round((currentStep / 6) * 100);
  }, [currentStep]);

  /**
   * Vérifie si une étape est terminée
   */
  const isStepCompleted = useCallback((step: OnboardingStep): boolean => {
    switch (step) {
      case 1: return true; // Bienvenue toujours complète
      case 2: return !!data.selectedProfile;
      case 3: return data.selectedExpertises.length > 0 || data.customExpertises.length > 0;
      case 4: return data.selectedLanguages.length > 0;
      case 5: return !!data.seniority;
      case 6: return !!data.billingType;
      default: return false;
    }
  }, [data]);

  /**
   * Vérifie si on peut avancer à une étape
   */
  const canAdvanceToStep = useCallback((step: OnboardingStep): boolean => {
    if (step <= currentStep) return true;

    // Vérifier que toutes les étapes précédentes sont complètes
    for (let i = 1; i < step; i++) {
      if (!isStepCompleted(i as OnboardingStep)) {
        return false;
      }
    }

    return true;
  }, [currentStep, isStepCompleted]);

  // ==========================================
  // EFFETS
  // ==========================================

  /**
   * Chargement initial
   */
  useEffect(() => {
    if (effectiveCandidateId) {
      loadCandidateProfile();
      loadReferentialData();
    }
  }, [effectiveCandidateId, loadCandidateProfile, loadReferentialData]);

  /**
   * Réagit aux changements de catégorie
   */
  useEffect(() => {
    if (data.selectedCategory) {
      loadProfiles(data.selectedCategory);
      loadExpertises(data.selectedCategory);
    }
  }, [data.selectedCategory, loadProfiles, loadExpertises]);

  // ==========================================
  // ALIAS POUR COMPATIBILITÉ
  // ==========================================

  const refetchProfile = loadCandidateProfile;

  // ==========================================
  // RETOUR DU HOOK
  // ==========================================

  return {
    // État
    candidateProfile,
    needsOnboarding,
    isLoading,
    currentStep,
    data,

    // Données référentielles
    categories,
    profiles,
    expertises,
    languages,
    testQuestions,

    // Actions de navigation
    updateData,
    nextStep,
    prevStep,
    goToStep,
    updateOnboardingStep,
    completeOnboarding,
    resetOnboarding,

    // Actions spécifiques (pour compatibilité)
    handleCategoryChange,
    handleProfileChange,

    // Données calculées
    progress,
    isStepCompleted,
    canAdvanceToStep,

    // Utilitaires
    refetchProfile,
    loadReferentialData
  };
};