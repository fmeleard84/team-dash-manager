import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Users, 
  Clock,
  RefreshCw,
  ExternalLink,
  Play,
  Pause
} from 'lucide-react';
import { useProjectValidation, ProjectStartValidation } from '@/hooks/useProjectValidation';

interface ProjectValidationStatusProps {
  projectId: string;
  onValidationChange?: (validation: ProjectStartValidation | null) => void;
  onRefresh?: () => void;
  showActions?: boolean;
}

const getIssueIcon = (type: string) => {
  switch (type) {
    case 'critical':
      return <XCircle className="w-4 h-4 text-red-500" />;
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-orange-500" />;
    default:
      return <AlertTriangle className="w-4 h-4 text-blue-500" />;
  }
};

const getWarningIcon = (severity: string) => {
  switch (severity) {
    case 'high':
      return <AlertTriangle className="w-3 h-3 text-red-500" />;
    case 'medium':
      return <AlertTriangle className="w-3 h-3 text-orange-500" />;
    default:
      return <AlertTriangle className="w-3 h-3 text-yellow-500" />;
  }
};

export const ProjectValidationStatus = ({ 
  projectId, 
  onValidationChange, 
  onRefresh,
  showActions = true
}: ProjectValidationStatusProps) => {
  const { 
    loading, 
    validateProjectForStart, 
    getProjectStatusSuggestions, 
    formatValidationSummary 
  } = useProjectValidation();

  const [validation, setValidation] = useState<ProjectStartValidation | null>(null);

  const refreshValidation = async () => {
    if (!projectId) return;
    
    const result = await validateProjectForStart(projectId);
    setValidation(result);
    
    if (onValidationChange) {
      onValidationChange(result);
    }
  };

  useEffect(() => {
    refreshValidation();
  }, [projectId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            Validation des prérequis...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!validation) {
    return (
      <Alert>
        <AlertTriangle className="w-4 h-4" />
        <AlertDescription>
          Impossible de valider les prérequis du projet.
        </AlertDescription>
      </Alert>
    );
  }

  const progressPercentage = validation.summary.totalResources > 0 
    ? (validation.summary.acceptedResources / validation.summary.totalResources) * 100 
    : 0;

  const suggestions = getProjectStatusSuggestions(validation);

  return (
    <div className="space-y-4">
      {/* Status Overview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              {validation.canStart ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              État du Projet
            </CardTitle>
            
            {showActions && (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={refreshValidation}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
                {onRefresh && (
                  <Button variant="outline" size="sm" onClick={onRefresh}>
                    Actualiser
                  </Button>
                )}
              </div>
            )}
          </div>
          <CardDescription>
            {formatValidationSummary(validation)}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                Ressources assignées
              </span>
              <span className="font-medium">
                {validation.summary.acceptedResources} / {validation.summary.totalResources}
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            {validation.canStart ? (
              <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                <Play className="w-3 h-3 mr-1" />
                Prêt à démarrer
              </Badge>
            ) : (
              <Badge variant="destructive">
                <Pause className="w-3 h-3 mr-1" />
                Prérequis non satisfaits
              </Badge>
            )}

            {validation.warnings.length > 0 && (
              <Badge variant="outline" className="text-orange-600 border-orange-200">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {validation.warnings.length} avertissement{validation.warnings.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Issues */}
      {validation.issues.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Problèmes à résoudre</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {validation.issues.map((issue, index) => (
                <Alert key={index} className={
                  issue.type === 'critical' ? 'border-red-200 bg-red-50' :
                  issue.type === 'warning' ? 'border-orange-200 bg-orange-50' :
                  'border-blue-200 bg-blue-50'
                }>
                  <div className="flex gap-3">
                    {getIssueIcon(issue.type)}
                    <div className="flex-1">
                      <AlertDescription className="font-medium mb-1">
                        {issue.message}
                      </AlertDescription>
                      {issue.details && (
                        <AlertDescription className="text-sm text-muted-foreground mb-2">
                          {issue.details}
                        </AlertDescription>
                      )}
                      {issue.action && (
                        <AlertDescription className="text-xs font-medium text-blue-600">
                          💡 {issue.action}
                        </AlertDescription>
                      )}
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warnings */}
      {validation.warnings.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Avertissements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {validation.warnings.map((warning, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  {getWarningIcon(warning.severity)}
                  <span>{warning.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recommandations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <span className="text-muted-foreground">{suggestion}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};