import { CandidateProfile, CandidateFullProfile } from './CandidateService';

/**
 * Service de formatage unifié pour l'affichage des informations candidats
 * RÈGLE IMPORTANTE : On affiche TOUJOURS Prénom + Métier, JAMAIS le nom de famille
 */

export class CandidateFormatter {
  /**
   * Formate le nom d'affichage d'un candidat
   * RÈGLE : Prénom uniquement (jamais le nom de famille)
   */
  static formatCandidateName(candidate: Partial<CandidateProfile>): string {
    if (!candidate.first_name) return 'Candidat';
    return candidate.first_name;
  }

  /**
   * Formate le titre complet d'un candidat
   * RÈGLE : Prénom + Métier
   */
  static formatCandidateTitle(candidate: Partial<CandidateProfile | CandidateFullProfile>): string {
    const firstName = this.formatCandidateName(candidate);
    const jobTitle = candidate.hr_profile?.name || 'Sans métier';
    return `${firstName} - ${jobTitle}`;
  }

  /**
   * Formate le métier seul
   */
  static formatCandidateJob(candidate: Partial<CandidateProfile | CandidateFullProfile>): string {
    return candidate.hr_profile?.name || 'Sans métier';
  }

  /**
   * Formate les initiales pour les avatars
   * RÈGLE : Première lettre du prénom uniquement
   */
  static formatCandidateInitials(candidate: Partial<CandidateProfile>): string {
    if (!candidate.first_name) return 'C';
    return candidate.first_name.charAt(0).toUpperCase();
  }

  /**
   * Formate le badge de séniorité
   */
  static formatSeniority(seniority?: string | null): string {
    if (!seniority) return 'Non défini';

    const seniorityMap: Record<string, string> = {
      'junior': 'Junior',
      'confirmé': 'Confirmé',
      'senior': 'Senior',
      'expert': 'Expert'
    };

    return seniorityMap[seniority.toLowerCase()] || seniority;
  }

  /**
   * Formate le statut de disponibilité
   */
  static formatAvailability(status?: string | null): {
    label: string;
    color: 'success' | 'warning' | 'default' | 'destructive';
    icon?: string;
  } {
    if (!status) {
      return { label: 'Non défini', color: 'default' };
    }

    const statusMap: Record<string, { label: string; color: 'success' | 'warning' | 'default' | 'destructive'; icon?: string }> = {
      'disponible': {
        label: 'Disponible',
        color: 'success',
        icon: '✅'
      },
      'en_pause': {
        label: 'En pause',
        color: 'warning',
        icon: '⏸️'
      },
      'indisponible': {
        label: 'Indisponible',
        color: 'destructive',
        icon: '🚫'
      },
      'qualification': {
        label: 'En qualification',
        color: 'default',
        icon: '📝'
      }
    };

    return statusMap[status.toLowerCase()] || { label: status, color: 'default' };
  }

  /**
   * Formate le statut de qualification
   */
  static formatQualificationStatus(status?: string | null): {
    label: string;
    color: 'success' | 'warning' | 'default' | 'destructive';
  } {
    if (!status) {
      return { label: 'Non qualifié', color: 'default' };
    }

    const statusMap: Record<string, { label: string; color: 'success' | 'warning' | 'default' | 'destructive' }> = {
      'qualified': {
        label: 'Qualifié',
        color: 'success'
      },
      'pending': {
        label: 'En attente',
        color: 'warning'
      },
      'rejected': {
        label: 'Rejeté',
        color: 'destructive'
      },
      'stand_by': {
        label: 'En stand-by',
        color: 'default'
      }
    };

    return statusMap[status.toLowerCase()] || { label: status, color: 'default' };
  }

  /**
   * Formate la liste des expertises
   */
  static formatExpertises(expertises?: Array<{ name: string }> | string[]): string {
    if (!expertises || expertises.length === 0) {
      return 'Aucune expertise';
    }

    const names = expertises.map(e => typeof e === 'string' ? e : e.name);

    if (names.length <= 2) {
      return names.join(', ');
    }

    return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
  }

