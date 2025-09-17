import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Check, X, ExternalLink, Calendar, Trello, Folder, MessageSquare, Users, Target, FileText, Euro, TrendingUp, CheckCircle2, Paperclip, Download, FileIcon, AlertCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeProjectsFixed } from "@/hooks/useRealtimeProjectsFixed";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { IallaLogo } from "@/components/IallaLogo";
// import { CandidateProjectCard } from "@/components/candidate/CandidateProjectCard"; // Remplacé par UnifiedProjectCard
import { CandidateProjectCardUnified as CandidateProjectCard } from "@/components/UnifiedProjectCard";
import { useProjectFiles } from "@/hooks/useProjectFiles";

interface ProjectDetail {
  id: string;
  title: string;
  description?: string;
  status: string;
  project_date: string;
  due_date?: string;
  client_budget?: number;
  assignment_id?: string;
  booking_status?: string;
}

const CandidateProjectsFixed = () => {
  // Component state
  const [isLoading, setIsLoading] = useState(false);
  const [currentCandidateId, setCurrentCandidateId] = useState<string | null>(null);
  
  // UI STATE
  const [selectedProject, setSelectedProject] = useState<ProjectDetail | null>(null);
  const { user } = useAuth();
  
  // Project files for selected project  
  const { files: projectFiles, downloadFile, loading: filesLoading } = useProjectFiles(selectedProject?.id || null);
  
  // Debug log for files
  useEffect(() => {
    if (selectedProject?.id) {
      console.log('Selected project ID:', selectedProject.id);
      console.log('Project files:', projectFiles);
      console.log('Files loading:', filesLoading);
    }
  }, [selectedProject?.id, projectFiles, filesLoading]);
  
  // DERIVED STATE: We need to fetch assignments to properly categorize projects
  const [availableProjects, setAvailableProjects] = useState<any[]>([]);
  const [acceptedProjects, setAcceptedProjects] = useState<any[]>([]);
  const [activeProjects, setActiveProjects] = useState<any[]>([]);
  const [completedProjects, setCompletedProjects] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [candidateProfileData, setCandidateProfileData] = useState<any>(null);

  // Set up real-time updates for projects and assignments
  useRealtimeProjectsFixed({
    setProjects: setAllProjects,
    setResourceAssignments: setAssignments,
    userId: user?.id,
    userType: 'candidate',
    candidateProfile: candidateProfileData
  });

  // Initialize candidate profile once
  useEffect(() => {
    const initCandidateProfile = async () => {
      if (!user?.profile?.email) return;
      
      const { data: candidateProfile } = await supabase
        .from('candidate_profiles')
        .select('id, profile_id, seniority')
        .eq('email', user.profile.email)
        .single();
      
      if (candidateProfile) {
        setCurrentCandidateId(candidateProfile.id);
        setCandidateProfileData(candidateProfile);
      }
    };
    
    initCandidateProfile();
  }, [user?.profile?.email]);

  // Function to categorize projects based on assignments
  const categorizeProjects = (filteredAssignments: any[], actualCandidateId: string) => {
    // Categorize based on booking_status and project status
    const available = filteredAssignments.filter(a => 
      a.booking_status === 'recherche' && a.projects && !a.candidate_id
    ).map(a => ({ ...a.projects, assignment_id: a.id, created_at: a.created_at }));
    
    const accepted = filteredAssignments.filter(a => 
      a.booking_status === 'accepted' && 
      a.projects && 
      (a.projects.status === 'attente-team' || a.projects.status === 'pause')
    ).map(a => ({ ...a.projects, assignment_id: a.id }));
    
    const active = filteredAssignments.filter(a => 
      a.booking_status === 'accepted' && 
      a.projects && 
      a.projects.status === 'play'
    ).map(a => ({ ...a.projects, assignment_id: a.id }));
    
    const completed = filteredAssignments.filter(a => 
      a.booking_status === 'accepted' && 
      a.projects && 
      a.projects.status === 'completed'
    ).map(a => ({ ...a.projects, assignment_id: a.id }));
    
    setAvailableProjects(available);
    setAcceptedProjects(accepted);
    setActiveProjects(active);
    setCompletedProjects(completed);
    
    console.log('📊 Projects categorized:', {
      available: available.length,
      accepted: accepted.length,
      active: active.length,
      completed: completed.length
    });
  };

  // Fetch initial projects and assignments
  useEffect(() => {
    const fetchAndCategorizeProjects = async () => {
      if (!user?.profile?.email) return;
      
      setIsLoading(true);
      
      try {
        // Get candidate profile WITH ID
        const { data: candidateProfile } = await supabase
          .from('candidate_profiles')
          .select('id, profile_id, seniority')
          .eq('email', user.profile.email)
          .single();
        
        if (!candidateProfile) return;
        
        // Set candidate profile data for realtime hook
        setCandidateProfileData(candidateProfile);
        
        // Use the actual candidate ID from the database
        const actualCandidateId = candidateProfile.id;
        setCurrentCandidateId(actualCandidateId);
        console.log('Using candidate ID from DB:', actualCandidateId);
        
        // Get all assignments for this candidate
        const { data: allAssignments } = await supabase
          .from('hr_resource_assignments')
          .select(`
            *,
            projects (*),
            candidate_id
          `)
          .eq('profile_id', candidateProfile.profile_id)
          .eq('seniority', candidateProfile.seniority);
        
        console.log('🔍 ALL ASSIGNMENTS DETAILS:');
        allAssignments?.forEach(a => {
          console.log(`Project: "${a.projects?.title}"`);
          console.log(`  - ID: ${a.id}`);
          console.log(`  - booking_status: ${a.booking_status}`);
          console.log(`  - candidate_id: ${a.candidate_id || 'NULL'}`);
          console.log(`  - project status: ${a.projects?.status}`);
        });
        
        if (!allAssignments) return;
        
        // Filter assignments: only show those not assigned to others AND in correct status
        const filteredAssignments = allAssignments.filter(a => {
          // If specifically assigned to another candidate, don't show
          if (a.candidate_id && a.candidate_id !== actualCandidateId) {
            console.log(`Hiding project "${a.projects?.title}" - assigned to ${a.candidate_id}, not to us (${actualCandidateId})`);
            return false;
          }
          
          // If assigned to this candidate, always show
          if (a.candidate_id === actualCandidateId) {
            console.log(`Showing project "${a.projects?.title}" - assigned to us`);
            return true;
          }
          
          // For unassigned projects, only show if in "recherche" status
          if (!a.candidate_id && a.booking_status === 'recherche') {
            console.log(`Showing project "${a.projects?.title}" - available (recherche)`);
            return true;
          }
          
          // Hide everything else
          console.log(`Hiding project "${a.projects?.title}" - status: ${a.booking_status}, candidate_id: ${a.candidate_id}`);
          return false;
        });
        
        setAssignments(filteredAssignments);
        categorizeProjects(filteredAssignments, actualCandidateId);
        
      } catch (error) {
        console.error('Error categorizing projects:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (user?.profile?.email) {
      fetchAndCategorizeProjects();
    }
  }, [user?.profile?.email]);

  // Re-categorize when assignments change from real-time updates
  useEffect(() => {
    // Allow recategorization even if assignments is empty (could be clearing)
    if (!currentCandidateId) return;
    
    console.log('🔄 Re-categorizing projects due to assignments change:', assignments.length, 'assignments');
    
    // Filter assignments again with the current candidate ID
    const filteredAssignments = assignments.filter(a => {
      // If specifically assigned to another candidate, don't show
      if (a.candidate_id && a.candidate_id !== currentCandidateId) {
        return false;
      }
      
      // If assigned to this candidate, always show
      if (a.candidate_id === currentCandidateId) {
        return true;
      }
      
      // For unassigned projects, only show if in "recherche" status
      if (!a.candidate_id && a.booking_status === 'recherche') {
        return true;
      }
      
      return false;
    });
    
    categorizeProjects(filteredAssignments, currentCandidateId);
  }, [assignments, currentCandidateId]);
  
  // No need for additional real-time channels here
  // The useRealtimeProjectsFixed hook already handles all real-time updates

  const handleAcceptMission = async (resourceAssignmentId: string) => {
    try {
      if (!user?.profile?.email) {
        throw new Error('Email utilisateur non trouvé');
      }

      const { data, error } = await supabase.functions.invoke('resource-booking', {
        body: {
          action: 'accept_mission',
          assignment_id: resourceAssignmentId,
          candidate_email: user.profile.email
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Mission acceptée avec succès !');
        refetch(); // Refresh projects
        // Fetch fresh data instead of reloading
        await fetchCandidateProjects();
      } else {
        toast.error(data.message || 'Erreur lors de l\'acceptation');
      }
    } catch (error) {
      console.error('Error accepting mission:', error);
      toast.error('Erreur lors de l\'acceptation de la mission');
    }
  };

  const handleRejectMission = async (resourceAssignmentId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('resource-booking', {
        body: {
          resourceAssignmentId,
          action: 'reject',
          candidateId: currentCandidateId
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message);
        refetch(); // Refresh projects
        setSelectedProject(null);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error('Error rejecting mission:', error);
      toast.error('Erreur lors du refus de la mission');
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const formatCurrency = (amount: number) => {
    if (!amount && amount !== 0) return '—';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const handleAcceptProject = async (project: any) => {
    try {
      if (!project.assignment_id) {
        toast.error('Informations manquantes pour accepter la mission');
        return;
      }
      
      if (!user?.profile?.email) {
        toast.error('Email utilisateur non trouvé');
        return;
      }
      
      console.log('Accepting project with assignment_id:', project.assignment_id);
      console.log('Using candidate email:', user.profile.email);
      
      // Use debug function first to understand the issue
      const { data: debugData, error: debugError } = await supabase.functions.invoke('debug-accept-mission', {
        body: {
          assignment_id: project.assignment_id,
          candidate_email: user.profile.email
        }
      });

      if (debugError) {
        console.error('Debug error:', debugError);
        console.log('Debug response:', debugData);
      }

      // If debug succeeds, it already accepted the mission
      const data = debugData;
      const error = debugError;

      if (error) throw error;

      if (data?.success) {
        toast.success('Mission acceptée avec succès !');
        // Fetch fresh data instead of reloading
        await fetchCandidateProjects();
      } else {
        toast.error(data?.message || 'Erreur lors de l\'acceptation');
      }
    } catch (error) {
      console.error('Error accepting project:', error);
      toast.error('Erreur lors de l\'acceptation du projet');
    }
  };

  const handleDeclineProject = async (project: any) => {
    toast.info('Mission refusée');
    // TODO: Implement decline logic
  };

  const handleViewDetails = (project: any) => {
    // Get the booking status from the assignment
    const assignment = assignments.find(a => a.projects?.id === project.id);
    
    setSelectedProject({
      id: project.id,
      title: project.title,
      description: project.description,
      status: project.status,
      project_date: project.project_date,
      due_date: project.due_date,
      client_budget: project.client_budget,
      assignment_id: project.assignment_id,
      booking_status: assignment?.booking_status || 'recherche'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des projets...</p>
        </div>
      </div>
    );
  }

  if (!currentCandidateId) {
    return (
      <Alert>
        <AlertTitle>Aucun profil candidat</AlertTitle>
        <AlertDescription>
          Aucun profil candidat n'a été trouvé pour votre compte. Veuillez contacter un administrateur.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec design Ialla */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-50 via-white to-pink-50 border border-gray-100">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-pink-600/10" />
        <div className="relative p-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Target className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Mes projets
              </h2>
              <p className="text-gray-600 mt-2 text-lg">
                Gérez vos demandes et missions en cours
              </p>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="available" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-gradient-to-r from-purple-50 to-pink-50 p-1 rounded-xl border border-gray-200/50 shadow-sm mb-4">
          <TabsTrigger 
            value="available"
            className="relative text-sm font-medium transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-purple-200 data-[state=active]:text-purple-700 hover:bg-white/50 rounded-lg py-3 px-4 pb-4"
          >
            <span className="flex items-center gap-2">
              Nouvelles demandes
              {availableProjects.length > 0 && (
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                  {availableProjects.length}
                </span>
              )}
            </span>
          </TabsTrigger>
          <TabsTrigger 
            value="accepted"
            className="relative text-sm font-medium transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-purple-200 data-[state=active]:text-purple-700 hover:bg-white/50 rounded-lg py-3 px-4 pb-4"
          >
            <span className="flex items-center gap-2">
              Projets acceptés
              {acceptedProjects.length > 0 && (
                <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                  {acceptedProjects.length}
                </span>
              )}
            </span>
          </TabsTrigger>
          <TabsTrigger 
            value="active"
            className="relative text-sm font-medium transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-green-200 data-[state=active]:text-green-700 hover:bg-white/50 rounded-lg py-3 px-4 pb-4"
          >
            <span className="flex items-center gap-2">
              Projets en cours
              {activeProjects.length > 0 && (
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                  {activeProjects.length}
                </span>
              )}
            </span>
          </TabsTrigger>
          <TabsTrigger 
            value="completed"
            className="relative text-sm font-medium transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-purple-200 data-[state=active]:text-purple-700 hover:bg-white/50 rounded-lg py-3 px-4 pb-4"
          >
            <span className="flex items-center gap-2">
              Projets terminés
              {completedProjects.length > 0 && (
                <span className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                  {completedProjects.length}
                </span>
              )}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="mt-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">Nouveaux projets disponibles</h2>
            <p className="text-gray-600">Projets qui correspondent à votre profil et sont ouverts aux candidatures.</p>
          </div>
          
          {availableProjects.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="text-gray-500">
                <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">Aucun nouveau projet</h3>
                <p>Aucun projet disponible ne correspond actuellement à votre profil.</p>
              </div>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {availableProjects.map(project => (
                <CandidateProjectCard
                  key={project.id}
                  project={project}
                  type="available"
                  onAccept={() => handleAcceptProject(project)}
                  onDecline={() => handleDeclineProject(project)}
                  onViewDetails={() => handleViewDetails(project)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="accepted" className="mt-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">Projets acceptés</h2>
            <p className="text-gray-600">Projets que vous avez acceptés et qui sont en attente de constitution d'équipe.</p>
          </div>
          
          {acceptedProjects.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="text-gray-500">
                <Check className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">Aucun projet accepté</h3>
                <p>Vous n'avez pas encore accepté de projet.</p>
              </div>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {acceptedProjects.map(project => (
                <CandidateProjectCard
                  key={project.id}
                  project={project}
                  type="accepted"
                  onViewDetails={() => handleViewDetails(project)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="mt-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">Projets en cours</h2>
            <p className="text-gray-600">Projets actifs sur lesquels vous travaillez actuellement.</p>
          </div>
          
          {activeProjects.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">Aucun projet en cours</h3>
                <p>Vous n'avez pas de projet actif pour le moment.</p>
              </div>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {activeProjects.map(project => (
                <CandidateProjectCard
                  key={project.id}
                  project={project}
                  type="active"
                  onViewDetails={() => handleViewDetails(project)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">Projets terminés</h2>
            <p className="text-gray-600">Projets que vous avez terminés avec succès.</p>
          </div>
          
          {completedProjects.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="text-gray-500">
                <Folder className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">Aucun projet terminé</h3>
                <p>Vous n'avez pas encore terminé de projet.</p>
              </div>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {completedProjects.map(project => (
                <CandidateProjectCard
                  key={project.id}
                  project={project}
                  type="completed"
                  onViewDetails={() => handleViewDetails(project)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Project Detail Modal - Redesigned with Ialla Identity */}
      <Dialog open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0 border-0">
          {/* Gradient Header */}
          <div className="relative bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 p-8 text-white">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />
            <div className="relative z-10">
              <DialogTitle className="text-3xl font-bold mb-2 text-white drop-shadow-lg">
                {selectedProject?.title}
              </DialogTitle>
              <DialogDescription className="text-green-50 text-lg font-medium">
                Détails complets du projet
              </DialogDescription>
            </div>
            {/* Decorative shapes */}
            <div className="absolute -bottom-1 left-0 right-0 h-12 bg-white" 
                 style={{ clipPath: 'polygon(0 40%, 100% 0, 100% 100%, 0% 100%)' }} />
          </div>
          
          {selectedProject && (
            <div className="p-8 overflow-y-auto max-h-[calc(90vh-200px)] bg-gradient-to-br from-white via-green-50/30 to-emerald-50/30">
              {/* Description Section */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Description du projet
                  </h4>
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50 shadow-sm">
                  <p className="text-gray-700 leading-relaxed text-base">
                    {selectedProject.description || 'Aucune description disponible pour ce projet.'}
                  </p>
                </div>
              </div>
              
              {/* Timeline & Budget Grid */}
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                {/* Timeline Card */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200/50 shadow-sm hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <h4 className="text-lg font-bold text-green-900">
                      Calendrier du projet
                    </h4>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white/70 rounded-lg">
                      <span className="text-sm font-medium text-gray-600">Date de début</span>
                      <span className="font-bold text-green-700">{formatDate(selectedProject.project_date)}</span>
                    </div>
                    
                    {selectedProject.due_date && (
                      <div className="flex items-center justify-between p-3 bg-white/70 rounded-lg">
                        <span className="text-sm font-medium text-gray-600">Date de fin</span>
                        <span className="font-bold text-green-700">{formatDate(selectedProject.due_date)}</span>
                      </div>
                    )}
                    
                    {selectedProject.due_date && (
                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg border border-green-300">
                        <span className="text-sm font-medium text-green-800">Durée estimée</span>
                        <span className="font-bold text-green-900">
                          {(() => {
                            const start = new Date(selectedProject.project_date);
                            const end = new Date(selectedProject.due_date);
                            const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                            if (days < 30) return `${days} jours`;
                            return `${Math.round(days / 30)} mois`;
                          })()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Budget Card */}
                {selectedProject.client_budget && (
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200/50 shadow-sm hover:shadow-lg transition-shadow">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                        <Euro className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="text-lg font-bold text-blue-900">
                        Budget & Rémunération
                      </h4>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="p-4 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg border border-blue-300">
                        <p className="text-sm font-medium text-blue-800 mb-1">Budget total du projet</p>
                        <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                          {formatCurrency(selectedProject.client_budget)}
                        </p>
                      </div>
                      
                      <div className="p-3 bg-white/70 rounded-lg">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-gray-600">
                            Taux journalier estimé disponible après validation
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Attached Files Section */}
              {projectFiles && projectFiles.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg">
                      <Paperclip className="w-5 h-5 text-white" />
                    </div>
                    <h4 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                      Fichiers joints ({projectFiles.length})
                    </h4>
                  </div>
                  
                  <div className="grid gap-3">
                    {projectFiles.map((file) => (
                      <div 
                        key={file.id}
                        className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-200/50 hover:shadow-md transition-all cursor-pointer group"
                        onClick={() => downloadFile(file)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                              <FileIcon className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{file.file_name}</p>
                              <p className="text-sm text-gray-600">
                                {file.file_size ? `${Math.round(file.file_size / 1024)} KB • ` : ''}
                                Ajouté le {new Date(file.uploaded_at).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="group-hover:bg-white transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadFile(file);
                            }}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Télécharger
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Accept button for available projects */}
              {selectedProject.booking_status === 'recherche' && selectedProject.assignment_id && (
                <div className="flex justify-center mb-6">
                  <Button
                    onClick={() => {
                      handleAcceptProject(selectedProject);
                      setSelectedProject(null);
                    }}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-8 py-3 text-lg font-semibold shadow-lg"
                  >
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Accepter cette mission
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CandidateProjectsFixed;