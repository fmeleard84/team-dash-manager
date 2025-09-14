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
  calculated_price?: number; // Taux par minute pour ce projet
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
      if (!user?.id) return;
      
      setLoadingProjects(true);
      try {
        // Get candidate profile
        const { data: candidateProfile } = await supabase
          .from('candidate_profiles')
          .select('id, profile_id, seniority')
          .eq('id', user.id)
          .single();
        
        if (!candidateProfile) {
          console.log('No candidate profile found');
          setLoadingProjects(false);
          return;
        }

        // Get all assignments for this candidate with calculated_price
        const { data: assignments, error: assignmentsError } = await supabase
          .from('hr_resource_assignments')
          .select(`
            id,
            booking_status,
            project_id,
            calculated_price,
            projects (
              id,
              title,
              status,
              client_budget,
              archived_at
            )
          `)
          .eq('candidate_id', user.id)
          .eq('booking_status', 'accepted');

        if (assignmentsError) {
          console.error('Error loading assignments:', assignmentsError);
          setLoadingProjects(false);
          return;
        }

        console.log('Found assignments:', assignments);

        // Filter projects that are in 'play' status and not archived, include calculated_price
        const activeProjects = (assignments || [])
          .filter(a => a.projects && a.projects.status === 'play' && !a.projects.archived_at)
          .map(a => ({
            ...a.projects,
            calculated_price: a.calculated_price
          } as Project));

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

  // If there's an active session, show the timer with neon design
  if (activeSession) {
    return (
      <div className="flex items-center gap-3">
        {/* Timer display with neon design */}
        <div className={cn(
          "relative flex items-center gap-3 px-4 py-2 rounded-xl backdrop-blur-xl border transition-all duration-300",
          activeSession.isPaused
            ? "bg-orange-500/10 border-orange-500/30 shadow-lg shadow-orange-500/10"
            : "bg-gradient-to-r from-primary-500/10 to-secondary-500/10 border-primary-500/30 shadow-lg shadow-primary-500/20"
        )}>
          {/* Glow effect */}
          {!activeSession.isPaused && (
            <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-xl blur-lg opacity-20 animate-pulse" />
          )}

          <Timer className={cn(
            "w-5 h-5 relative z-10",
            activeSession.isPaused ? "text-orange-500" : "text-primary-500"
          )} />

          <div className="relative z-10 flex items-center gap-3">
            <span className={cn(
              "font-mono font-bold text-lg",
              activeSession.isPaused ? "text-orange-500" : "bg-gradient-to-r from-primary-500 to-secondary-500 text-transparent bg-clip-text"
            )}>
              {formatTime(activeSession.elapsedSeconds)}
            </span>

            <div className="flex flex-col items-start">
              <span className="text-xs font-medium text-white line-clamp-1 max-w-[150px]">
                {activeSession.projectTitle}
              </span>
              <span className={cn(
                "text-xs font-semibold",
                activeSession.isPaused ? "text-orange-400" : "text-secondary-400"
              )}>
                {(activeSession.currentCost).toFixed(2)}€
              </span>
            </div>
          </div>
        </div>

        {/* Control buttons with neon style */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 border border-primary-500/30 hover:bg-primary-500/10 hover:border-primary-500/50 transition-all duration-200"
            onClick={togglePause}
            disabled={loading}
          >
            {activeSession.isPaused ? (
              <Play className="w-4 h-4 text-primary-500" />
            ) : (
              <Pause className="w-4 h-4 text-orange-500" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 border border-red-500/30 hover:bg-red-500/10 hover:border-red-500/50 transition-all duration-200"
            onClick={handleStop}
            disabled={loading}
          >
            <Square className="w-4 h-4 text-red-500" />
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
                Vous devez avoir un projet actif (non en pause) pour démarrer le chronomètre
              </p>
              <p className="text-xs mt-1 text-orange-600">
                Les projets en pause ne permettent pas le suivi du temps
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
                          <div className="flex items-center gap-2">
                            {project.calculated_price && (
                              <Badge variant="secondary" className="text-xs">
                                {project.calculated_price.toFixed(2)}€/min
                              </Badge>
                            )}
                            {project.client_budget && (
                              <Badge variant="outline" className="text-xs">
                                Budget: {project.client_budget}€
                              </Badge>
                            )}
                          </div>
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