  /**
   * Formate la liste des langues
   */
  static formatLanguages(languages?: Array<{ name: string }> | string[]): string {
    if (!languages || languages.length === 0) {
      return 'Aucune langue';
    }

    const names = languages.map(l => typeof l === 'string' ? l : l.name);

    if (names.length <= 3) {
      return names.join(', ');
    }

    return `${names.slice(0, 3).join(', ')} +${names.length - 3}`;
  }

  /**
   * Formate le score de qualification
   */
  static formatQualificationScore(score?: number | null): string {
    if (score === null || score === undefined) {
      return 'Non testé';
    }

    if (score >= 90) {
      return `${score}% 🏆`;
    } else if (score >= 70) {
      return `${score}% ✅`;
    } else if (score >= 50) {
      return `${score}% ⚠️`;
    } else {
      return `${score}% ❌`;
    }
  }

  /**
   * Formate un candidat pour l'affichage dans une liste/dropdown
   */
  static formatCandidateOption(candidate: Partial<CandidateProfile | CandidateFullProfile>): {
    value: string;
    label: string;
    description?: string;
  } {
    return {
      value: candidate.id || '',
      label: this.formatCandidateTitle(candidate),
      description: candidate.seniority ? this.formatSeniority(candidate.seniority) : undefined
    };
  }

  /**
   * Formate les informations complètes d'un candidat pour une card
   */
  static formatCandidateCard(candidate: CandidateFullProfile): {
    title: string;
    subtitle: string;
    badges: Array<{ label: string; color: string }>;
    details: Array<{ label: string; value: string }>;
  } {
    const availability = this.formatAvailability(candidate.status);
    const qualification = this.formatQualificationStatus(candidate.qualification_status);

    return {
      title: this.formatCandidateName(candidate),
      subtitle: this.formatCandidateJob(candidate),
      badges: [
        {
          label: this.formatSeniority(candidate.seniority),
          color: 'primary'
        },
        {
          label: availability.label,
          color: availability.color
        },
        {
          label: qualification.label,
          color: qualification.color
        }
      ],
      details: [
        {
          label: 'Expertises',
          value: this.formatExpertises(candidate.expertises)
        },
        {
          label: 'Langues',
          value: this.formatLanguages(candidate.languages)
        },
        {
          label: 'Projets',
          value: `${candidate.projects_count} projet${candidate.projects_count > 1 ? 's' : ''}`
        },
        {
          label: 'Score',
          value: this.formatQualificationScore(candidate.qualification_score)
        }
      ]
    };
  }

  /**
   * Génère une description courte pour un candidat
   */
  static generateShortDescription(candidate: Partial<CandidateFullProfile>): string {
    const parts: string[] = [];

    // Métier
    if (candidate.hr_profile?.name) {
      parts.push(candidate.hr_profile.name);
    }

    // Séniorité
    if (candidate.seniority) {
      parts.push(this.formatSeniority(candidate.seniority));
    }

    // Nombre de projets
    if (candidate.projects_count && candidate.projects_count > 0) {
      parts.push(`${candidate.projects_count} projet${candidate.projects_count > 1 ? 's' : ''}`);
    }

    return parts.join(' • ');
  }

  /**
   * Formate un candidat pour l'export CSV/Excel
   */
  static formatCandidateForExport(candidate: CandidateFullProfile): Record<string, any> {
    return {
      'Prénom': candidate.first_name,
      'Métier': this.formatCandidateJob(candidate),
      'Séniorité': this.formatSeniority(candidate.seniority),
      'Statut': this.formatAvailability(candidate.status).label,
      'Qualification': this.formatQualificationStatus(candidate.qualification_status).label,
      'Score': candidate.qualification_score || 'N/A',
      'Expertises': candidate.expertises.map(e => e.name).join(', '),
      'Langues': candidate.languages.map(l => l.name).join(', '),
      'Tarif journalier': candidate.daily_rate,
      'Email': candidate.email,
      'Téléphone': candidate.phone || 'N/A',
      'Nombre de projets': candidate.projects_count
    };
  }
}