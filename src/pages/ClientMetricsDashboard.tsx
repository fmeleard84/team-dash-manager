import { useEffect, useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Users, 
  Clock, 
  DollarSign,
  Activity,
  Pause,
  Play,
  AlertCircle,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { cn } from '@/lib/utils';
import { useProjectSort, type ProjectWithDate } from '@/hooks/useProjectSort';
import { ProjectSelectorNeon } from '@/components/ui/project-selector-neon';
import { UserSelectNeon } from '@/components/ui/user-select-neon';
import { PageHeaderNeon } from '@/components/ui/page-header-neon';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

// Colors for charts
const COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const ClientMetricsDashboard = () => {
  const { metrics, loading, refresh } = useDashboardMetrics();
  const [animatedCost, setAnimatedCost] = useState(0);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('all');

  // Filter metrics based on selected project and candidate
  const filteredMetrics = useMemo(() => {
    let filtered = { ...metrics };
    
    // Filter active candidates
    if (selectedProjectId !== 'all') {
      filtered.activeCandidates = metrics.activeCandidates.filter(
        c => c.projectId === selectedProjectId
      );
    }
    
    if (selectedCandidateId !== 'all') {
      filtered.activeCandidates = filtered.activeCandidates.filter(
        c => c.id === selectedCandidateId
      );
    }
    
    // Recalculate counts and costs based on filtered data
    filtered.activeCandidatesCount = filtered.activeCandidates.filter(c => c.status === 'active').length;
    filtered.pausedCandidatesCount = filtered.activeCandidates.filter(c => c.status === 'paused').length;
    filtered.currentCostPerMinute = filtered.activeCandidates
      .filter(c => c.status === 'active')
      .reduce((sum, c) => sum + c.hourlyRate, 0);
    filtered.totalCurrentCost = filtered.activeCandidates.reduce((sum, c) => sum + c.currentCost, 0);
    
    // Filter recent activities
    if (selectedProjectId !== 'all') {
      filtered.recentActivities = metrics.recentActivities.filter(
        a => a.projectId === selectedProjectId
      );
    }
    
    if (selectedCandidateId !== 'all') {
      filtered.recentActivities = filtered.recentActivities.filter(
        a => a.candidateId === selectedCandidateId
      );
    }
    
    return filtered;
  }, [metrics, selectedProjectId, selectedCandidateId]);
  
  // Get unique projects and candidates for filters
  const uniqueProjects = useMemo(() => {
    const projects = new Map();
    metrics.activeCandidates.forEach(c => {
      if (!projects.has(c.projectId)) {
        projects.set(c.projectId, {
          id: c.projectId,
          title: c.projectName,
          created_at: c.projectCreatedAt || new Date().toISOString()
        });
      }
    });
    metrics.recentActivities.forEach(a => {
      if (a.projectId && !projects.has(a.projectId)) {
        projects.set(a.projectId, {
          id: a.projectId,
          title: a.projectName,
          created_at: a.projectCreatedAt || new Date().toISOString()
        });
      }
    });
    return Array.from(projects.values()) as ProjectWithDate[];
  }, [metrics]);
  
  // Sort projects using the universal hook
  const sortedProjects = useProjectSort(uniqueProjects);
  
  const uniqueCandidates = useMemo(() => {
    const candidates = new Map();
    
    // Filter candidates based on selected project
    const candidatesToShow = selectedProjectId === 'all' 
      ? metrics.activeCandidates 
      : metrics.activeCandidates.filter(c => c.projectId === selectedProjectId);
      
    candidatesToShow.forEach(c => {
      if (!candidates.has(c.id)) {
        candidates.set(c.id, c.name);
      }
    });
    
    // Also include candidates from recent activities
    const activitiesToShow = selectedProjectId === 'all'
      ? metrics.recentActivities
      : metrics.recentActivities.filter(a => a.projectId === selectedProjectId);
      
    activitiesToShow.forEach(a => {
      if (a.candidateId && !candidates.has(a.candidateId)) {
        candidates.set(a.candidateId, a.candidateName);
      }
    });
    
    return Array.from(candidates, ([id, name]) => ({ id, name }));
  }, [metrics, selectedProjectId]);

  // Animate the cost counter
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedCost(prev => {
        const target = filteredMetrics.totalCurrentCost;
        const diff = target - prev;
        if (Math.abs(diff) < 0.01) return target;
        return prev + diff * 0.1;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [filteredMetrics.totalCurrentCost]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement des métriques...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header unifié avec design néon */}
      <PageHeaderNeon
        icon={Activity}
        title="Métriques en temps réel"
        subtitle="Suivi des coûts et de l'activité"
        badge={{ text: "Temps réel", animate: true }}
        showProjectSelector={false}
      >
        <div className="flex flex-wrap items-center gap-2">
          <ProjectSelectorNeon
            projects={[{ id: 'all', title: 'Tous les projets', created_at: '' }, ...sortedProjects.map(p => ({ ...p, created_at: p.created_at }))]}
            selectedProjectId={selectedProjectId}
            onProjectChange={setSelectedProjectId}
            placeholder="Tous les projets"
            className="w-[280px]"
            showStatus={false}
            showDates={true}
            showTeamProgress={false}
          />
          
          <UserSelectNeon
            users={uniqueCandidates.map(candidate => ({
              id: candidate.id,
              name: candidate.name,
              role: 'Candidat'
            }))}
            selectedUserId={selectedCandidateId}
            onUserChange={setSelectedCandidateId}
            placeholder="Toute l'équipe"
            showAll={true}
            allLabel="Toute l'équipe"
            className="w-[220px]"
            disabled={uniqueCandidates.length === 0}
          />

          {(selectedProjectId !== 'all' || selectedCandidateId !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white border border-purple-500/30"
              onClick={() => {
                setSelectedProjectId('all');
                setSelectedCandidateId('all');
              }}
            >
              <Filter className="w-3 h-3 mr-1" />
              Réinitialiser
            </Button>
          )}
        </div>
      </PageHeaderNeon>

      {/* Main Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cost per minute card */}
        <Card className="relative overflow-hidden transition-all hover:shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10"></div>
          <CardHeader className="relative pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-foreground">Coût / minute</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-foreground">
              {filteredMetrics.currentCostPerMinute.toFixed(2)}€
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              En temps réel
            </p>
            {filteredMetrics.currentCostPerMinute > 0 && (
              <div className="mt-3">
                <Progress value={100} className="h-1.5 animate-pulse" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active teams card */}
        <Card className="relative overflow-hidden transition-all hover:shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10"></div>
          <CardHeader className="relative pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
              <span className="text-foreground">Équipes actives</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="flex items-baseline gap-3">
              <div className="text-3xl font-bold text-foreground">
                {filteredMetrics.activeCandidatesCount}
              </div>
              {filteredMetrics.pausedCandidatesCount > 0 && (
                <div className="flex items-center gap-1 text-sm text-orange-500">
                  <Pause className="w-3 h-3" />
                  {filteredMetrics.pausedCandidatesCount}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredMetrics.activeCandidatesCount > 0 ? 'En activité' : 'Aucune activité'}
            </p>
          </CardContent>
        </Card>

        {/* Total cost today */}
        <Card className="relative overflow-hidden transition-all hover:shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-500/10"></div>
          <CardHeader className="relative pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <span className="text-foreground">Coût total actuel</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold tabular-nums text-foreground">
              {animatedCost.toFixed(2)}€
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Sessions en cours
            </p>
          </CardContent>
        </Card>

        {/* Weekly stats */}
        <Card className="relative overflow-hidden transition-all hover:shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-orange-500/10"></div>
          <CardHeader className="relative pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <span className="text-foreground">Cette semaine</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-foreground">
              {metrics.totalCostThisWeek.toFixed(2)}€
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.floor(metrics.totalTimeThisWeek / 60)}h {metrics.totalTimeThisWeek % 60}min
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-time cost chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-foreground">Évolution du coût en temps réel</span>
            </CardTitle>
            <CardDescription>
              Coût par minute sur la dernière heure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={metrics.costHistory}>
                <defs>
                  <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="time" 
                  className="text-xs"
                  tick={{ fill: '#6b7280' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: '#6b7280' }}
                  tickFormatter={(value) => `${value}€`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                  labelFormatter={(label) => `Heure: ${label}`}
                  formatter={(value: any) => [`${value}€/min`, 'Coût']}
                />
                <Area 
                  type="monotone" 
                  dataKey="cost" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorCost)" 
                  animationDuration={300}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Active candidates list */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <span className="text-foreground">Équipes actives</span>
              </span>
              {filteredMetrics.activeCandidates.length > 0 && (
                <Badge variant="secondary">
                  {filteredMetrics.activeCandidates.filter(c => c.status === 'active').length} actif(s)
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] pr-4">
              {filteredMetrics.activeCandidates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Aucune équipe active</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredMetrics.activeCandidates.map((candidate) => (
                    <div 
                      key={candidate.id}
                      className={cn(
                        "p-3 rounded-lg border transition-all",
                        candidate.status === 'active' 
                          ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800" 
                          : "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800"
                      )}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="font-medium text-sm">{candidate.name}</div>
                        <Badge 
                          variant={candidate.status === 'active' ? 'default' : 'secondary'}
                          className={cn(
                            "text-xs",
                            candidate.status === 'active' 
                              ? "bg-emerald-500 hover:bg-emerald-600" 
                              : "bg-orange-500 hover:bg-orange-600"
                          )}
                        >
                          {candidate.status === 'active' ? <Play className="w-3 h-3 mr-1" /> : <Pause className="w-3 h-3 mr-1" />}
                          {candidate.status === 'active' ? 'Actif' : 'Pause'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{candidate.projectName}</p>
                      <p className="text-xs text-gray-600 line-clamp-1">{candidate.activity}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                          {Math.floor(candidate.currentDuration / 60)}h {candidate.currentDuration % 60}min
                        </span>
                        <span className="text-sm font-semibold text-primary">
                          {candidate.currentCost.toFixed(2)}€
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Project costs and recent activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project costs breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 bg-violet-500 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <span className="text-foreground">Répartition par projet</span>
            </CardTitle>
            <CardDescription>
              Coûts de la semaine par projet
            </CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.projectCosts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Aucune donnée cette semaine</p>
              </div>
            ) : (
              <div className="space-y-3">
                {metrics.projectCosts.slice(0, 5).map((project, index) => (
                  <div key={project.projectId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate flex-1 mr-2">{project.projectName}</span>
                      <span className="text-sm font-semibold tabular-nums">{project.totalCost.toFixed(2)}€</span>
                    </div>
                    <Progress 
                      value={project.percentage} 
                      className="h-2"
                      style={{
                        '--progress-background': COLORS[index % COLORS.length]
                      } as any}
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{Math.floor(project.totalTime / 60)}h {project.totalTime % 60}min</span>
                      <span>{project.percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent activities timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <span className="text-foreground">Activités récentes</span>
            </CardTitle>
            <CardDescription>
              Dernières sessions de travail
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[350px] pr-4">
              {filteredMetrics.recentActivities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Aucune activité récente</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredMetrics.recentActivities.map((activity) => (
                    <div key={activity.id} className="flex gap-3">
                      <div className={cn(
                        "w-2 h-2 rounded-full mt-2",
                        activity.status === 'active' ? "bg-emerald-500 animate-pulse" :
                        activity.status === 'paused' ? "bg-orange-500" :
                        "bg-muted-foreground"
                      )}></div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{activity.candidateName}</p>
                          {activity.cost && (
                            <span className="text-sm font-semibold text-primary">
                              {activity.cost.toFixed(2)}€
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{activity.projectName}</p>
                        <p className="text-xs text-gray-600">{activity.activity}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{new Date(activity.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                          {activity.duration && (
                            <>
                              <span>•</span>
                              <span>{Math.floor(activity.duration / 60)}h {activity.duration % 60}min</span>
                            </>
                          )}
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs scale-90",
                              activity.status === 'active' ? "border-emerald-500 text-emerald-600" :
                              activity.status === 'paused' ? "border-orange-500 text-orange-600" :
                              "border-muted text-muted-foreground"
                            )}
                          >
                            {activity.status === 'active' ? 'En cours' :
                             activity.status === 'paused' ? 'En pause' :
                             'Terminé'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientMetricsDashboard;