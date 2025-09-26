import { supabase } from '@/integrations/supabase/client';

/**
 * Service centralisé pour la gestion des candidats
 * Unifie toutes les méthodes de récupération et traitement des données candidats
 */

export interface CandidateProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  daily_rate: number;
  seniority: 'junior' | 'confirmé' | 'senior' | 'expert';
  status: 'qualification' | 'disponible' | 'en_pause' | 'indisponible';
  qualification_status?: string | null;
  profile_id?: string | null;
  hr_profile?: {
    id: string;
    name: string; // Métier
  } | null;
}

export interface CandidateExpertise {
  id: string;
  name: string;
}

export interface CandidateLanguage {
  id: string;
  name: string;
}

export interface CandidateFullProfile extends CandidateProfile {
  expertises: CandidateExpertise[];
  languages: CandidateLanguage[];
  projects_count: number;
  qualification_score?: number;
  hr_profile_id?: string | null;
  seniority_level?: string | null;
}

export interface CandidateSearchCriteria {
  profile_id?: string;       // Métier recherché
  seniority?: string[];       // Niveaux de séniorité acceptés
  expertises?: string[];      // Expertises requises
  languages?: string[];       // Langues requises
  min_daily_rate?: number;    // Tarif journalier minimum
  max_daily_rate?: number;    // Tarif journalier maximum
  status?: string[];          // Statuts acceptés
  search_text?: string;       // Recherche textuelle (prénom, métier)
}

export class CandidateService {
  /**
   * Récupère le profil complet d'un candidat avec toutes ses relations
   */
  static async getCandidateFullProfile(candidateId: string): Promise<CandidateFullProfile | null> {
    try {
      // Récupération du profil de base
      const { data: profile, error: profileError } = await supabase
        .from('candidate_profiles')
        .select('*')
        .eq('id', candidateId)
        .single();

      if (profileError || !profile) {
        console.error('Error fetching candidate profile:', profileError);
        return null;
      }

      // Récupération du métier (hr_profile) si profile_id existe
      let hrProfile = null;
      if (profile.profile_id) {
        const { data: hrProfileData } = await supabase
          .from('hr_profiles')
          .select('id, name')
          .eq('id', profile.profile_id)
          .single();

        hrProfile = hrProfileData;
      }

      // Récupération des expertises
      const { data: expertisesData } = await supabase
        .from('candidate_expertises')
        .select('hr_expertises(id, name)')
        .eq('candidate_id', candidateId);

      const expertises = expertisesData?.map(e => ({
        id: e.hr_expertises?.id,
        name: e.hr_expertises?.name
      })).filter(e => e.id && e.name) as CandidateExpertise[] || [];

      // Récupération des langues
      const { data: languagesData } = await supabase
        .from('candidate_languages')
        .select('hr_languages(id, name)')
        .eq('candidate_id', candidateId);

      const languages = languagesData?.map(l => ({
        id: l.hr_languages?.id,
        name: l.hr_languages?.name
      })).filter(l => l.id && l.name) as CandidateLanguage[] || [];

      // Récupération du nombre de projets
      const { count: projectsCount } = await supabase
        .from('hr_resource_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('candidate_id', candidateId)
        .eq('booking_status', 'accepted');

      // Récupération du score de qualification le plus récent
      const { data: qualificationResult } = await supabase
        .from('candidate_qualification_results')
        .select('score')
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        ...profile,
        hr_profile: hrProfile,
        hr_profile_id: profile.profile_id,
        seniority_level: profile.seniority,
        expertises,
        languages,
        projects_count: projectsCount || 0,
        qualification_score: qualificationResult?.score
      };
    } catch (error) {
      console.error('Error in getCandidateFullProfile:', error);
      return null;
    }
  }

