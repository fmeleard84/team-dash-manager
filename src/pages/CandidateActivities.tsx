import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FullScreenModal, ModalActions, useFullScreenModal } from '@/components/ui/fullscreen-modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Clock,
  Calendar,
  Euro,
  Activity,
  TrendingUp,
  Timer,
  FileText,
  Download,
  Edit2
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useCandidateProjectsOptimized } from '@/hooks/useCandidateProjectsOptimized';

interface TimeSession {
  id: string;
  project_id: string;
  project_title: string;
  activity_description: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  hourly_rate: number;
  total_cost: number | null;
  status: 'active' | 'paused' | 'completed';
}

interface ProjectSummary {
  projectId: string;
  projectTitle: string;
  totalMinutes: number;
  totalCost: number;
  sessionCount: number;
  lastActivity: string;
}

export default function CandidateActivities() {
  const { user } = useAuth();
  const { projects: candidateProjects } = useCandidateProjectsOptimized();
  const [sessions, setSessions] = useState<TimeSession[]>([]);
  const [projectSummaries, setProjectSummaries] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'all'>('month');
  
  // Edit duration modal states
  const editModal = useFullScreenModal();
  const [editingSession, setEditingSession] = useState<TimeSession | null>(null);
  const [editHours, setEditHours] = useState('0');
  const [editMinutes, setEditMinutes] = useState('0');
  const [editComment, setEditComment] = useState('');
  const [updating, setUpdating] = useState(false);

  const loadSessions = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Get candidate profile (using unified ID)
      const { data: candidateProfile } = await supabase
        .from('candidate_profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!candidateProfile) return;

      // Build query
      let query = supabase
        .from('time_tracking_sessions')
        .select(`
          *,
          projects (
            title
          )
        `)
        .eq('candidate_id', candidateProfile.id)
        .order('start_time', { ascending: false });

      // Apply date filter
      if (dateRange === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte('start_time', weekAgo.toISOString());
      } else if (dateRange === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        query = query.gte('start_time', monthAgo.toISOString());
      }

      // Apply project filter
      if (selectedProjectId !== 'all') {
        query = query.eq('project_id', selectedProjectId);
      }

      const { data: sessionsData, error } = await query;

      if (error) throw error;

      // Format sessions
      const formattedSessions: TimeSession[] = (sessionsData || []).map(s => ({
        id: s.id,
        project_id: s.project_id,
        project_title: s.projects?.title || 'Projet',
        activity_description: s.activity_description,
        start_time: s.start_time,
        end_time: s.end_time,
        duration_minutes: s.duration_minutes,
        hourly_rate: s.hourly_rate,
        total_cost: s.total_cost,
        status: s.status
      }));

      setSessions(formattedSessions);

      // Calculate project summaries
      const summaries = new Map<string, ProjectSummary>();
      
      formattedSessions.forEach(session => {
        if (session.status !== 'completed') return;
        
        const existing = summaries.get(session.project_id) || {
          projectId: session.project_id,
          projectTitle: session.project_title,
          totalMinutes: 0,
          totalCost: 0,
          sessionCount: 0,
          lastActivity: session.start_time
        };

        existing.totalMinutes += session.duration_minutes || 0;
        existing.totalCost += session.total_cost || 0;
        existing.sessionCount += 1;
        if (session.start_time > existing.lastActivity) {
          existing.lastActivity = session.start_time;
        }

        summaries.set(session.project_id, existing);
      });

      setProjectSummaries(Array.from(summaries.values()));
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast.error('Erreur lors du chargement des activités');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [user?.email, selectedProjectId, dateRange]);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  };

  const exportToCSV = () => {
    const csv = [
      ['Date', 'Projet', 'Activité', 'Durée (min)', 'Tarif/min', 'Coût total'],
      ...sessions
        .filter(s => s.status === 'completed')
        .map(s => [
          format(new Date(s.start_time), 'dd/MM/yyyy HH:mm'),
          s.project_title,
          s.activity_description,
          s.duration_minutes || 0,
          s.hourly_rate,
          s.total_cost || 0
        ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activites_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Open edit modal for a session
  const openEditModal = (session: TimeSession) => {
    if (session.status !== 'completed') {
      toast.error('Vous ne pouvez modifier que les sessions terminées');
      return;
    }
    
    const totalMinutes = session.duration_minutes || 0;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    setEditingSession(session);
    setEditHours(hours.toString());
    setEditMinutes(minutes.toString());
    setEditComment(''); // Reset comment
    editModal.open();
  };

  // Update session duration
  const updateSessionDuration = async () => {
    if (!editingSession) return;
    
    // Validate comment
    if (!editComment.trim()) {
      toast.error('Veuillez expliquer la raison de cette modification');
      return;
    }
    
    setUpdating(true);
    try {
      const hours = parseInt(editHours) || 0;
      const minutes = parseInt(editMinutes) || 0;
      const totalMinutes = hours * 60 + minutes;
      
      if (totalMinutes <= 0) {
        toast.error('La durée doit être supérieure à 0');
        setUpdating(false);
        return;
      }
      
      const newCost = totalMinutes * editingSession.hourly_rate;
      
      // Store the edit history with comment
      const editHistory = {
        edited_at: new Date().toISOString(),
        old_duration: editingSession.duration_minutes,
        new_duration: totalMinutes,
        reason: editComment.trim(),
        edited_by: user?.email
      };
      
      // Try to update with edit history, fallback if column doesn't exist
      let updateData: any = {
        duration_minutes: totalMinutes,
        total_cost: newCost,
        updated_at: new Date().toISOString()
      };
      
      // Check if edit_history column exists by trying to get it
      const { data: currentSession, error: fetchError } = await supabase
        .from('time_tracking_sessions')
        .select('id')
        .eq('id', editingSession.id)
        .single();
      
      // If we can fetch the session, try to add edit_history
      if (!fetchError) {
        // Try with edit_history first
        const { error: testError } = await supabase
          .from('time_tracking_sessions')
          .select('edit_history')
          .eq('id', editingSession.id)
          .single();
        
        // If edit_history column exists, use it
        if (!testError) {
          const { data: sessionWithHistory } = await supabase
            .from('time_tracking_sessions')
            .select('edit_history')
            .eq('id', editingSession.id)
            .single();
          
          const currentHistory = sessionWithHistory?.edit_history || [];
          updateData.edit_history = [...currentHistory, editHistory];
        } else {
          // If edit_history doesn't exist, store comment in activity_description
          updateData.activity_description = editingSession.activity_description + 
            ` | Modifié: ${editComment.trim()} (${new Date().toLocaleDateString('fr-FR')})`;
        }
      }
      
      const { error } = await supabase
        .from('time_tracking_sessions')
        .update(updateData)
        .eq('id', editingSession.id);

      if (error) throw error;

      toast.success('Durée mise à jour avec succès');
      editModal.close();
      await loadSessions(); // Refresh the list
    } catch (error) {
      console.error('Error updating duration:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setUpdating(false);
    }
  };

  // Use candidate projects from the optimized hook (same as Drive and Planning)
  // This ensures consistency across all sections
  const uniqueProjects = candidateProjects.map(project => ({
    id: project.id,
    title: project.title
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des activités...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filters - Style unifié avec le planning */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
        <div className="relative p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              
              {/* Filters integrated in header */}
              <div className="flex items-center gap-3">
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger className="w-56 bg-white/90 backdrop-blur-sm border-white/20">
                    <SelectValue placeholder="Tous les projets" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les projets</SelectItem>
                    {uniqueProjects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={dateRange} onValueChange={(v) => setDateRange(v as 'week' | 'month' | 'all')}>
                  <SelectTrigger className="w-48 bg-white/90 backdrop-blur-sm border-white/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Cette semaine</SelectItem>
                    <SelectItem value="month">Ce mois</SelectItem>
                    <SelectItem value="all">Tout</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Button
              onClick={exportToCSV}
              variant="secondary"
              className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-white/20"
            >
              <Download className="w-4 h-4 mr-2" />
              Exporter CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {projectSummaries.map(summary => (
          <Card key={summary.projectId} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg line-clamp-1">{summary.projectTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{formatDuration(summary.totalMinutes)}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {summary.sessionCount} session{summary.sessionCount > 1 ? 's' : ''}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Euro className="w-4 h-4 text-gray-400" />
                  <span className="font-semibold text-green-600">
                    {summary.totalCost.toFixed(2)}€
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  Dernière: {format(new Date(summary.lastActivity), 'dd MMM', { locale: fr })}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="w-5 h-5" />
            Historique détaillé
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {sessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Aucune activité enregistrée</p>
                </div>
              ) : (
                sessions.map(session => (
                  <div
                    key={session.id}
                    className={cn(
                      "p-4 rounded-lg border transition-colors",
                      session.status === 'active' && "bg-green-50 border-green-200",
                      session.status === 'paused' && "bg-orange-50 border-orange-200",
                      session.status === 'completed' && "hover:bg-gray-50"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={session.status === 'completed' ? 'secondary' : 'default'}>
                            {session.project_title}
                          </Badge>
                          {session.status === 'active' && (
                            <Badge className="bg-green-500 text-white animate-pulse">
                              En cours
                            </Badge>
                          )}
                          {session.status === 'paused' && (
                            <Badge className="bg-orange-500 text-white">
                              En pause
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium">{session.activity_description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(session.start_time), 'dd MMM yyyy HH:mm', { locale: fr })}
                          </span>
                          {session.duration_minutes && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDuration(session.duration_minutes)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        {session.total_cost && (
                          <div className="text-right">
                            <p className="text-lg font-semibold text-green-600">
                              {session.total_cost.toFixed(2)}€
                            </p>
                            <p className="text-xs text-gray-500">
                              {session.hourly_rate}€/min
                            </p>
                          </div>
                        )}
                        {session.status === 'completed' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditModal(session)}
                            className="h-8 w-8"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Edit Duration Modal */}
      <FullScreenModal
        isOpen={editModal.isOpen}
        onClose={editModal.close}
        title="Modifier la durée de l'activité"
        description="Ajustez la durée de cette session si vous avez oublié de démarrer ou arrêter le chronomètre au bon moment."
        actions={
          <ModalActions
            onSave={updateSessionDuration}
            onCancel={editModal.close}
            saveText={updating ? 'Mise à jour...' : 'Sauvegarder'}
            saveDisabled={updating || !editComment.trim()}
            isLoading={updating}
          />
        }
      >
        {editingSession && (
          <div className="space-y-6">
            {/* Session Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informations de la session</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Projet</p>
                    <p className="font-medium">{editingSession.project_title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium">
                      {format(new Date(editingSession.start_time), 'dd MMM yyyy HH:mm', { locale: fr })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Durée actuelle</p>
                    <p className="font-medium">{formatDuration(editingSession.duration_minutes || 0)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Activité</p>
                  <p className="font-medium">{editingSession.activity_description}</p>
                </div>
              </CardContent>
            </Card>

            {/* Duration Edit Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Nouvelle durée</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="hours">Heures</Label>
                    <Input
                      id="hours"
                      type="number"
                      min="0"
                      value={editHours}
                      onChange={(e) => setEditHours(e.target.value)}
                      className="text-lg"
                    />
                  </div>
                  <div>
                    <Label htmlFor="minutes">Minutes</Label>
                    <Input
                      id="minutes"
                      type="number"
                      min="0"
                      max="59"
                      value={editMinutes}
                      onChange={(e) => setEditMinutes(e.target.value)}
                      className="text-lg"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 mb-2">Calcul du nouveau coût</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {(parseInt(editHours) || 0)} h {(parseInt(editMinutes) || 0)} min × {editingSession.hourly_rate}€/min
                    </span>
                    <span className="text-lg font-bold text-green-600">
                      {((parseInt(editHours) || 0) * 60 + (parseInt(editMinutes) || 0)) * editingSession.hourly_rate}€
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reason Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Raison de la modification</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  id="comment"
                  placeholder="Ex: J'ai oublié de démarrer le chronomètre au début de la réunion..."
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  className="min-h-[120px]"
                  required
                />
                <p className="text-xs text-muted-foreground mt-2">
                  <span className="text-orange-500">⚠️</span> Ce commentaire sera visible par le client et servira de justification pour cette modification.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </FullScreenModal>
    </div>
  );
}