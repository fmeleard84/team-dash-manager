import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/card';
import { Badge } from '@/ui/components/badge';
import { DatePicker } from '@/ui/components/date-picker';
import { PageHeaderNeon } from '@/ui/components/page-header-neon';
import { ProjectSelectorNeon } from '@/ui/components/project-selector-neon';
import { Button } from '@/ui/components/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/ui/components/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/components/tabs';
import {
  Star,
  MessageCircle,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Award,
  FileText,
  Download,
  Filter
} from 'lucide-react';
import { format, subWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Import hooks from the evaluations module
import { useEvaluations } from '../hooks/useEvaluations';
import { useEvaluationActions } from '../hooks/useEvaluationActions';
import { useEvaluationStats } from '../hooks/useEvaluationStats';

// Import types
import {
  ModularEvaluationsViewProps,
  EvaluationItem,
  EvaluationFilters,
  EvaluationExportFormat,
  EvaluationStats,
  RATING_LABELS,
  RATING_COLORS
} from '../types';

export const ModularEvaluationsView: React.FC<ModularEvaluationsViewProps> = ({
  candidateId,
  className = '',
  availableProjects = [],
  initialFilters = {},
  showExportOptions = true,
  showAnalytics = true
}) => {
  // Date range state - default to last 4 weeks
  const today = new Date();
  const fourWeeksAgo = subWeeks(today, 4);
  const [startDate, setStartDate] = useState(format(fourWeeksAgo, 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(today, 'yyyy-MM-dd'));
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [activeTab, setActiveTab] = useState('overview');

  // Advanced filters
  const [minRating, setMinRating] = useState<number | undefined>();
  const [maxRating, setMaxRating] = useState<number | undefined>();
  const [hasComment, setHasComment] = useState<boolean | undefined>();

  // Initialize filters
  const filters: EvaluationFilters = useMemo(() => ({
    project_id: selectedProjectId || undefined,
    date_from: startDate,
    date_to: endDate,
    rating_min: minRating,
    rating_max: maxRating,
    has_comment: hasComment,
    sort_by: 'created_at',
    sort_order: 'desc',
    per_page: 20,
    page: 1,
    ...initialFilters
  }), [selectedProjectId, startDate, endDate, minRating, maxRating, hasComment, initialFilters]);

  // Initialize hooks
  const {
    evaluations,
    ratings,
    loading: evaluationsLoading,
    error: evaluationsError,
    refetch: refetchEvaluations
  } = useEvaluations({
    candidateId,
    initialFilters: filters,
    autoRefresh: true,
    realtime: true
  });

  const {
    stats,
    loading: statsLoading,
    refreshStats,
    calculatePerformanceMetrics,
    generateRecommendations
  } = useEvaluationStats({
    candidateId,
    autoRefresh: true
  });

  const {
    exportEvaluations,
    calculateAverageRating,
    formatRatingLabel,
    getRatingColor,
    getQuickStats
  } = useEvaluationActions({ candidateId });

  // Utility functions
  const getStatusBadge = (rating: number) => {
    const label = formatRatingLabel(rating);
    const color = getRatingColor(rating);
    const iconColors = {
      1: 'text-red-500',
      2: 'text-orange-500',
      3: 'text-yellow-500',
      4: 'text-green-500',
      5: 'text-emerald-500'
    };

    return (
      <Badge className={`${RATING_COLORS[rating as keyof typeof RATING_COLORS]} bg-opacity-10 flex items-center gap-1`}>
        <Star className={`w-3 h-3 ${iconColors[rating as keyof typeof iconColors]}`} />
        {label}
      </Badge>
    );
  };

  // Handle export
  const handleExport = async (format: EvaluationExportFormat) => {
    try {
      await exportEvaluations(filters, format);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  // Calculate dashboard stats
  const dashboardStats = useMemo(() => {
    return getQuickStats(ratings);
  }, [ratings, getQuickStats]);

  // Performance metrics
  const performanceMetrics = useMemo(() => {
    if (showAnalytics) {
      return calculatePerformanceMetrics();
    }
    return null;
  }, [stats, showAnalytics, calculatePerformanceMetrics]);

  // Recommendations
  const recommendations = useMemo(() => {
    if (showAnalytics) {
      return generateRecommendations();
    }
    return [];
  }, [stats, showAnalytics, generateRecommendations]);

  if (evaluationsLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Chargement des évaluations...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with filters */}
      <PageHeaderNeon
        title="Mes Évaluations"
        description="Vos performances et retours clients"
        icon={Star}
        iconColor="from-yellow-500 to-amber-500"
      >
        <div className="flex items-center gap-4 flex-wrap">
          {/* Date filters */}
          <div className="flex items-center gap-3">
            <DatePicker
              value={startDate}
              onChange={setStartDate}
              placeholder="Date de début"
              className="w-44 bg-black/40 backdrop-blur-xl border-purple-500/30 text-white hover:bg-white/10 hover:border-purple-400"
              maxDate={endDate}
            />
            <span className="text-gray-400 font-medium">→</span>
            <DatePicker
              value={endDate}
              onChange={setEndDate}
              placeholder="Date de fin"
              className="w-44 bg-black/40 backdrop-blur-xl border-purple-500/30 text-white hover:bg-white/10 hover:border-purple-400"
              minDate={startDate}
            />
          </div>

          {/* Project selector */}
          <ProjectSelectorNeon
            projects={availableProjects}
            selectedProjectId={selectedProjectId}
            onProjectChange={setSelectedProjectId}
            placeholder="Tous les projets"
            className="w-64"
            showStatus={false}
            showDates={false}
          />

          {/* Export options */}
          {showExportOptions && (
            <Select onValueChange={(format) => handleExport(format as EvaluationExportFormat)}>
              <SelectTrigger className="w-36 bg-black/40 backdrop-blur-xl border-purple-500/30 text-white">
                <SelectValue placeholder="Exporter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </PageHeaderNeon>

      {/* Advanced filters */}
      <Card className="bg-black/40 backdrop-blur-xl border-purple-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-400">
            <Filter className="w-5 h-5" />
            Filtres avancés
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Rating range */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Note minimale</label>
              <Select value={minRating?.toString()} onValueChange={(value) => setMinRating(value ? parseInt(value) : undefined)}>
                <SelectTrigger className="bg-black/40 border-gray-600 text-white">
                  <SelectValue placeholder="Toutes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Toutes</SelectItem>
                  {[1, 2, 3, 4, 5].map(rating => (
                    <SelectItem key={rating} value={rating.toString()}>
                      {rating} étoile{rating > 1 ? 's' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Note maximale</label>
              <Select value={maxRating?.toString()} onValueChange={(value) => setMaxRating(value ? parseInt(value) : undefined)}>
                <SelectTrigger className="bg-black/40 border-gray-600 text-white">
                  <SelectValue placeholder="Toutes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Toutes</SelectItem>
                  {[1, 2, 3, 4, 5].map(rating => (
                    <SelectItem key={rating} value={rating.toString()}>
                      {rating} étoile{rating > 1 ? 's' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Avec commentaire</label>
              <Select value={hasComment === undefined ? '' : hasComment.toString()} onValueChange={(value) => setHasComment(value === '' ? undefined : value === 'true')}>
                <SelectTrigger className="bg-black/40 border-gray-600 text-white">
                  <SelectValue placeholder="Indifférent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Indifférent</SelectItem>
                  <SelectItem value="true">Avec commentaire</SelectItem>
                  <SelectItem value="false">Sans commentaire</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-black/40 backdrop-blur-xl border border-purple-500/30">
          <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500">
            <BarChart3 className="w-4 h-4 mr-2" />
            Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="evaluations" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500">
            <Star className="w-4 h-4 mr-2" />
            Évaluations
          </TabsTrigger>
          {showAnalytics && (
            <TabsTrigger value="analytics" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500">
              <TrendingUp className="w-4 h-4 mr-2" />
              Analytiques
            </TabsTrigger>
          )}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Total évaluations */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur-lg opacity-20 group-hover:opacity-30 transition-opacity" />
              <Card className="relative bg-black/40 backdrop-blur-xl border-purple-500/30 hover:border-purple-400/50 transition-all duration-300">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-400 mb-1">Total évaluations</p>
                      <p className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        {dashboardStats.total}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center">
                      <Award className="w-6 h-6 text-purple-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Note moyenne */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl blur-lg opacity-20 group-hover:opacity-30 transition-opacity" />
              <Card className="relative bg-black/40 backdrop-blur-xl border-yellow-500/30 hover:border-yellow-400/50 transition-all duration-300">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-yellow-400 mb-1">Note moyenne</p>
                      <p className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                        {dashboardStats.average.toFixed(1)}/5
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl flex items-center justify-center">
                      <Star className="w-6 h-6 text-yellow-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Évaluations excellentes */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl blur-lg opacity-20 group-hover:opacity-30 transition-opacity" />
              <Card className="relative bg-black/40 backdrop-blur-xl border-green-500/30 hover:border-green-400/50 transition-all duration-300">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-400 mb-1">Notes excellentes</p>
                      <p className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                        {dashboardStats.distribution[5] || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Avec commentaires */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl blur-lg opacity-20 group-hover:opacity-30 transition-opacity" />
              <Card className="relative bg-black/40 backdrop-blur-xl border-blue-500/30 hover:border-blue-400/50 transition-all duration-300">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-400 mb-1">Avec commentaires</p>
                      <p className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                        {dashboardStats.withComments}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center">
                      <MessageCircle className="w-6 h-6 text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Rating distribution */}
          {dashboardStats.total > 0 && (
            <Card className="bg-black/40 backdrop-blur-xl border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-purple-400">Distribution des notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[5, 4, 3, 2, 1].map(rating => {
                  const count = dashboardStats.distribution[rating] || 0;
                  const percentage = dashboardStats.total > 0 ? (count / dashboardStats.total) * 100 : 0;

                  return (
                    <div key={rating} className="flex items-center gap-4">
                      <div className="flex items-center gap-2 w-20">
                        {Array.from({ length: rating }, (_, i) => (
                          <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${RATING_COLORS[rating as keyof typeof RATING_COLORS]} bg-current opacity-70 transition-all duration-300`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="w-16 text-sm text-gray-400 text-right">
                        {count} ({percentage.toFixed(0)}%)
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Evaluations Tab */}
        <TabsContent value="evaluations" className="space-y-6">
          {evaluations.length === 0 ? (
            <Card className="bg-black/40 backdrop-blur-xl border-purple-500/30">
              <CardContent className="text-center py-12">
                <Star className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-400 mb-2">Aucune évaluation pour cette période</p>
                <p className="text-sm text-gray-500">
                  Les évaluations apparaîtront ici lorsque vos clients noteront votre travail
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {evaluations.map((evaluation) => (
                <Card key={evaluation.id} className="bg-black/40 backdrop-blur-xl border-purple-500/30 overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-yellow-500/10 rounded-lg">
                          <Star className="w-4 h-4 text-yellow-400" />
                        </div>
                        <div>
                          <CardTitle className="text-base text-white">Évaluation reçue</CardTitle>
                          <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(evaluation.date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                          </div>
                        </div>
                      </div>
                      {evaluation.project_title && (
                        <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/30">
                          {evaluation.project_title}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {/* Tâche évaluée */}
                      <div className="text-sm">
                        <span className="text-gray-400">Tâche :</span>
                        <span className="ml-2 font-medium text-white">{evaluation.task_title || 'Tâche'}</span>
                      </div>

                      {/* Note */}
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={cn(
                                "w-5 h-5",
                                evaluation.rating && evaluation.rating >= star
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-600"
                              )}
                            />
                          ))}
                        </div>
                        <span className={cn("font-medium", evaluation.rating ? getRatingColor(evaluation.rating) : "text-gray-400")}>
                          {evaluation.rating ? formatRatingLabel(evaluation.rating) : 'Non noté'}
                        </span>
                      </div>

                      {/* Commentaire */}
                      {evaluation.comment && (
                        <div className="bg-gray-800/50 p-3 rounded-lg">
                          <p className="text-sm text-gray-300">{evaluation.comment}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        {showAnalytics && (
          <TabsContent value="analytics" className="space-y-6">
            {performanceMetrics && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-black/40 backdrop-blur-xl border-green-500/30">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">{performanceMetrics.excellence_rate}%</div>
                      <div className="text-sm text-gray-400">Taux d'excellence</div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-black/40 backdrop-blur-xl border-blue-500/30">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400">{performanceMetrics.satisfaction_score}%</div>
                      <div className="text-sm text-gray-400">Score satisfaction</div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-black/40 backdrop-blur-xl border-orange-500/30">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-400">{performanceMetrics.improvement_potential}%</div>
                      <div className="text-sm text-gray-400">Potentiel d'amélioration</div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-black/40 backdrop-blur-xl border-purple-500/30">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-400">{performanceMetrics.consistency_score}%</div>
                      <div className="text-sm text-gray-400">Score consistance</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <Card className="bg-black/40 backdrop-blur-xl border-blue-500/30">
                <CardHeader>
                  <CardTitle className="text-blue-400 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Recommandations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {recommendations.map((recommendation, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-gray-300">
                        <div className="w-1 h-1 bg-blue-400 rounded-full mt-2 flex-shrink-0" />
                        {recommendation}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default ModularEvaluationsView;