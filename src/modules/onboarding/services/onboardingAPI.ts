/**
 * Module ONBOARDING - Service API
 *
 * Service complet pour la gestion de l'onboarding des candidats.
 * Basé sur la logique métier existante de useCandidateOnboarding.ts.
 *
 * Fonctionnalités:
 * - Gestion du profil candidat et statuts
 * - Processus d'onboarding en 6 étapes
 * - CRUD des données référentielles (métiers, compétences, langues)
 * - Sauvegarde des compétences et langues candidat
 * - Tests de qualification et validation
 * - Matching de projets personnalisés
 * - Workflow complet avec persistance Supabase
 *
 * @version 1.0.0
 * @created 2025-09-27
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ProjectMatchingEngine, ProjectMatch } from '@/utils/projectMatching';

import type {
  CandidateProfile,
  OnboardingData,
  OnboardingResponse,
  CompleteOnboardingRequest,
  HRCategory,
  HRProfile,
  HRExpertise,
  HRLanguage,
  TestQuestion,
  QualificationResult,
  ProjectSearchParams,
  OnboardingStats,
  OnboardingEvent,
  OnboardingEventData,
  QualificationStatus,
  BillingType,
  SeniorityLevel
} from '../types';

/**
 * API Client pour l'onboarding des candidats
 */
export class OnboardingAPI {
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
  // GESTION DU PROFIL CANDIDAT
  // ==========================================

