/**
 * Provider d'expertises pour l'IA
 * Charge et expose les données métiers/expertises depuis la base
 */

import { supabase } from '@/integrations/supabase/client';

export interface HRProfile {
  id: string;
  name: string;
  base_price: number;
  category_id?: string;
  is_active?: boolean; // Optionnel car n'existe pas dans la base
}

export interface HRExpertise {
  id: string;
  name: string;
  profile_id: string;
}

export interface HRLanguage {
  id: string;
  name: string;
}

export type HRSeniority = 'junior' | 'intermediate' | 'senior';

class ExpertiseProvider {
  private profiles: HRProfile[] = [];
  private expertises: Map<string, HRExpertise[]> = new Map();
  private languages: HRLanguage[] = [];
  private validSeniorities: HRSeniority[] = ['junior', 'intermediate', 'senior'];
  private loaded = false;

  /**
   * Charge toutes les données depuis la base
   */
  async loadData(): Promise<void> {
    if (this.loaded) return;

    try {
      // Charger les métiers (syntaxe correcte pour Supabase)
      const { data: profilesData, error: profilesError } = await supabase
        .from('hr_profiles')
        .select('*')
        .order('name', { ascending: true });
      
      if (profilesError) {
        console.error('Erreur chargement des métiers:', profilesError);
      }
      
      this.profiles = profilesData || [];
      console.log(`📚 ${this.profiles.length} métiers chargés`);
      
      // Vérifier l'intégrité des données
      const invalidProfiles = this.profiles.filter(p => !p || !p.name);
      if (invalidProfiles.length > 0) {
        console.warn(`⚠️ ${invalidProfiles.length} métiers avec données manquantes:`, invalidProfiles);
      }

      // Charger les expertises par métier via la table de jointure
      for (const profile of this.profiles) {
        const { data: profileExpertisesData, error } = await supabase
          .from('hr_profile_expertises')
          .select(`
            expertise_id,
            hr_expertises (
              id,
              name,
              category_id,
              cost_percentage
            )
          `)
          .eq('profile_id', profile.id);
        
        if (error) {
          console.warn(`Erreur lors du chargement des expertises pour ${profile.name}:`, error.message);
          // Fallback : charger directement les expertises de la catégorie
          const { data: fallbackData } = await supabase
            .from('hr_expertises')
            .select('*')
            .eq('category_id', profile.category_id);
          
          this.expertises.set(profile.id, fallbackData || []);
        } else {
          // Extraire les expertises de la jointure
          const expertisesData = profileExpertisesData?.map(pe => pe.hr_expertises).filter(Boolean) || [];
          this.expertises.set(profile.id, expertisesData);
        }
      }
      console.log(`🎯 Expertises chargées pour ${this.expertises.size} métiers`);

      // Charger les langues
      const { data: languagesData } = await supabase
        .from('hr_languages')
        .select('*')
        .order('name', { ascending: true });
      
      this.languages = languagesData || [];
      console.log(`🌍 ${this.languages.length} langues chargées`);

      this.loaded = true;
    } catch (error) {
      console.error('Erreur chargement données:', error);
      throw error;
    }
  }

  /**
   * Retourne tous les métiers disponibles
   */
  getProfiles(): HRProfile[] {
    return this.profiles;
  }

  /**
   * Trouve un métier par nom (flexible)
   */
  findProfile(name: string): HRProfile | null {
    if (!name) {
      console.warn('❌ findProfile appelé avec un nom invalide:', name);
      return null;
    }
    const normalized = name.toLowerCase().trim();
    
    // 1. Recherche exacte d'abord
    let profile = this.profiles.find(p => {
      if (!p || !p.name) {
        console.warn('⚠️ Profil invalide dans la base:', p);
        return false;
      }
      const pName = p.name.toLowerCase();
      return pName === normalized;
    });
    
    if (profile) return profile;
    
    // 2. Recherche partielle - trouve tous les métiers correspondants
    const matchingProfiles = this.profiles.filter(p => {
      if (!p || !p.name) return false;
      const pName = p.name.toLowerCase();
      return pName.includes(normalized);
    });
    
    // Si plusieurs métiers correspondent, retourner null pour forcer une clarification
    if (matchingProfiles.length > 1) {
      console.log(`🔍 Plusieurs métiers correspondent à "${name}":`);
      matchingProfiles.forEach(p => console.log(`  - ${p.name}`));
      return null; // Force la validation à échouer et suggérer les options
    }
    
    // Si un seul métier correspond, le retourner
    if (matchingProfiles.length === 1) {
      return matchingProfiles[0];
    }
    
    return null;
  }
  
