import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CandidateService, CandidateFullProfile } from '@/services/CandidateService';
import { PriceCalculator } from '@/services/PriceCalculator';
import { CandidateFormatter } from '@/services/CandidateFormatter';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook unifié pour la gestion des candidats
 * Remplace tous les hooks fragmentés existants
 */

interface UseCandidateReturn {
  // Données du candidat
  profile: CandidateFullProfile | null;
  isLoading: boolean;
  error: string | null;

  // Données formatées
  displayName: string;
  displayTitle: string;
  jobTitle: string;
  initials: string;
  availabilityStatus: ReturnType<typeof CandidateFormatter.formatAvailability>;
  qualificationStatus: ReturnType<typeof CandidateFormatter.formatQualificationStatus>;

  // Prix (TOUJOURS à la minute, sauf dailyRate pour les paramètres)
  dailyRate: number;
  minuteRate: number;
  formattedMinuteRate: string;
  formattedDailyRate: string;

  // Méthodes
  refetch: () => Promise<void>;
  updateStatus: (status: 'disponible' | 'en_pause' | 'indisponible') => Promise<boolean>;
  updateDailyRate: (newRate: number) => Promise<boolean>;

  // Helpers
  canReceiveMissions: boolean;
  isQualified: boolean;
  isAvailable: boolean;
}