  /**
   * Recherche des candidats selon des critères spécifiques
   */
  static async searchCandidates(criteria: CandidateSearchCriteria): Promise<CandidateFullProfile[]> {
    try {
      // Construction de la requête de base
      let query = supabase
        .from('candidate_profiles')
        .select('*');

      // Filtres de base
      if (criteria.profile_id) {
        query = query.eq('profile_id', criteria.profile_id);
      }

      if (criteria.seniority && criteria.seniority.length > 0) {
        query = query.in('seniority', criteria.seniority);
      }

      if (criteria.status && criteria.status.length > 0) {
        query = query.in('status', criteria.status);
      }

      if (criteria.min_daily_rate) {
        query = query.gte('daily_rate', criteria.min_daily_rate);
      }

      if (criteria.max_daily_rate) {
        query = query.lte('daily_rate', criteria.max_daily_rate);
      }

      // Recherche textuelle (prénom ou métier)
      if (criteria.search_text) {
        query = query.or(`first_name.ilike.%${criteria.search_text}%`);
      }

      const { data: candidates, error } = await query;

      if (error) {
        console.error('Error searching candidates:', error);
        return [];
      }

      if (!candidates || candidates.length === 0) {
        return [];
      }

      // Pour chaque candidat, récupérer les données complètes
      const fullProfiles: CandidateFullProfile[] = [];

      for (const candidate of candidates) {
        let matchesCriteria = true;

        // Vérification des expertises si critères fournis
        if (criteria.expertises && criteria.expertises.length > 0) {
          const { data: expertisesData } = await supabase
            .from('candidate_expertises')
            .select('hr_expertises(name)')
            .eq('candidate_id', candidate.id);

          const candidateExpertises = expertisesData?.map(e => e.hr_expertises?.name).filter(Boolean) || [];
          const hasRequiredExpertises = criteria.expertises.every(req => candidateExpertises.includes(req));

          if (!hasRequiredExpertises) {
            matchesCriteria = false;
          }
        }

        // Vérification des langues si critères fournis
        if (matchesCriteria && criteria.languages && criteria.languages.length > 0) {
          const { data: languagesData } = await supabase
            .from('candidate_languages')
            .select('hr_languages(name)')
            .eq('candidate_id', candidate.id);

          const candidateLanguages = languagesData?.map(l => l.hr_languages?.name).filter(Boolean) || [];
          const hasRequiredLanguages = criteria.languages.every(req => candidateLanguages.includes(req));

          if (!hasRequiredLanguages) {
            matchesCriteria = false;
          }
        }

        // Si le candidat correspond aux critères, récupérer son profil complet
        if (matchesCriteria) {
          const fullProfile = await this.getCandidateFullProfile(candidate.id);
          if (fullProfile) {
            fullProfiles.push(fullProfile);
          }
        }
      }

      return fullProfiles;
    } catch (error) {
      console.error('Error in searchCandidates:', error);
      return [];
    }
  }

  /**
   * Récupère tous les candidats disponibles pour un métier donné
   */
  static async getAvailableCandidatesForProfile(profileId: string): Promise<CandidateFullProfile[]> {
    return this.searchCandidates({
      profile_id: profileId,
      status: ['disponible']
    });
  }

  /**
   * Met à jour le statut d'un candidat
   */
  static async updateCandidateStatus(
    candidateId: string,
    status: 'qualification' | 'disponible' | 'en_pause' | 'indisponible'
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('candidate_profiles')
        .update({ status })
        .eq('id', candidateId);

      if (error) {
        console.error('Error updating candidate status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateCandidateStatus:', error);
      return false;
    }
  }

  /**
   * Met à jour le tarif journalier d'un candidat
   */
  static async updateCandidateDailyRate(
    candidateId: string,
    dailyRate: number
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('candidate_profiles')
        .update({ daily_rate: dailyRate })
        .eq('id', candidateId);

      if (error) {
        console.error('Error updating candidate daily rate:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateCandidateDailyRate:', error);
      return false;
    }
  }

  /**
   * Vérifie si un candidat peut recevoir des missions
   */
  static async canReceiveMissions(candidateId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('candidate_profiles')
        .select('status, qualification_status')
        .eq('id', candidateId)
        .single();

      if (error || !data) {
        return false;
      }

      // Un candidat peut recevoir des missions s'il n'est pas en qualification
      // et s'il est qualifié
      return data.status !== 'qualification' &&
             (data.qualification_status === 'qualified' || data.qualification_status === null);
    } catch (error) {
      console.error('Error in canReceiveMissions:', error);
      return false;
    }
  }
}