  /**
   * Trouve tous les métiers correspondant à un terme de recherche
   */
  findMatchingProfiles(searchTerm: string): HRProfile[] {
    if (!searchTerm) return [];
    const normalized = searchTerm.toLowerCase().trim();
    
    return this.profiles.filter(p => {
      if (!p || !p.name) return false;
      const pName = p.name.toLowerCase();
      return pName.includes(normalized);
    });
  }

  /**
   * Retourne les expertises d'un métier
   */
  getExpertises(profileId: string): HRExpertise[] {
    return this.expertises.get(profileId) || [];
  }

  /**
   * Trouve une expertise par nom dans un métier
   */
  findExpertise(profileId: string, name: string): HRExpertise | null {
    const profileExpertises = this.getExpertises(profileId);
    const normalized = name.toLowerCase().trim();
    
    return profileExpertises.find(e => 
      e.name.toLowerCase() === normalized ||
      e.name.toLowerCase().includes(normalized) ||
      normalized.includes(e.name.toLowerCase())
    ) || null;
  }

  /**
   * Suggère des expertises proches
   */
  suggestExpertises(profileId: string, requestedExpertise: string): HRExpertise[] {
    const profileExpertises = this.getExpertises(profileId);
    const normalized = requestedExpertise.toLowerCase().trim();
    
    // Calcul de similarité simple basé sur les mots communs
    const scored = profileExpertises.map(expertise => {
      const expertiseName = expertise.name.toLowerCase();
      const words = normalized.split(/\s+/);
      let score = 0;
      
      // Points pour mots exacts
      words.forEach(word => {
        if (expertiseName.includes(word)) score += 2;
      });
      
      // Points pour lettres communes
      const commonChars = [...normalized].filter(char => 
        expertiseName.includes(char)
      ).length;
      score += commonChars * 0.1;
      
      return { expertise, score };
    });
    
    // Retourner les 3 meilleures suggestions
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(s => s.expertise);
  }

  /**
   * Retourne toutes les langues disponibles
   */
  getLanguages(): HRLanguage[] {
    return this.languages;
  }

  /**
   * Trouve une langue par nom
   */
  findLanguage(name: string): HRLanguage | null {
    const normalized = name.toLowerCase().trim();
    return this.languages.find(l => 
      l.name.toLowerCase() === normalized
    ) || null;
  }

  /**
   * Valide et normalise une séniorité
   */
  normalizeSeniority(seniority: string): HRSeniority {
    const mapping: Record<string, HRSeniority> = {
      'junior': 'junior',
      'débutant': 'junior',
      'medior': 'intermediate',
      'médior': 'intermediate',
      'intermédiaire': 'intermediate',
      'intermediate': 'intermediate',
      'confirmé': 'intermediate',
      'senior': 'senior',
      'expert': 'senior',
      'principal': 'senior',
      'lead': 'senior'
    };
    
    const normalized = seniority.toLowerCase().trim();
    const result = mapping[normalized];
    
    if (!result) {
      console.warn(`⚠️ Séniorité "${seniority}" non reconnue, utilisation de "intermediate" par défaut`);
      return 'intermediate';
    }
    
    console.log(`✅ Séniorité "${seniority}" normalisée en "${result}"`);
    return result;
  }

  /**
   * Retourne les séniorités valides
   */
  getValidSeniorities(): HRSeniority[] {
    return this.validSeniorities;
  }

