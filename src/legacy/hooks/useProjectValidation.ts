import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ProjectValidationResult {
  can_start: boolean;
  project_status: string;
  resources: {
    total: number;
    accepted: number;
    pending: number;
    expired: number;
  };
  missing_resources?: Array<{
    profile_name: string;
    category: string;
    status: string;
    seniority: string;
  }>;
  warnings?: Array<{
    type: string;
    message: string;
  }>;
  error?: string;
}

export interface ProjectStartValidation {
  isValid: boolean;
  canStart: boolean;
  issues: ValidationIssue[];
  warnings: ValidationWarning[];
  summary: {
    totalResources: number;
    acceptedResources: number;
    missingResources: number;
    readyToStart: boolean;
  };
}

interface ValidationIssue {
  type: 'critical' | 'warning' | 'info';
  message: string;
  details?: string;
  action?: string;
}

interface ValidationWarning {
  type: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export const useProjectValidation = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<ProjectValidationResult | null>(null);

  const checkProjectCanStart = async (projectId: string): Promise<ProjectValidationResult | null> => {
    if (!projectId) return null;

    setLoading(true);
    try {
      // Appeler la fonction SQL pour vérifier les prérequis
      const { data, error } = await supabase.rpc('check_project_can_start', {
        project_id_param: projectId
      });

      if (error) throw error;

      setValidationResult(data);
      return data;

    } catch (error: any) {
      console.error('Error checking project validation:', error);
      toast({
        variant: "destructive",
        title: "Erreur de validation",
        description: "Impossible de vérifier les prérequis du projet."
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const validateProjectForStart = async (projectId: string): Promise<ProjectStartValidation | null> => {
    const result = await checkProjectCanStart(projectId);
    if (!result) return null;

    const issues: ValidationIssue[] = [];
    const warnings: ValidationWarning[] = [];

    // Analyser les résultats et créer des issues structurées
    if (result.error) {
      issues.push({
        type: 'critical',
        message: 'Erreur de validation',
        details: result.error,
        action: 'Contacter le support'
      });
    }

    // Vérifier les ressources
    if (result.resources.total === 0) {
      issues.push({
        type: 'critical',
        message: 'Aucune ressource assignée',
        details: 'Le projet n\'a aucune ressource assignée via ReactFlow',
        action: 'Assigner des ressources dans l\'éditeur de projet'
      });
    } else if (result.resources.accepted < result.resources.total) {
      const missingCount = result.resources.total - result.resources.accepted;
      issues.push({
        type: 'critical',
        message: `${missingCount} ressource(s) manquante(s)`,
        details: 'Toutes les ressources doivent accepter leur mission avant de démarrer le projet',
        action: 'Attendre les acceptations ou relancer la recherche'
      });
    }

    // Analyser les warnings
    if (result.warnings) {
      result.warnings.forEach(warning => {
        warnings.push({
          type: warning.type,
          message: warning.message,
          severity: warning.type === 'expired_resources' ? 'high' : 'medium'
        });
      });
    }

    // Ressources expirées nécessitent une action
    if (result.resources.expired > 0) {
      issues.push({
        type: 'warning',
        message: `${result.resources.expired} ressource(s) expirée(s)`,
        details: 'Des recherches de ressources ont expiré sans réponse',
        action: 'Relancer la recherche pour ces ressources'
      });
    }

    // Ressources en attente
    if (result.resources.pending > 0) {
      warnings.push({
        type: 'pending_resources',
        message: `${result.resources.pending} ressource(s) en attente de réponse`,
        severity: 'medium'
      });
    }

    const validation: ProjectStartValidation = {
      isValid: !issues.some(issue => issue.type === 'critical'),
      canStart: result.can_start,
      issues,
      warnings,
      summary: {
        totalResources: result.resources.total,
        acceptedResources: result.resources.accepted,
        missingResources: result.resources.total - result.resources.accepted,
        readyToStart: result.can_start
      }
    };

    return validation;
  };

  const getProjectStatusSuggestions = (validation: ProjectStartValidation): string[] => {
    const suggestions: string[] = [];

    if (validation.summary.totalResources === 0) {
      suggestions.push("Utilisez l'éditeur ReactFlow pour assigner des ressources au projet");
      suggestions.push("Définissez les profils nécessaires selon les besoins du projet");
    }

    if (validation.summary.missingResources > 0) {
      suggestions.push("Contactez les candidats en attente pour accélérer les réponses");
      suggestions.push("Considérez modifier les critères de recherche si nécessaire");
    }

    const expiredIssue = validation.issues.find(i => i.message.includes('expirée'));
    if (expiredIssue) {
      suggestions.push("Relancez la recherche pour les ressources expirées");
      suggestions.push("Ajustez la durée de validité des offres si nécessaire");
    }

    if (validation.canStart) {
      suggestions.push("Le projet est prêt ! Cliquez sur 'Démarrer' pour lancer l'orchestration");
      suggestions.push("L'orchestration créera automatiquement : Kickoff, Drive, Kanban et Messagerie");
    }

    return suggestions;
  };

  const formatValidationSummary = (validation: ProjectStartValidation): string => {
    const { summary } = validation;
    
    let text = `Projet avec ${summary.totalResources} ressource(s) : `;
    text += `${summary.acceptedResources} acceptée(s)`;
    
    if (summary.missingResources > 0) {
      text += `, ${summary.missingResources} manquante(s)`;
    }

    if (validation.canStart) {
      text += ". ✅ Prêt à démarrer !";
    } else {
      text += ". ❌ Prérequis non satisfaits.";
    }

    return text;
  };

  // Helper pour afficher les issues de façon user-friendly
  const displayValidationIssues = (validation: ProjectStartValidation) => {
    validation.issues.forEach(issue => {
      const variant = issue.type === 'critical' ? 'destructive' : 'default';
      toast({
        variant: variant as any,
        title: issue.message,
        description: issue.details || '',
        duration: issue.type === 'critical' ? 8000 : 5000,
        action: issue.action ? (
          <span className="text-xs opacity-70">Action: {issue.action}</span>
        ) : undefined
      });
    });

    // Afficher un résumé positif si tout va bien
    if (validation.canStart && validation.issues.length === 0) {
      toast({
        title: "Validation réussie !",
        description: formatValidationSummary(validation),
        duration: 5000,
      });
    }
  };

  return {
    loading,
    validationResult,
    checkProjectCanStart,
    validateProjectForStart,
    getProjectStatusSuggestions,
    formatValidationSummary,
    displayValidationIssues
  };
};