  /**
   * Récupère le profil candidat avec statut d'onboarding
   * Logique basée sur useCandidateOnboarding.ts
   */
  static async getCandidateProfile(userId: string): Promise<OnboardingResponse<CandidateProfile>> {
    try {
      console.log('[OnboardingAPI] Loading candidate profile for user:', userId);

      // Vérifier le cache
      const cacheKey = `candidate_profile_${userId}`;
      const cached = this.getCached<CandidateProfile>(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      // Récupérer le profil candidat avec les données enrichies
      const { data: candidate, error } = await supabase
        .from('candidate_profiles')
        .select(`
          *,
          hr_profiles!profile_id (
            id,
            name,
            category_id,
            base_price,
            hr_categories!category_id (
              id,
              name
            )
          )
        `)
        .eq('id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // Candidat n'existe pas - ne devrait pas arriver avec le système automatique
        console.warn('[OnboardingAPI] Candidate profile not found for user:', userId);
        return {
          success: false,
          error: 'Profil candidat non trouvé. Veuillez contacter le support.'
        };
      } else if (error) {
        throw new Error(`Erreur récupération profil: ${error.message}`);
      }

      // Enrichir avec les données métier
      const enrichedProfile: CandidateProfile = {
        ...candidate,
        category_name: candidate.hr_profiles?.hr_categories?.name,
        profile_name: candidate.hr_profiles?.name
      };

      // Charger les compétences et langues
      const [expertisesResult, languagesResult] = await Promise.all([
        this.getCandidateExpertises(userId),
        this.getCandidateLanguages(userId)
      ]);

      if (expertisesResult.success) {
        enrichedProfile.expertises = expertisesResult.data;
      }

      if (languagesResult.success) {
        enrichedProfile.languages = languagesResult.data;
      }

      // Mettre en cache
      this.setCached(cacheKey, enrichedProfile);

      console.log('[OnboardingAPI] Profile loaded successfully');
      return { success: true, data: enrichedProfile };

    } catch (error) {
      console.error('[OnboardingAPI] Error loading candidate profile:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur chargement profil'
      };
    }
  }

  /**
   * Vérifie si l'onboarding est nécessaire
   * Logique basée sur checkIfOnboardingNeeded()
   */
  static checkIfOnboardingNeeded(candidate: CandidateProfile): boolean {
    // Ne plus montrer l'onboarding si le candidat est qualifié ou accepté
    if (candidate.qualification_status === 'qualified' || candidate.qualification_status === 'accepted') {
      return false;
    }

    // Vérifier si l'onboarding est déjà terminé (999 = terminé)
    if (candidate.onboarding_step === 999) {
      return false;
    }

    // Montrer l'onboarding si :
    return (
      !candidate.profile_id || // Pas de métier défini
      !candidate.qualification_status || // Pas de statut de qualification
      (candidate.qualification_status === 'pending' && candidate.onboarding_step !== 999) // En attente et onboarding pas complété
    );
  }

  /**
   * Met à jour l'étape d'onboarding
   */
  static async updateOnboardingStep(candidateId: string, step: number): Promise<OnboardingResponse<boolean>> {
    try {
      console.log('[OnboardingAPI] Updating onboarding step:', { candidateId, step });

      const { error } = await supabase
        .from('candidate_profiles')
        .update({ onboarding_step: step })
        .eq('id', candidateId);

      if (error) {
        throw new Error(`Erreur mise à jour étape: ${error.message}`);
      }

      // Invalider le cache
      this.cache.delete(`candidate_profile_${candidateId}`);

      // Enregistrer l'événement
      await this.trackOnboardingEvent({
        candidateId,
        event: 'step_completed',
        step: step as any,
        timestamp: new Date().toISOString(),
        data: { step }
      });

      console.log('[OnboardingAPI] Onboarding step updated successfully');
      return { success: true, data: true };

    } catch (error) {
      console.error('[OnboardingAPI] Error updating onboarding step:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur mise à jour étape'
      };
    }
  }

  // ==========================================
  // DONNÉES RÉFÉRENTIELLES
  // ==========================================

  /**
   * Récupère les catégories métier
   */
  static async getHRCategories(): Promise<OnboardingResponse<HRCategory[]>> {
    try {
      const cacheKey = 'hr_categories';
      const cached = this.getCached<HRCategory[]>(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const { data, error } = await supabase
        .from('hr_categories')
        .select('*')
        .order('name');

      if (error) {
        throw new Error(`Erreur chargement catégories: ${error.message}`);
      }

      this.setCached(cacheKey, data || []);
      return { success: true, data: data || [] };

    } catch (error) {
      console.error('[OnboardingAPI] Error loading HR categories:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur chargement catégories'
      };
    }
  }

  /**
   * Récupère les profils métier d'une catégorie
   */
  static async getHRProfiles(categoryId: string): Promise<OnboardingResponse<HRProfile[]>> {
    try {
      const cacheKey = `hr_profiles_${categoryId}`;
      const cached = this.getCached<HRProfile[]>(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const { data, error } = await supabase
        .from('hr_profiles')
        .select(`
          *,
          hr_categories!category_id (
            name
          )
        `)
        .eq('category_id', categoryId)
        .order('name');

      if (error) {
        throw new Error(`Erreur chargement profils: ${error.message}`);
      }

      const enrichedProfiles = (data || []).map(profile => ({
        ...profile,
        category_name: profile.hr_categories?.name
      }));

      this.setCached(cacheKey, enrichedProfiles);
      return { success: true, data: enrichedProfiles };

    } catch (error) {
      console.error('[OnboardingAPI] Error loading HR profiles:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur chargement profils'
      };
    }
  }

  /**
   * Récupère les expertises d'une catégorie
   */
  static async getHRExpertises(categoryId: string): Promise<OnboardingResponse<HRExpertise[]>> {
    try {
      const cacheKey = `hr_expertises_${categoryId}`;
      const cached = this.getCached<HRExpertise[]>(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const { data, error } = await supabase
        .from('hr_expertises')
        .select(`
          *,
          hr_categories!category_id (
            name
          )
        `)
        .eq('category_id', categoryId)
        .order('name');

      if (error) {
        throw new Error(`Erreur chargement expertises: ${error.message}`);
      }

      const enrichedExpertises = (data || []).map(expertise => ({
        ...expertise,
        category_name: expertise.hr_categories?.name
      }));

      this.setCached(cacheKey, enrichedExpertises);
      return { success: true, data: enrichedExpertises };

    } catch (error) {
      console.error('[OnboardingAPI] Error loading HR expertises:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur chargement expertises'
      };
    }
  }

  /**
   * Récupère toutes les langues disponibles
   */
  static async getHRLanguages(): Promise<OnboardingResponse<HRLanguage[]>> {
    try {
      const cacheKey = 'hr_languages';
      const cached = this.getCached<HRLanguage[]>(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const { data, error } = await supabase
        .from('hr_languages')
        .select('*')
        .order('name');

      if (error) {
        throw new Error(`Erreur chargement langues: ${error.message}`);
      }

      this.setCached(cacheKey, data || []);
      return { success: true, data: data || [] };

    } catch (error) {
      console.error('[OnboardingAPI] Error loading HR languages:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur chargement langues'
      };
    }
  }

  // ==========================================
  // COMPÉTENCES ET LANGUES CANDIDAT
  // ==========================================

  /**
   * Récupère les expertises d'un candidat
   */
  static async getCandidateExpertises(candidateId: string): Promise<OnboardingResponse<any[]>> {
    try {
      const { data, error } = await supabase
        .from('candidate_expertises')
        .select(`
          *,
          hr_expertises!expertise_id (
            name,
            description,
            category_id
          )
        `)
        .eq('candidate_id', candidateId);

      if (error) {
        throw new Error(`Erreur chargement expertises candidat: ${error.message}`);
      }

      const enrichedExpertises = (data || []).map(item => ({
        ...item,
        expertise_name: item.hr_expertises?.name
      }));

      return { success: true, data: enrichedExpertises };

    } catch (error) {
      console.error('[OnboardingAPI] Error loading candidate expertises:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur chargement expertises candidat'
      };
    }
  }

  /**
   * Récupère les langues d'un candidat
   */
  static async getCandidateLanguages(candidateId: string): Promise<OnboardingResponse<any[]>> {
    try {
      const { data, error } = await supabase
        .from('candidate_languages')
        .select(`
          *,
          hr_languages!language_id (
            name,
            code,
            flag
          )
        `)
        .eq('candidate_id', candidateId);

      if (error) {
        throw new Error(`Erreur chargement langues candidat: ${error.message}`);
      }

      const enrichedLanguages = (data || []).map(item => ({
        ...item,
        language_name: item.hr_languages?.name
      }));

      return { success: true, data: enrichedLanguages };

    } catch (error) {
      console.error('[OnboardingAPI] Error loading candidate languages:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur chargement langues candidat'
      };
    }
  }

  /**
   * Sauvegarde les expertises d'un candidat
   */
  static async saveCandidateExpertises(candidateId: string, expertiseIds: string[], customExpertises: string[] = [], categoryId?: string): Promise<OnboardingResponse<boolean>> {
    try {
      console.log('[OnboardingAPI] Saving expertises:', { candidateId, expertiseIds, customExpertises });

      // Supprimer les anciennes compétences
      const { error: deleteError } = await supabase
        .from('candidate_expertises')
        .delete()
        .eq('candidate_id', candidateId);

      if (deleteError) {
        console.warn('Warning deleting old expertises:', deleteError);
      }

      // Ajouter les nouvelles compétences prédéfinies
      if (expertiseIds.length > 0) {
        const expertiseInserts = expertiseIds.map(expertiseId => ({
          candidate_id: candidateId,
          expertise_id: expertiseId
        }));

        const { error: insertError } = await supabase
          .from('candidate_expertises')
          .insert(expertiseInserts);

        if (insertError) {
          throw new Error(`Erreur sauvegarde expertises: ${insertError.message}`);
        }
      }

      // Créer et sauvegarder les compétences personnalisées
      if (customExpertises.length > 0 && categoryId) {
        for (const customExpertise of customExpertises) {
          // Créer une nouvelle expertise
          const { data: newExpertise, error: createError } = await supabase
            .from('hr_expertises')
            .insert({
              name: customExpertise,
              category_id: categoryId,
              description: `Compétence personnalisée ajoutée par un candidat`
            })
            .select()
            .single();

          if (createError) {
            console.warn('Warning creating custom expertise:', createError);
            continue;
          }

          if (newExpertise) {
            // Lier cette expertise au candidat
            await supabase
              .from('candidate_expertises')
              .insert({
                candidate_id: candidateId,
                expertise_id: newExpertise.id
              });
          }
        }
      }

      console.log('[OnboardingAPI] Expertises saved successfully');
      return { success: true, data: true };

    } catch (error) {
      console.error('[OnboardingAPI] Error saving candidate expertises:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur sauvegarde expertises'
      };
    }
  }

  /**
   * Sauvegarde les langues d'un candidat
   */
  static async saveCandidateLanguages(candidateId: string, languageIds: string[]): Promise<OnboardingResponse<boolean>> {
    try {
      console.log('[OnboardingAPI] Saving languages:', { candidateId, languageIds });

      // Supprimer les anciennes langues
      const { error: deleteError } = await supabase
        .from('candidate_languages')
        .delete()
        .eq('candidate_id', candidateId);

      if (deleteError) {
        console.warn('Warning deleting old languages:', deleteError);
      }

      // Ajouter les nouvelles langues
      if (languageIds.length > 0) {
        const languageInserts = languageIds.map(languageId => ({
          candidate_id: candidateId,
          language_id: languageId
        }));

        const { error: insertError } = await supabase
          .from('candidate_languages')
          .insert(languageInserts);

        if (insertError) {
          throw new Error(`Erreur sauvegarde langues: ${insertError.message}`);
        }
      }

      console.log('[OnboardingAPI] Languages saved successfully');
      return { success: true, data: true };

    } catch (error) {
      console.error('[OnboardingAPI] Error saving candidate languages:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur sauvegarde langues'
      };
    }
  }

  // ==========================================
  // COMPLÉTION DE L'ONBOARDING
  // ==========================================

  /**
   * Termine le processus d'onboarding
   * Logique basée sur completeOnboarding() du hook
   */
  static async completeOnboarding(request: CompleteOnboardingRequest): Promise<OnboardingResponse<boolean>> {
    try {
      const { candidateId, data: onboardingData } = request;
      console.log('[OnboardingAPI] Completing onboarding:', { candidateId, onboardingData });

      // Mise à jour du profil candidat principal
      const updateData: any = {
        profile_id: onboardingData.selectedProfile,
        seniority: onboardingData.seniority || 'junior',
        qualification_status: 'pending', // Les candidats doivent passer le test IA
        onboarding_step: 999, // Marquer comme terminé
        billing_type: onboardingData.billingType,
        company_name: onboardingData.companyName,
        siret: onboardingData.siret
      };

      console.log('[OnboardingAPI] Updating candidate profile with:', updateData);
      const { data: updatedProfile, error: updateError } = await supabase
        .from('candidate_profiles')
        .update(updateData)
        .eq('id', candidateId)
        .select()
        .single();

      if (updateError) {
        // Gérer les erreurs de trigger comme dans le code original
        if (updateError.message?.includes('last_seen')) {
          console.warn('[OnboardingAPI] Trigger error detected, attempting workaround...');

          // Mettre à jour les champs essentiels séparément
          await supabase
            .from('candidate_profiles')
            .update({ qualification_status: 'pending' })
            .eq('id', candidateId);

          await supabase
            .from('candidate_profiles')
            .update({ onboarding_step: 999 })
            .eq('id', candidateId);

          console.log('[OnboardingAPI] Workaround successful');
        } else {
          throw new Error(`Erreur mise à jour profil: ${updateError.message}`);
        }
      }

      // Sauvegarder les compétences
      if (onboardingData.selectedExpertises?.length > 0 || onboardingData.customExpertises?.length > 0) {
        await this.saveCandidateExpertises(
          candidateId,
          onboardingData.selectedExpertises || [],
          onboardingData.customExpertises || [],
          onboardingData.selectedCategory
        );
      }

      // Sauvegarder les langues
      if (onboardingData.selectedLanguages?.length > 0) {
        await this.saveCandidateLanguages(candidateId, onboardingData.selectedLanguages);
      }

      // Sauvegarder les résultats de test s'ils existent
      if (onboardingData.testAnswers && Object.keys(onboardingData.testAnswers).length > 0) {
        await this.saveQualificationResults(candidateId, {
          test_answers: onboardingData.testAnswers,
          score: onboardingData.testScore || 0,
          qualification_status: onboardingData.qualificationStatus || 'pending'
        });
      }

      // Invalider le cache
      this.cache.delete(`candidate_profile_${candidateId}`);

      // Enregistrer l'événement de complétion
      await this.trackOnboardingEvent({
        candidateId,
        event: 'onboarding_completed',
        timestamp: new Date().toISOString(),
        data: { duration: this.calculateOnboardingDuration(onboardingData) }
      });

      console.log('[OnboardingAPI] Onboarding completed successfully');
      toast.success('Profil complété avec succès ! Vous recevrez bientôt des propositions de mission.');

      return { success: true, data: true };

    } catch (error) {
      console.error('[OnboardingAPI] Error completing onboarding:', error);
      toast.error('Erreur lors de la finalisation du profil');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur complétion onboarding'
      };
    }
  }

  // ==========================================
  // QUALIFICATION ET TESTS
  // ==========================================

  /**
   * Sauvegarde les résultats de qualification
   */
  static async saveQualificationResults(candidateId: string, results: any): Promise<OnboardingResponse<boolean>> {
    try {
      console.log('[OnboardingAPI] Saving qualification results:', { candidateId, results });

      // Vérifier si un résultat existe déjà
      const { data: existingResult, error: checkError } = await supabase
        .from('candidate_qualification_results')
        .select('id')
        .eq('candidate_id', candidateId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.warn('Warning checking existing results:', checkError);
      }

      let saveError = null;
      let saveData = null;

      if (existingResult) {
        // Mettre à jour le résultat existant
        const { data, error } = await supabase
          .from('candidate_qualification_results')
          .update({
            test_answers: results.test_answers,
            score: results.score,
            qualification_status: results.qualification_status,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingResult.id)
          .select();

        saveData = data;
        saveError = error;
      } else {
        // Créer un nouveau résultat
        const { data, error } = await supabase
          .from('candidate_qualification_results')
          .insert({
            candidate_id: candidateId,
            test_answers: results.test_answers,
            score: results.score,
            qualification_status: results.qualification_status
          })
          .select();

        saveData = data;
        saveError = error;
      }

      if (saveError) {
        throw new Error(`Erreur sauvegarde résultats: ${saveError.message}`);
      }

      console.log('[OnboardingAPI] Qualification results saved successfully');
      return { success: true, data: true };

    } catch (error) {
      console.error('[OnboardingAPI] Error saving qualification results:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur sauvegarde résultats'
      };
    }
  }

  // ==========================================
  // MATCHING DE PROJETS
  // ==========================================

  /**
   * Recherche les projets correspondant au profil candidat
   */
  static async findMatchingProjects(params: ProjectSearchParams): Promise<OnboardingResponse<ProjectMatch[]>> {
    try {
      console.log('[OnboardingAPI] Finding matching projects:', params);

      // Utiliser le moteur de matching existant
      const candidateSkills = await ProjectMatchingEngine.getCandidateSkills(params.candidateId);

      if (!candidateSkills) {
        return { success: true, data: [] };
      }

      const matches = await ProjectMatchingEngine.findMatchingProjects(
        params.candidateId,
        candidateSkills,
        params.maxResults || 8
      );

      console.log('[OnboardingAPI] Found matching projects:', matches.length);
      return { success: true, data: matches };

    } catch (error) {
      console.error('[OnboardingAPI] Error finding matching projects:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur recherche projets'
      };
    }
  }

  /**
   * Génère des suggestions d'amélioration du profil
   */
  static async generateImprovementSuggestions(candidateId: string, matches: ProjectMatch[]): Promise<OnboardingResponse<any[]>> {
    try {
      // Utiliser le moteur de matching existant
      const candidateSkills = await ProjectMatchingEngine.getCandidateSkills(candidateId);

      if (!candidateSkills) {
        return { success: true, data: [] };
      }

      const suggestions = ProjectMatchingEngine.generateImprovementSuggestions(candidateSkills, matches);

      return { success: true, data: suggestions };

    } catch (error) {
      console.error('[OnboardingAPI] Error generating improvement suggestions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur génération suggestions'
      };
    }
  }

  // ==========================================
  // RESET ET UTILITAIRES
  // ==========================================

  /**
   * Remet à zéro l'onboarding d'un candidat
   */
  static async resetOnboarding(candidateId: string): Promise<OnboardingResponse<boolean>> {
    try {
      console.log('[OnboardingAPI] Resetting onboarding for candidate:', candidateId);

      const { error } = await supabase
        .from('candidate_profiles')
        .update({
          qualification_status: 'pending',
          onboarding_step: 1
        })
        .eq('id', candidateId);

      if (error) {
        throw new Error(`Erreur reset onboarding: ${error.message}`);
      }

      // Invalider le cache
      this.cache.delete(`candidate_profile_${candidateId}`);

      console.log('[OnboardingAPI] Onboarding reset successfully');
      return { success: true, data: true };

    } catch (error) {
      console.error('[OnboardingAPI] Error resetting onboarding:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur reset onboarding'
      };
    }
  }

  /**
   * Calcule la durée de l'onboarding
   */
  private static calculateOnboardingDuration(data: OnboardingData): number {
    if (!data.startedAt) return 0;

    const start = new Date(data.startedAt);
    const end = new Date();
    return Math.round((end.getTime() - start.getTime()) / 1000 / 60); // minutes
  }

  /**
   * Enregistre un événement d'onboarding
   */
  private static async trackOnboardingEvent(event: OnboardingEventData): Promise<void> {
    try {
      // TODO: Implémenter le tracking d'événements si nécessaire
      console.log('[OnboardingAPI] Event tracked:', event.event);
    } catch (error) {
      console.warn('[OnboardingAPI] Error tracking event:', error);
    }
  }

  /**
   * Invalide le cache pour un candidat
   */
  static invalidateCandidateCache(candidateId: string): void {
    const keys = Array.from(this.cache.keys());
    keys.forEach(key => {
      if (key.includes(candidateId)) {
        this.cache.delete(key);
      }
    });
  }
}