export function useCandidate(candidateId?: string): UseCandidateReturn {
  const { user } = useAuth();
  const [profile, setProfile] = useState<CandidateFullProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Utiliser l'ID fourni ou celui de l'utilisateur connecté
  const effectiveCandidateId = candidateId || user?.id || null;

  // Chargement du profil
  const loadProfile = useCallback(async () => {
    if (!effectiveCandidateId) {
      setIsLoading(false);
      setError('Aucun ID de candidat disponible');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const candidateProfile = await CandidateService.getCandidateFullProfile(effectiveCandidateId);

      if (candidateProfile) {
        setProfile(candidateProfile);
      } else {
        setError('Profil candidat non trouvé');
      }
    } catch (err) {
      console.error('Erreur lors du chargement du profil:', err);
      setError('Erreur lors du chargement du profil');
    } finally {
      setIsLoading(false);
    }
  }, [effectiveCandidateId]);

  // Chargement initial et rechargement
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Mise à jour du statut
  const updateStatus = useCallback(async (
    status: 'disponible' | 'en_pause' | 'indisponible'
  ): Promise<boolean> => {
    if (!effectiveCandidateId) return false;

    const success = await CandidateService.updateCandidateStatus(effectiveCandidateId, status);

    if (success) {
      await loadProfile(); // Recharger le profil après mise à jour
    }

    return success;
  }, [effectiveCandidateId, loadProfile]);

  // Mise à jour du tarif journalier
  const updateDailyRate = useCallback(async (newRate: number): Promise<boolean> => {
    if (!effectiveCandidateId) return false;

    const success = await CandidateService.updateCandidateDailyRate(effectiveCandidateId, newRate);

    if (success) {
      await loadProfile(); // Recharger le profil après mise à jour
    }

    return success;
  }, [effectiveCandidateId, loadProfile]);

  // Calculs et formatages mémorisés
  const computedValues = useMemo(() => {
    if (!profile) {
      return {
        displayName: '',
        displayTitle: '',
        jobTitle: '',
        initials: '',
        availabilityStatus: CandidateFormatter.formatAvailability(null),
        qualificationStatus: CandidateFormatter.formatQualificationStatus(null),
        dailyRate: 0,
        minuteRate: 0,
        formattedMinuteRate: PriceCalculator.formatMinuteRate(0),
        formattedDailyRate: PriceCalculator.formatDailyRate(0),
        canReceiveMissions: false,
        isQualified: false,
        isAvailable: false
      };
    }

    // Prix
    const minuteRate = PriceCalculator.getDailyToMinuteRate(profile.daily_rate);

    // Statuts
    const availabilityStatus = CandidateFormatter.formatAvailability(profile.status);
    const qualificationStatus = CandidateFormatter.formatQualificationStatus(profile.qualification_status);

    // Conditions
    const isQualified = profile.qualification_status === 'qualified';
    const isAvailable = profile.status === 'disponible';
    const canReceiveMissions = profile.status !== 'qualification' && isQualified;

    return {
      displayName: CandidateFormatter.formatCandidateName(profile),
      displayTitle: CandidateFormatter.formatCandidateTitle(profile),
      jobTitle: CandidateFormatter.formatCandidateJob(profile),
      initials: CandidateFormatter.formatCandidateInitials(profile),
      availabilityStatus,
      qualificationStatus,
      dailyRate: profile.daily_rate,
      minuteRate,
      formattedMinuteRate: PriceCalculator.formatMinuteRate(minuteRate),
      formattedDailyRate: PriceCalculator.formatDailyRate(profile.daily_rate),
      canReceiveMissions,
      isQualified,
      isAvailable
    };
  }, [profile]);

  // Subscription temps réel pour les mises à jour du profil
  useEffect(() => {
    if (!effectiveCandidateId) return;

    const channel = supabase
      .channel(`candidate_profile_${effectiveCandidateId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'candidate_profiles',
          filter: `id=eq.${effectiveCandidateId}`
        },
        (payload) => {
          console.log('Mise à jour du profil candidat détectée:', payload);
          loadProfile();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [effectiveCandidateId, loadProfile]);

  return {
    // Données
    profile,
    isLoading,
    error,

    // Formatage
    ...computedValues,

    // Méthodes
    refetch: loadProfile,
    updateStatus,
    updateDailyRate
  };
}

/**
 * Hook pour rechercher des candidats
 */
export function useCandidateSearch(criteria: Parameters<typeof CandidateService.searchCandidates>[0]) {
  const [candidates, setCandidates] = useState<CandidateFullProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const results = await CandidateService.searchCandidates(criteria);
      setCandidates(results);
    } catch (err) {
      console.error('Erreur lors de la recherche:', err);
      setError('Erreur lors de la recherche de candidats');
    } finally {
      setIsLoading(false);
    }
  }, [criteria]);

  useEffect(() => {
    search();
  }, [search]);

  // Formatage des résultats pour l'affichage
  const formattedCandidates = useMemo(() => {
    return candidates.map(candidate => ({
      ...candidate,
      displayName: CandidateFormatter.formatCandidateName(candidate),
      displayTitle: CandidateFormatter.formatCandidateTitle(candidate),
      minuteRate: PriceCalculator.getDailyToMinuteRate(candidate.daily_rate),
      formattedMinuteRate: PriceCalculator.formatMinuteRate(
        PriceCalculator.getDailyToMinuteRate(candidate.daily_rate)
      )
    }));
  }, [candidates]);

  return {
    candidates: formattedCandidates,
    isLoading,
    error,
    refetch: search
  };
}

/**
 * Hook pour obtenir les candidats disponibles pour un métier
 */
export function useAvailableCandidates(profileId: string) {
  return useCandidateSearch({
    profile_id: profileId,
    status: ['disponible']
  });
}

/**
 * Hook pour calculer le budget d'une équipe
 */
export function useTeamBudget(candidateIds: string[]) {
  const [teamData, setTeamData] = useState<{
    totalDailyRate: number;
    totalMinuteRate: number;
    averageDailyRate: number;
    averageMinuteRate: number;
    formattedTotal: string;
    formattedAverage: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!candidateIds || candidateIds.length === 0) {
      setTeamData(null);
      return;
    }

    const loadTeamData = async () => {
      setIsLoading(true);
      try {
        const profiles = await Promise.all(
          candidateIds.map(id => CandidateService.getCandidateFullProfile(id))
        );

        const dailyRates = profiles
          .filter(p => p !== null)
          .map(p => p!.daily_rate);

        const teamStats = PriceCalculator.calculateTeamAverageRate(dailyRates);

        setTeamData({
          ...teamStats,
          formattedTotal: PriceCalculator.formatMinuteRate(teamStats.totalMinuteRate),
          formattedAverage: PriceCalculator.formatMinuteRate(teamStats.averageMinuteRate)
        });
      } catch (error) {
        console.error('Erreur lors du calcul du budget équipe:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTeamData();
  }, [candidateIds]);

  return { teamData, isLoading };
}