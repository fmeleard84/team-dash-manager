import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Loader2, 
  UserSearch,
  UserCheck,
  UserX,
  RefreshCw
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';

interface Transition {
  id: string;
  transition_type: 'profile_change' | 'seniority_change' | 'skill_update';
  status: 'pending' | 'searching' | 'candidate_found' | 'completed' | 'cancelled';
  created_at: string;
  reason?: string;
  hr_resource_assignments?: {
    hr_profiles?: {
      name: string;
    };
  };
  previous_candidate?: {
    first_name: string;
    last_name: string;
  };
  new_candidate?: {
    first_name: string;
    last_name: string;
  };
  new_seniority?: string;
  new_languages?: string[];
  new_expertises?: string[];
}

interface ResourceTransitionStatusProps {
  projectId: string;
  onTransitionComplete?: (transitionId: string) => void;
}

export function ResourceTransitionStatus({ projectId, onTransitionComplete }: ResourceTransitionStatusProps) {
  const [transitions, setTransitions] = useState<Transition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransitions();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel(`project-transitions-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'resource_transitions',
          filter: `project_id=eq.${projectId}`
        },
        handleTransitionChange
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [projectId]);

  const loadTransitions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('resource_transitions')
        .select(`
          *,
          hr_resource_assignments (
            hr_profiles (
              name
            )
          ),
          previous_candidate:candidate_profiles!previous_candidate_id (
            first_name,
            last_name
          ),
          new_candidate:candidate_profiles!new_candidate_id (
            first_name,
            last_name
          )
        `)
        .eq('project_id', projectId)
        .in('status', ['pending', 'searching', 'candidate_found'])
        .order('created_at', { ascending: false });

      if (!error && data) {
        setTransitions(data);
      }
    } catch (error) {
      console.error('Error loading transitions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTransitionChange = (payload: any) => {
    if (payload.eventType === 'INSERT') {
      loadTransitions(); // Reload to get full data with joins
    } else if (payload.eventType === 'UPDATE') {
      if (payload.new.status === 'completed' && onTransitionComplete) {
        onTransitionComplete(payload.new.id);
      }
      loadTransitions();
    } else if (payload.eventType === 'DELETE') {
      setTransitions(prev => prev.filter(t => t.id !== payload.old.id));
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'searching':
        return <UserSearch className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'candidate_found':
        return <UserCheck className="h-4 w-4 text-green-500" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'cancelled':
        return <UserX className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'pending':
        return 'En attente';
      case 'searching':
        return 'Recherche en cours';
      case 'candidate_found':
        return 'Candidat trouvé';
      case 'completed':
        return 'Terminé';
      case 'cancelled':
        return 'Annulé';
      default:
        return status;
    }
  };

  const getTransitionTypeLabel = (type: string) => {
    switch(type) {
      case 'profile_change':
        return 'Changement de métier';
      case 'seniority_change':
        return 'Changement de séniorité';
      case 'skill_update':
        return 'Mise à jour des compétences';
      default:
        return type;
    }
  };

  const getProgressValue = (status: string) => {
    switch(status) {
      case 'pending':
        return 25;
      case 'searching':
        return 50;
      case 'candidate_found':
        return 75;
      case 'completed':
        return 100;
      default:
        return 0;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (transitions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Alert>
        <RefreshCw className="h-4 w-4" />
        <AlertTitle>Modifications en cours</AlertTitle>
        <AlertDescription>
          {transitions.length} modification{transitions.length > 1 ? 's' : ''} de ressource{transitions.length > 1 ? 's' : ''} en cours de traitement
        </AlertDescription>
      </Alert>

      {transitions.map(transition => (
        <Card key={transition.id} className="relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1">
            <Progress value={getProgressValue(transition.status)} className="h-1" />
          </div>
          
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base flex items-center gap-2">
                  {getStatusIcon(transition.status)}
                  {transition.hr_resource_assignments?.hr_profiles?.name || 'Ressource'}
                </CardTitle>
                <CardDescription>
                  {getTransitionTypeLabel(transition.transition_type)}
                </CardDescription>
              </div>
              <Badge variant={transition.status === 'searching' ? 'default' : 'secondary'}>
                {getStatusLabel(transition.status)}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-3">
            {transition.reason && (
              <p className="text-sm text-muted-foreground">{transition.reason}</p>
            )}
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              {transition.previous_candidate && (
                <div>
                  <p className="text-muted-foreground mb-1">Candidat précédent:</p>
                  <p className="font-medium">
                    {transition.previous_candidate.first_name} {transition.previous_candidate.last_name}
                  </p>
                </div>
              )}
              
              {transition.new_candidate ? (
                <div>
                  <p className="text-muted-foreground mb-1">Nouveau candidat:</p>
                  <p className="font-medium text-green-600">
                    {transition.new_candidate.first_name} {transition.new_candidate.last_name}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-muted-foreground mb-1">Nouveau candidat:</p>
                  <p className="text-sm italic">En recherche...</p>
                </div>
              )}
            </div>

            {transition.status === 'searching' && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Recherche de candidats correspondants...</span>
              </div>
            )}

            {transition.status === 'candidate_found' && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <UserCheck className="h-3 w-3" />
                <span>En attente de confirmation du candidat</span>
              </div>
            )}

            {(transition.new_seniority || transition.new_languages?.length || transition.new_expertises?.length) && (
              <div className="border-t pt-3 space-y-2">
                <p className="text-sm font-medium">Nouveaux critères:</p>
                <div className="flex flex-wrap gap-1">
                  {transition.new_seniority && (
                    <Badge variant="outline">{transition.new_seniority}</Badge>
                  )}
                  {transition.new_languages?.map(lang => (
                    <Badge key={lang} variant="outline">{lang}</Badge>
                  ))}
                  {transition.new_expertises?.map(exp => (
                    <Badge key={exp} variant="outline">{exp}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}