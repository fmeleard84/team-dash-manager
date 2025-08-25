import { useState, useEffect } from 'react';
import { Clock, Play, Pause, Square, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface Project {
  id: string;
  title: string;
  status: string;
  client_budget?: number;
}

export const TimeTrackerSimple = () => {
  const { user } = useAuth();
  const { 
    activeSession, 
    candidateRate,
    loading, 
    startSession, 
    togglePause, 
    stopSession,
    formatTime 
  } = useTimeTracking();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [activityDescription, setActivityDescription] = useState('');
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Load all projects where candidate is assigned
  useEffect(() => {
    const loadProjects = async () => {
      if (!user?.email) return;
      
      setLoadingProjects(true);
      try {
        // Get candidate profile
        const { data: candidateProfile } = await supabase
          .from('candidate_profiles')
          .select('id, profile_id, seniority')
          .eq('email', user.email)
          .single();
        
        if (!candidateProfile) {
          console.log('No candidate profile found');
          setLoadingProjects(false);
          return;
        }

        // Get all assignments for this candidate
        const { data: assignments, error: assignmentsError } = await supabase
          .from('hr_resource_assignments')
          .select(`
            id,
            booking_status,
            project_id,
            projects (
              id,
              title,
              status,
              client_budget
            )
          `)
          .or(`candidate_id.eq.${candidateProfile.id},and(profile_id.eq.${candidateProfile.profile_id},seniority.eq.${candidateProfile.seniority})`)
          .eq('booking_status', 'accepted');

        if (assignmentsError) {
          console.error('Error loading assignments:', assignmentsError);
          setLoadingProjects(false);
          return;
        }

        console.log('Found assignments:', assignments);

        // Filter projects that are in 'play' status
        const activeProjects = (assignments || [])
          .filter(a => a.projects && a.projects.status === 'play')
          .map(a => a.projects as Project);

        console.log('Active projects:', activeProjects);
        setProjects(activeProjects);
      } catch (error) {
        console.error('Error loading projects:', error);
      } finally {
        setLoadingProjects(false);
      }
    };

    loadProjects();
  }, [user?.email]);

  const handleStart = async () => {
    if (!selectedProjectId || !activityDescription.trim()) {
      return;
    }

    const project = projects.find(p => p.id === selectedProjectId);
    if (!project) return;

    await startSession(
      selectedProjectId, 
      project.title, 
      activityDescription.trim()
    );

    // Reset form and close popover
    setSelectedProjectId('');
    setActivityDescription('');
    setIsOpen(false);
  };

  const handleStop = () => {
    if (window.confirm('Voulez-vous vraiment arrêter le chronomètre ?')) {
      stopSession();
    }
  };

  // If there's an active session, show the timer
  if (activeSession) {
    return (
      <div className="flex items-center gap-2">
        {/* Timer display */}
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg border",
          activeSession.isPaused 
            ? "bg-orange-50 border-orange-200" 
            : "bg-green-50 border-green-200 animate-pulse"
        )}>
          <Timer className={cn(
            "w-4 h-4",
            activeSession.isPaused ? "text-orange-600" : "text-green-600"
          )} />
          <span className="font-mono font-semibold text-sm">
            {formatTime(activeSession.elapsedSeconds)}
          </span>
          <div className="flex flex-col items-start ml-2">
            <span className="text-xs font-medium text-gray-700 line-clamp-1 max-w-[150px]">
              {activeSession.projectTitle}
            </span>
            <span className="text-xs text-gray-500">
              {(activeSession.currentCost).toFixed(2)}€
            </span>
          </div>
        </div>

        {/* Control buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={togglePause}
            disabled={loading}
          >
            {activeSession.isPaused ? (
              <Play className="w-4 h-4 text-green-600" />
            ) : (
              <Pause className="w-4 h-4 text-orange-600" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleStop}
            disabled={loading}
          >
            <Square className="w-4 h-4 text-red-600" />
          </Button>
        </div>
      </div>
    );
  }

  // Otherwise show the start button
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="relative"
        >
          <Clock className="w-5 h-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-4" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Timer className="w-4 h-4" />
              Démarrer un chronomètre
            </h3>
            {candidateRate > 0 && (
              <Badge variant="secondary" className="text-xs">
                {candidateRate.toFixed(2)}€/min
              </Badge>
            )}
          </div>

          {loadingProjects ? (
            <div className="text-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
              <p className="text-sm text-muted-foreground">Chargement des projets...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Aucun projet actif</p>
              <p className="text-xs mt-1">
                Vous devez avoir un projet en cours (status "play") pour démarrer le chronomètre
              </p>
            </div>
          ) : (
            <>
              {/* Project selector */}
              <div className="space-y-2">
                <Label htmlFor="project">Projet</Label>
                <Select 
                  value={selectedProjectId} 
                  onValueChange={setSelectedProjectId}
                >
                  <SelectTrigger id="project">
                    <SelectValue placeholder="Sélectionner un projet" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem 
                        key={project.id} 
                        value={project.id}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>{project.title}</span>
                          {project.client_budget && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              {project.client_budget}€
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Activity description */}
              <div className="space-y-2">
                <Label htmlFor="activity">Activité en cours</Label>
                <Textarea
                  id="activity"
                  placeholder="Ex: Rédaction du cahier des charges, Développement de la fonctionnalité X, Réunion client..."
                  value={activityDescription}
                  onChange={(e) => setActivityDescription(e.target.value)}
                  className="min-h-[80px] resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Décrivez brièvement sur quoi vous travaillez
                </p>
              </div>

              {/* Start button */}
              <Button
                onClick={handleStart}
                disabled={!selectedProjectId || !activityDescription.trim() || loading}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
              >
                <Play className="w-4 h-4 mr-2" />
                Démarrer le chronomètre
              </Button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};