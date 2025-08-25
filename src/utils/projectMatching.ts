import { supabase } from '@/integrations/supabase/client';

export interface ProjectMatch {
  id: string;
  title: string;
  description: string;
  client_budget: number;
  project_date: string;
  status: string;
  match_score: number;
  match_reasons: string[];
  client_name?: string;
  required_expertises: string[];
  estimated_duration?: number;
}

export interface CandidateSkills {
  profileId: string;
  profileName: string;
  expertiseIds: string[];
  expertiseNames: string[];
  languageIds: string[];
  testScore?: number;
  experience_level?: string;
}

export class ProjectMatchingEngine {
  
  /**
   * Trouve les projets correspondant au profil d'un candidat
   */
  static async findMatchingProjects(
    candidateId: string,
    candidateSkills: CandidateSkills,
    limit: number = 10
  ): Promise<ProjectMatch[]> {
    try {
      // 1. Récupérer les projets en attente
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select(`
          id,
          title,
          description,
          client_budget,
          project_date,
          status,
          client_id,
          profiles(first_name, last_name)
        `)
        .in('status', ['pause', 'pending', 'draft'])
        .order('created_at', { ascending: false });

      if (projectsError) {
        console.error('Error fetching projects:', projectsError);
        return [];
      }

      if (!projects || projects.length === 0) {
        return [];
      }

      // 2. Pour chaque projet, récupérer les assignments et calculer le score
      const projectMatches: ProjectMatch[] = [];

      for (const project of projects) {
        // Récupérer les assignments du projet
        const { data: assignments } = await supabase
          .from('hr_resource_assignments')
          .select(`
            id,
            profile_id,
            booking_status,
            hr_profiles(name),
            required_expertises:hr_assignment_expertises(
              hr_expertises(id, name)
            )
          `)
          .eq('project_id', project.id)
          .eq('booking_status', 'pending');

        if (assignments && assignments.length > 0) {
          const matchResult = this.calculateProjectMatch(
            project,
            assignments,
            candidateSkills
          );

          if (matchResult.match_score > 0) {
            projectMatches.push(matchResult);
          }
        }
      }

      // 3. Trier par score décroissant et retourner les meilleurs matches
      return projectMatches
        .sort((a, b) => b.match_score - a.match_score)
        .slice(0, limit);

    } catch (error) {
      console.error('Error in findMatchingProjects:', error);
      return [];
    }
  }