  /**
   * Génère un résumé des données disponibles pour l'IA
   */
  getDataSummary(): string {
    const summary = [`
=== DONNÉES DISPONIBLES DANS LE SYSTÈME ===

MÉTIERS (${this.profiles.length}):
${this.profiles.map(p => `- ${p.name}`).join('\n')}

SÉNIORITÉS VALIDES:
- junior (aussi: débutant)
- intermediate (aussi: medior, confirmé)
- senior (aussi: expert, lead, principal)

LANGUES DISPONIBLES:
${this.languages.map(l => `- ${l.name}`).join('\n')}
`];

    // Ajouter les expertises par métier
    this.profiles.forEach(profile => {
      const expertises = this.getExpertises(profile.id);
      if (expertises.length > 0) {
        summary.push(`
EXPERTISES pour ${profile.name}:
${expertises.map(e => `- ${e.name}`).join('\n')}`);
      }
    });

    return summary.join('\n');
  }

  /**
   * Valide un profil complet avant création
   */
  validateProfile(data: {
    profession: string;
    seniority: string;
    languages?: string[];
    expertises?: string[];
  }): {
    valid: boolean;
    profile?: HRProfile;
    normalizedSeniority?: HRSeniority;
    validLanguages?: HRLanguage[];
    validExpertises?: HRExpertise[];
    errors: string[];
    suggestions?: {
      profiles?: HRProfile[];
      expertises?: HRExpertise[];
    };
  } {
    const errors: string[] = [];
    const suggestions: any = {};

    // Vérifier le métier
    const profile = this.findProfile(data.profession);
    if (!profile) {
      errors.push(`Métier "${data.profession}" non trouvé`);
      
      // Suggérer des métiers proches
      const similarProfiles = this.profiles.filter(p => {
        if (!p || !p.name || !data.profession) return false;
        const searchTerm = data.profession.toLowerCase();
        const pName = p.name.toLowerCase();
        return pName.includes(searchTerm);
      }).slice(0, 3);
      
      if (similarProfiles.length > 0) {
        suggestions.profiles = similarProfiles;
      }
      
      return { valid: false, errors, suggestions };
    }

    // Normaliser la séniorité
    const normalizedSeniority = this.normalizeSeniority(data.seniority);

    // Valider les langues
    const validLanguages: HRLanguage[] = [];
    if (data.languages) {
      for (const lang of data.languages) {
        const language = this.findLanguage(lang);
        if (language) {
          validLanguages.push(language);
        } else {
          errors.push(`Langue "${lang}" non trouvée`);
        }
      }
    }

    // Valider les expertises
    const validExpertises: HRExpertise[] = [];
    const suggestedExpertises: HRExpertise[] = [];
    
    if (data.expertises) {
      for (const exp of data.expertises) {
        const expertise = this.findExpertise(profile.id, exp);
        if (expertise) {
          validExpertises.push(expertise);
        } else {
          errors.push(`Expertise "${exp}" non trouvée pour ${profile.name}`);
          
          // Suggérer des expertises proches
          const suggested = this.suggestExpertises(profile.id, exp);
          suggestedExpertises.push(...suggested);
        }
      }
      
      if (suggestedExpertises.length > 0) {
        suggestions.expertises = [...new Set(suggestedExpertises)]; // Dédupliquer
      }
    }

    return {
      valid: errors.length === 0,
      profile,
      normalizedSeniority,
      validLanguages,
      validExpertises,
      errors,
      suggestions: Object.keys(suggestions).length > 0 ? suggestions : undefined
    };
  }
}

// Singleton
export const expertiseProvider = new ExpertiseProvider();

/**
 * Génère un prompt pour l'IA avec toutes les expertises disponibles
 * Cette fonction est utilisée par useRealtimeAssistant pour configurer l'IA
 */
export async function generateExpertisePrompt(): Promise<string> {
  await expertiseProvider.loadData();
  return expertiseProvider.getDataSummary();
}