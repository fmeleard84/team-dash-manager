/**
 * Implémentation des fonctions de composition d'équipe
 */

import { supabase } from '@/integrations/supabase/client';

export interface TeamMember {
  role: string;
  seniority: 'junior' | 'medior' | 'senior' | 'expert';
  quantity: number;
  skills?: string[];
  estimatedCost?: number;
}

export interface TeamComposition {
  Profilees: TeamMember[];
  totalCost: number;
  totalMembers: number;
  estimatedDuration?: number;
  recommendations?: string[];
}

export interface ComposeTeamResult {
  success: boolean;
  composition: TeamComposition;
  message: string;
  action?: 'open_reactflow' | 'save_draft';
  projectId?: string;
  error?: string;
}

// Templates d'équipe par type de projet
const TEAM_TEMPLATES: Record<string, TeamMember[]> = {
  web_simple: [
    { role: 'Chef de Project', seniority: 'medior', quantity: 1 },
    { role: 'Développeur Fullstack', seniority: 'medior', quantity: 2 },
    { role: 'UX/UI Designer', seniority: 'medior', quantity: 1 }
  ],
  web_medium: [
    { role: 'Chef de Project', seniority: 'senior', quantity: 1 },
    { role: 'Développeur Frontend', seniority: 'senior', quantity: 1 },
    { role: 'Développeur Frontend', seniority: 'medior', quantity: 1 },
    { role: 'Développeur Backend', seniority: 'senior', quantity: 1 },
    { role: 'Développeur Backend', seniority: 'medior', quantity: 1 },
    { role: 'UX/UI Designer', seniority: 'senior', quantity: 1 },
    { role: 'DevOps', seniority: 'medior', quantity: 1 }
  ],
  web_complex: [
    { role: 'Chef de Project', seniority: 'expert', quantity: 1 },
    { role: 'Architecte technique', seniority: 'expert', quantity: 1 },
    { role: 'Développeur Frontend', seniority: 'senior', quantity: 2 },
    { role: 'Développeur Frontend', seniority: 'medior', quantity: 2 },
    { role: 'Développeur Backend', seniority: 'senior', quantity: 2 },
    { role: 'Développeur Backend', seniority: 'medior', quantity: 1 },
    { role: 'UX/UI Designer', seniority: 'senior', quantity: 1 },
    { role: 'UX/UI Designer', seniority: 'medior', quantity: 1 },
    { role: 'DevOps', seniority: 'senior', quantity: 1 },
    { role: 'QA Engineer', seniority: 'medior', quantity: 2 }
  ],
  mobile_simple: [
    { role: 'Product Owner', seniority: 'senior', quantity: 1 },
    { role: 'Développeur Mobile', seniority: 'senior', quantity: 2, skills: ['iOS', 'Android'] },
    { role: 'UX/UI Designer', seniority: 'senior', quantity: 1 }
  ],
  mobile_medium: [
    { role: 'Product Owner', seniority: 'senior', quantity: 1 },
    { role: 'Développeur iOS', seniority: 'senior', quantity: 1 },
    { role: 'Développeur iOS', seniority: 'medior', quantity: 1 },
    { role: 'Développeur Android', seniority: 'senior', quantity: 1 },
    { role: 'Développeur Android', seniority: 'medior', quantity: 1 },
    { role: 'Développeur Backend', seniority: 'senior', quantity: 1 },
    { role: 'UX/UI Designer', seniority: 'senior', quantity: 1 },
    { role: 'QA Engineer', seniority: 'medior', quantity: 1 }
  ],
  data_simple: [
    { role: 'Chef de Project technique', seniority: 'senior', quantity: 1 },
    { role: 'Data Scientist', seniority: 'senior', quantity: 1 },
    { role: 'Data Engineer', seniority: 'medior', quantity: 1 }
  ],
  data_complex: [
    { role: 'Chef de Project technique', seniority: 'expert', quantity: 1 },
    { role: 'Data Scientist', seniority: 'expert', quantity: 1 },
    { role: 'Data Scientist', seniority: 'senior', quantity: 2 },
    { role: 'Data Engineer', seniority: 'senior', quantity: 2 },
    { role: 'MLOps Engineer', seniority: 'senior', quantity: 1 },
    { role: 'Business Analyst', seniority: 'senior', quantity: 1 },
    { role: 'Data Analyst', seniority: 'medior', quantity: 2 }
  ],
  ecommerce: [
    { role: 'Chef de Project', seniority: 'senior', quantity: 1 },
    { role: 'Développeur Frontend', seniority: 'senior', quantity: 2 },
    { role: 'Développeur Backend', seniority: 'senior', quantity: 2 },
    { role: 'UX/UI Designer', seniority: 'senior', quantity: 1 },
    { role: 'Expert E-commerce', seniority: 'senior', quantity: 1 },
    { role: 'DevOps', seniority: 'medior', quantity: 1 },
    { role: 'QA Engineer', seniority: 'medior', quantity: 1 }
  ],
  saas: [
    { role: 'Product Manager', seniority: 'senior', quantity: 1 },
    { role: 'Architecte technique', seniority: 'expert', quantity: 1 },
    { role: 'Développeur Frontend', seniority: 'senior', quantity: 2 },
    { role: 'Développeur Backend', seniority: 'senior', quantity: 3 },
    { role: 'UX/UI Designer', seniority: 'senior', quantity: 1 },
    { role: 'DevOps', seniority: 'senior', quantity: 1 },
    { role: 'Security Engineer', seniority: 'senior', quantity: 1 },
    { role: 'QA Engineer', seniority: 'medior', quantity: 2 }
  ]
};

