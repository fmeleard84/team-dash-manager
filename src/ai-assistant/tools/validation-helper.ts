/**
 * Helper pour valider les paramètres avant la création d'équipe
 */

import { expertiseProvider } from './expertise-provider';

// Séniorités autorisées (comme dans ReactFlow)
const VALID_SENIORITIES = ['junior', 'intermediate', 'senior'];

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  suggestions?: {
    profession?: string;
    expertises?: string[];
    languages?: string[];
  };
}

export interface ProfileToValidate {
  profession: string;
  seniority: string;
  skills?: string[];
  languages?: string[];
}

/**
 * Valide un profil avant la création
 */
export async function validateProfile(profile: ProfileToValidate): Promise<ValidationResult> {
  const errors: string[] = [];
  const suggestions: any = {};
  
  // Charger le provider d'expertises
  await expertiseProvider.loadData();

  // 1. Valider le métier
  if (!profile.profession) {
    errors.push('Le métier est requis');
  } else {
    const hrProfile = expertiseProvider.findProfile(profile.profession);
    if (!hrProfile) {
      errors.push(`Le métier "${profile.profession}" n'existe pas dans notre système`);
      
      // Suggérer des métiers proches
      const matchingProfiles = expertiseProvider.findMatchingProfiles(profile.profession);
      if (matchingProfiles.length > 0) {
        suggestions.profession = matchingProfiles[0].label || matchingProfiles[0].name;
        errors.push(`Suggestion: utilisez "${matchingProfiles[0].label || matchingProfiles[0].name}" à la place`);
      }
    } else {
      // 2. Valider les expertises pour ce métier
      if (profile.skills && profile.skills.length > 0) {
        const availableExpertises = expertiseProvider.getExpertises(hrProfile.id);
        const expertiseNames = availableExpertises.map(e => e.name.toLowerCase());
        
        const invalidSkills = profile.skills.filter(skill => 
          !expertiseNames.includes(skill.toLowerCase())
        );
        
        if (invalidSkills.length > 0) {
          errors.push(`Expertises invalides pour ${hrProfile.label || hrProfile.name}: ${invalidSkills.join(', ')}`);
          suggestions.expertises = availableExpertises.slice(0, 3).map(e => e.name);
        }
      }
    }
  }

  // 3. Valider la séniorité
  if (!profile.seniority) {
    errors.push('La séniorité est requise');
  } else if (!VALID_SENIORITIES.includes(profile.seniority.toLowerCase())) {
    errors.push(`Séniorité invalide: "${profile.seniority}". Utilisez: junior, intermediate ou senior`);
  }

  // 4. Valider les langues
  if (profile.languages && profile.languages.length > 0) {
    const availableLanguages = expertiseProvider.getLanguages();
    const languageNames = availableLanguages.map(l => l.name.toLowerCase());
    
    const invalidLanguages = profile.languages.filter(lang => 
      !languageNames.includes(lang.toLowerCase())
    );
    
    if (invalidLanguages.length > 0) {
      errors.push(`Langues invalides: ${invalidLanguages.join(', ')}`);
      suggestions.languages = availableLanguages.slice(0, 3).map(l => l.name);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    suggestions: Object.keys(suggestions).length > 0 ? suggestions : undefined
  };
}

/**
 * Valide une équipe complète
 */
export async function validateTeam(profiles: ProfileToValidate[]): Promise<{
  isValid: boolean;
  profileErrors: { index: number; errors: string[] }[];
  suggestions: any[];
}> {
  const profileErrors: { index: number; errors: string[] }[] = [];
  const suggestions: any[] = [];

  for (let i = 0; i < profiles.length; i++) {
    const result = await validateProfile(profiles[i]);
    if (!result.isValid) {
      profileErrors.push({
        index: i,
        errors: result.errors
      });
      if (result.suggestions) {
        suggestions.push({
          index: i,
          ...result.suggestions
        });
      }
    }
  }

  return {
    isValid: profileErrors.length === 0,
    profileErrors,
    suggestions
  };
}

/**
 * Normalise un profil avec les valeurs correctes
 */
export async function normalizeProfile(profile: ProfileToValidate): Promise<ProfileToValidate | null> {
  // Utiliser l'instance importée
  await expertiseProvider.loadData();

  // Trouver le métier correct
  const hrProfile = expertiseProvider.findProfile(profile.profession);
  if (!hrProfile) {
    const matching = expertiseProvider.findMatchingProfiles(profile.profession);
    if (matching.length === 0) return null;
    profile.profession = matching[0].label || matching[0].name;
  } else {
    profile.profession = hrProfile.label || hrProfile.name;
  }

  // Normaliser la séniorité
  if (profile.seniority) {
    const normalizedSeniority = profile.seniority.toLowerCase();
    // Mapping pour gérer les variations courantes
    const seniorityMap: Record<string, string> = {
      'junior': 'junior',
      'débutant': 'junior',
      'intermediate': 'intermediate',
      'intermédiaire': 'intermediate',
      'medior': 'intermediate',
      'confirmé': 'intermediate',
      'senior': 'senior',
      'expert': 'senior',
      'principal': 'senior'
    };
    
    profile.seniority = seniorityMap[normalizedSeniority] || 'intermediate'; // Défaut
  } else {
    profile.seniority = 'intermediate'; // Défaut si non spécifié
  }

  // Normaliser les langues
  if (profile.languages && profile.languages.length > 0) {
    const availableLanguages = expertiseProvider.getLanguages();
    profile.languages = profile.languages
      .map(lang => {
        const found = availableLanguages.find(l => 
          l.name.toLowerCase() === lang.toLowerCase()
        );
        return found ? found.name : null;
      })
      .filter(Boolean) as string[];
  }

  return profile;
}