  /**
   * Calcule le score de correspondance entre un projet et un candidat
   */
  private static calculateProjectMatch(
    project: any,
    assignments: any[],
    candidateSkills: CandidateSkills
  ): ProjectMatch {
    let totalScore = 0;
    const matchReasons: string[] = [];
    const requiredExpertises: string[] = [];

    // 1. Score basé sur la correspondance du profil métier
    const hasMatchingProfile = assignments.some(assignment => 
      assignment.profile_id === candidateSkills.profileId
    );

    if (hasMatchingProfile) {
      totalScore += 30;
      matchReasons.push(`Profil métier correspondant: ${candidateSkills.profileName}`);
    }

    // 2. Score basé sur les expertises requises
    assignments.forEach(assignment => {
      if (assignment.required_expertises) {
        assignment.required_expertises.forEach((reqExp: any) => {
          if (reqExp.hr_expertises) {
            const expertiseName = reqExp.hr_expertises.name;
            requiredExpertises.push(expertiseName);

            if (candidateSkills.expertiseNames.includes(expertiseName)) {
              totalScore += 15;
              matchReasons.push(`Compétence requise: ${expertiseName}`);
            }
          }
        });
      }
    });

    // 3. Bonus pour l'expérience et le score de test
    if (candidateSkills.testScore && candidateSkills.testScore > 70) {
      totalScore += 10;
      matchReasons.push(`Score de test élevé: ${candidateSkills.testScore}%`);
    }

    // 4. Bonus budget (projets avec budget plus élevé = plus attractifs)
    if (project.client_budget) {
      if (project.client_budget > 5000) {
        totalScore += 5;
        matchReasons.push('Budget attractif');
      }
    }

    // 5. Bonus urgence (projets récents ou avec date proche)
    const projectDate = new Date(project.project_date);
    const now = new Date();
    const daysDiff = Math.abs((projectDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
    
    if (daysDiff <= 30) {
      totalScore += 5;
      matchReasons.push('Démarrage imminent');
    }

    // 6. Malus si aucune correspondance d'expertise
    const hasAnyExpertiseMatch = candidateSkills.expertiseNames.some(skill =>
      requiredExpertises.includes(skill)
    );

    if (!hasAnyExpertiseMatch && !hasMatchingProfile) {
      totalScore = Math.max(0, totalScore - 20);
    }

    return {
      id: project.id,
      title: project.title,
      description: project.description,
      client_budget: project.client_budget,
      project_date: project.project_date,
      status: project.status,
      match_score: totalScore,
      match_reasons: matchReasons,
      client_name: project.profiles ? 
        `${project.profiles.first_name} ${project.profiles.last_name}` : 
        'Client',
      required_expertises: [...new Set(requiredExpertises)]
    };
  }

  /**
   * Obtient les compétences détaillées d'un candidat
   */
  static async getCandidateSkills(candidateId: string): Promise<CandidateSkills | null> {
    try {
      // Récupérer le profil candidat
      const { data: candidate, error: candidateError } = await supabase
        .from('candidate_profiles')
        .select(`
          id,
          profile_id,
          qualification_status,
          hr_profiles(name)
        `)
        .eq('id', candidateId)
        .single();

      if (candidateError || !candidate) {
        console.error('Error fetching candidate:', candidateError);
        return null;
      }

      // Récupérer les expertises du candidat
      const { data: expertises, error: expertisesError } = await supabase
        .from('candidate_expertises')
        .select(`
          hr_expertises(id, name)
        `)
        .eq('candidate_id', candidateId);

      if (expertisesError) {
        console.error('Error fetching expertises:', expertisesError);
      }

      // Récupérer les langues du candidat
      const { data: languages, error: languagesError } = await supabase
        .from('candidate_languages')
        .select(`
          hr_languages(id, name)
        `)
        .eq('candidate_id', candidateId);

      if (languagesError) {
        console.error('Error fetching languages:', languagesError);
      }

      // Récupérer le score de test le plus récent
      const { data: testResult } = await supabase
        .from('candidate_qualification_results')
        .select('score')
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const expertiseIds = expertises?.map(e => e.hr_expertises?.id).filter(Boolean) || [];
      const expertiseNames = expertises?.map(e => e.hr_expertises?.name).filter(Boolean) || [];
      const languageIds = languages?.map(l => l.hr_languages?.id).filter(Boolean) || [];

      return {
        profileId: candidate.profile_id,
        profileName: candidate.hr_profiles?.name || 'Profil non défini',
        expertiseIds,
        expertiseNames,
        languageIds,
        testScore: testResult?.score
      };

    } catch (error) {
      console.error('Error in getCandidateSkills:', error);
      return null;
    }
  }

  /**
   * Génère des recommandations personnalisées pour améliorer les matches
   */
  static generateImprovementSuggestions(
    candidateSkills: CandidateSkills,
    availableProjects: ProjectMatch[]
  ): string[] {
    const suggestions: string[] = [];
    
    // Analyser les compétences manquantes dans les projets disponibles
    const allRequiredSkills = new Set<string>();
    availableProjects.forEach(project => {
      project.required_expertises.forEach(skill => allRequiredSkills.add(skill));
    });

    const missingSkills = Array.from(allRequiredSkills).filter(
      skill => !candidateSkills.expertiseNames.includes(skill)
    );

    if (missingSkills.length > 0) {
      suggestions.push(
        `Acquérir ces compétences pour plus d'opportunités: ${missingSkills.slice(0, 3).join(', ')}`
      );
    }

    if (!candidateSkills.testScore || candidateSkills.testScore < 70) {
      suggestions.push('Améliorer le score au test de compétences pour être plus attractif');
    }

    if (candidateSkills.expertiseNames.length < 3) {
      suggestions.push('Ajouter plus de compétences à votre profil');
    }

    return suggestions;
  }
}