// Coûts journaliers moyens par séniorité (en euros)
const DAILY_RATES: Record<string, number> = {
  junior: 300,
  medior: 500,
  senior: 700,
  expert: 1000
};

/**
 * Compose une équipe optimale pour un projet
 */
export async function compose_team(args: {
  project_type: string;
  project_complexity?: string;
  team_size?: number;
  budget_range?: { min?: number; max?: number };
  duration_months?: number;
  required_skills?: string[];
  languages?: string[];
  open_in_reactflow?: boolean;
}): Promise<ComposeTeamResult> {
  try {
    // Déterminer le template à utiliser
    const templateKey = `${args.project_type}_${args.project_complexity || 'medium'}`;
    let baseTeam = TEAM_TEMPLATES[templateKey] || TEAM_TEMPLATES[`${args.project_type}_simple`];
    
    if (!baseTeam) {
      // Template custom si non trouvé
      baseTeam = [
        { role: 'Chef de Project', seniority: 'senior', quantity: 1 },
        { role: 'Développeur', seniority: 'medior', quantity: 2 },
        { role: 'Designer', seniority: 'medior', quantity: 1 }
      ];
    }
    
    // Ajuster selon la taille d'équipe demandée
    let adjustedTeam = [...baseTeam];
    if (args.team_size) {
      const currentSize = baseTeam.reduce((sum, m) => sum + m.quantity, 0);
      if (args.team_size < currentSize) {
        // Réduire l'équipe en gardant les rôles essentiels
        adjustedTeam = prioritizeTeam(baseTeam, args.team_size);
      } else if (args.team_size > currentSize) {
        // Augmenter l'équipe en ajoutant des développeurs
        const toAdd = args.team_size - currentSize;
        adjustedTeam.push({
          role: 'Développeur',
          seniority: 'medior',
          quantity: toAdd
        });
      }
    }
    
    // Ajouter les compétences requises
    if (args.required_skills && args.required_skills.length > 0) {
      adjustedTeam = adjustedTeam.map(member => ({
        ...member,
        skills: args.required_skills
      }));
    }
    
    // Calculer les coûts
    const dailyCost = calculateTeamCost(adjustedTeam);
    const monthlyWorkDays = 20;
    const totalCost = dailyCost * monthlyWorkDays * (args.duration_months || 3);
    
    // Vérifier le budget
    let recommendations: string[] = [];
    if (args.budget_range) {
      if (args.budget_range.max && totalCost > args.budget_range.max) {
        recommendations.push(`⚠️ Le coût estimé (${totalCost}€) dépasse votre budget maximum`);
        recommendations.push('Considérez de réduire la taille de l\'Team ou la durée du Project');
      }
      if (args.budget_range.min && totalCost < args.budget_range.min) {
        recommendations.push('✅ Le coût est in votre Budget');
        recommendations.push('Vous pourriez Add des Resources senior pour plus de qualité');
      }
    }
    
    // Ajouter des recommandations générales
    if (!hasRole(adjustedTeam, 'Chef de Project') && !hasRole(adjustedTeam, 'Product')) {
      recommendations.push('⚠️ Considérez d\'ajouter un Chef de projet pour la coordination');
    }
    if (args.project_type === 'web' && !hasRole(adjustedTeam, 'DevOps')) {
      recommendations.push('💡 Un DevOps pourrait être utile pour l\'infrastructure');
    }
    
    const composition: TeamComposition = {
      profiles: adjustedTeam,
      totalCost: totalCost,
      totalMembers: adjustedTeam.reduce((sum, m) => sum + m.quantity, 0),
      estimatedDuration: args.duration_months,
      recommendations
    };
    
    // Si demandé, préparer l'ouverture in ReactFlow
    let action: 'open_reactflow' | 'save_draft' = args.open_in_reactflow ? 'open_reactflow' : 'save_draft';
    
    return {
      success: true,
      composition,
      message: `J'ai composé une équipe de ${composition.totalMembers} personnes pour votre projet ${args.project_type}. ` +
               `Coût estimé : ${totalCost.toLocaleString('fr-FR')}€ pour ${args.duration_months || 3} mois.`,
      action
    };
    
  } catch (error) {
    console.error('Error in compose_team:', error);
    return {
      success: false,
      composition: {
        profiles: [],
        totalCost: 0,
        totalMembers: 0
      },
      message: 'An error occurred lors de la composition de l\'équipe',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
}

/**
 * Suggère un profil spécifique pour compléter une équipe
 */
export async function suggest_team_member(args: {
  role: string;
  seniority?: string;
  skills?: string[];
  project_context?: string;
}): Promise<{
  success: boolean;
  suggestion: TeamMember;
  reasoning: string;
  alternatives?: TeamMember[];
}> {
  try {
    // Déterminer la séniorité appropriée
    const seniority = (args.seniority as TeamMember['seniority']) || 'medior';
    
    // Créer la suggestion principale
    const suggestion: TeamMember = {
      role: args.role,
      seniority: seniority,
      quantity: 1,
      skills: args.skills,
      estimatedCost: DAILY_RATES[seniority]
    };
    
    // Créer des alternatives avec différentes séniorités
    const alternatives: TeamMember[] = [];
    const seniorityLevels: TeamMember['seniority'][] = ['junior', 'medior', 'senior', 'expert'];
    
    for (const level of seniorityLevels) {
      if (level !== seniority) {
        alternatives.push({
          role: args.role,
          seniority: level,
          quantity: 1,
          skills: args.skills,
          estimatedCost: DAILY_RATES[level]
        });
      }
    }
    
    // Générer le raisonnement
    let reasoning = `Pour le rôle de ${args.role}, je recommande un profil ${seniority}`;
    
    if (args.project_context) {
      if (args.project_context.includes('startup') || args.project_context.includes('MVP')) {
        reasoning += '. Dans un contexte startup/MVP, ce niveau offre un bon équilibre coût/expertise';
      } else if (args.project_context.includes('enterprise') || args.project_context.includes('complexe')) {
        reasoning += '. Pour un projet d\'Company complexe, ce niveau garantit la qualité et l\'autonomie';
      }
    }
    
    if (args.skills && args.skills.length > 0) {
      reasoning += `. Les compétences clés requises sont : ${args.skills.join(', ')}`;
    }
    
    return {
      success: true,
      suggestion,
      reasoning,
      alternatives
    };
    
  } catch (error) {
    console.error('Error in suggest_team_member:', error);
    return {
      success: false,
      suggestion: {
        role: args.role,
        seniority: 'medior',
        quantity: 1
      },
      reasoning: 'Erreur lors de la génération de la suggestion'
    };
  }
}

// Fonctions utilitaires

function calculateTeamCost(team: TeamMember[]): number {
  return team.reduce((total, member) => {
    const rate = DAILY_RATES[member.seniority] || 500;
    return total + (rate * member.quantity);
  }, 0);
}

function hasRole(team: TeamMember[], roleKeyword: string): boolean {
  return team.some(member => member.role.toLowerCase().includes(roleKeyword.toLowerCase()));
}

function prioritizeTeam(team: TeamMember[], targetSize: number): TeamMember[] {
  // Prioriser : Chef de projet > Développeurs > Designers > Autres
  const priorityMap: Record<string, number> = {
    'Chef de projet': 1,
    'Product': 1,
    'Développeur': 2,
    'Designer': 3,
    'DevOps': 4,
    'QA': 5
  };
  
  const sorted = [...team].sort((a, b) => {
    const aPriority = Object.keys(priorityMap).find(k => a.role.includes(k));
    const bPriority = Object.keys(priorityMap).find(k => b.role.includes(k));
    return (priorityMap[aPriority || 'Other'] || 10) - (priorityMap[bPriority || 'Other'] || 10);
  });
  
  const result: TeamMember[] = [];
  let currentSize = 0;
  
  for (const member of sorted) {
    if (currentSize >= targetSize) break;
    
    const quantity = Math.min(member.quantity, targetSize - currentSize);
    if (quantity > 0) {
      result.push({ ...member, quantity });
      currentSize += quantity;
    }
  }
  
  return result;
}