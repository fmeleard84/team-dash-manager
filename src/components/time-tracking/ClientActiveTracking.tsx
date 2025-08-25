import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Clock,
  Euro,
  Users,
  Activity,
  TrendingUp,
  Play,
  Pause,
  ChevronDown,
  ChevronUp,
  Timer,
  Bug
} from 'lucide-react';
import { useClientTimeTracking } from '@/hooks/useClientTimeTracking';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const ClientActiveTracking = () => {
  const { user } = useAuth();
  const { activeProjects, loading, totalCostPerMinute, totalCurrentCost, refresh } = useClientTimeTracking();
  const [expandedProjects, setExpandedProjects] = useState<string[]>([]);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Refresh data when component becomes visible
  useEffect(() => {
    // Detect when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Tab became visible, refreshing active tracking data...');
        refresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also refresh on mount
    console.log('ClientActiveTracking mounted, refreshing data...');
    refresh();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refresh]);

  const handleManualRefresh = async () => {
    setIsManualRefreshing(true);
    await refresh();
    setTimeout(() => setIsManualRefreshing(false), 1000);
  };

  const handleDebug = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('debug-active-tracking', {
        body: { userId: user.id }
      });
      
      if (error) throw error;
      console.log('Debug info:', data);
      setDebugInfo(data);
    } catch (error) {
      console.error('Debug error:', error);
    }
  };

  const toggleProjectExpansion = (projectId: string) => {
    setExpandedProjects(prev => 
      prev.includes(projectId) 
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activeProjects.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Timer className="w-5 h-5" />
              Activité en temps réel
            </span>
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleManualRefresh}
              disabled={isManualRefreshing}
            >
              {isManualRefreshing ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
              ) : (
                <Activity className="w-4 h-4" />
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">Aucun candidat actif actuellement</p>
            <p className="text-xs mt-2">Les activités apparaîtront ici en temps réel</p>
            <p className="text-xs mt-4 text-gray-400">
              Dernière vérification: {new Date().toLocaleTimeString('fr-FR')}
            </p>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={handleDebug}
              className="mt-4"
            >
              <Bug className="w-4 h-4 mr-2" />
              Debug
            </Button>
            {debugInfo && (
              <div className="mt-4 p-4 bg-gray-100 rounded text-xs text-left">
                <p>Projets: {debugInfo.summary?.totalProjects || 0}</p>
                <p>Sessions actives totales: {debugInfo.summary?.totalActiveTracking || 0}</p>
                <p>Vos sessions actives: {debugInfo.summary?.userActiveTracking || 0}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-blue-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Timer className="w-5 h-5" />
              Activité globale en temps réel
            </span>
            <Badge className="bg-green-500 text-white animate-pulse">
              EN DIRECT
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Candidats actifs</p>
                <p className="text-2xl font-bold">
                  {activeProjects.reduce((sum, p) => sum + p.activeCandidates.filter(c => c.status === 'active').length, 0)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center text-white">
                <Euro className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Coût par minute</p>
                <p className="text-2xl font-bold text-green-600">
                  {totalCostPerMinute.toFixed(2)}€
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-red-600 rounded-xl flex items-center justify-center text-white">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Coût actuel total</p>
                <p className="text-2xl font-bold text-orange-600">
                  {totalCurrentCost.toFixed(2)}€
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projects with active candidates */}
      <div className="space-y-4">
        {activeProjects.map(project => {
          const isExpanded = expandedProjects.includes(project.projectId);
          const activeCount = project.activeCandidates.filter(c => c.status === 'active').length;
          const pausedCount = project.activeCandidates.filter(c => c.status === 'paused').length;

          return (
            <Card key={project.projectId} className="overflow-hidden">
              <CardHeader 
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleProjectExpansion(project.projectId)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">{project.projectTitle}</CardTitle>
                    <div className="flex items-center gap-2">
                      {activeCount > 0 && (
                        <Badge className="bg-green-500 text-white flex items-center gap-1">
                          <Play className="w-3 h-3" />
                          {activeCount} actif{activeCount > 1 ? 's' : ''}
                        </Badge>
                      )}
                      {pausedCount > 0 && (
                        <Badge className="bg-orange-500 text-white flex items-center gap-1">
                          <Pause className="w-3 h-3" />
                          {pausedCount} en pause
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Coût/min</p>
                      <p className="font-semibold text-green-600">
                        {project.totalCostPerMinute.toFixed(2)}€
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="border-t">
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3 pt-4">
                      {project.activeCandidates.map(candidate => (
                        <div
                          key={candidate.candidateId}
                          className={cn(
                            "p-4 rounded-lg border",
                            candidate.status === 'active' 
                              ? "bg-green-50 border-green-200" 
                              : "bg-orange-50 border-orange-200"
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{candidate.candidateName}</span>
                                <Badge 
                                  variant={candidate.status === 'active' ? 'default' : 'secondary'}
                                  className={cn(
                                    "text-xs",
                                    candidate.status === 'active' && "bg-green-500 text-white animate-pulse"
                                  )}
                                >
                                  {candidate.status === 'active' ? (
                                    <>
                                      <Play className="w-3 h-3 mr-1" />
                                      En cours
                                    </>
                                  ) : (
                                    <>
                                      <Pause className="w-3 h-3 mr-1" />
                                      En pause
                                    </>
                                  )}
                                </Badge>
                              </div>
                              
                              <p className="text-sm text-gray-600">
                                {candidate.activityDescription}
                              </p>
                              
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Depuis {format(new Date(candidate.startTime), 'HH:mm', { locale: fr })}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Timer className="w-3 h-3" />
                                  {formatDuration(candidate.currentDurationMinutes)}
                                </span>
                              </div>
                            </div>

                            <div className="text-right">
                              <p className="text-sm text-gray-600">Coût actuel</p>
                              <p className="text-lg font-semibold text-green-600">
                                {candidate.currentCost.toFixed(2)}€
                              </p>
                              <p className="text-xs text-gray-500">
                                {candidate.hourlyRate}€/min
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};