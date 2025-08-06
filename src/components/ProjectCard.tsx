import { useState, useEffect } from "react";
import { Card, CardHeader, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Play, Pause, Eye, Trash2, ExternalLink, Users } from "lucide-react";
import { Badge } from "./ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useKeycloakAuth } from "@/contexts/KeycloakAuthContext";

interface Project {
  id: string;
  title: string;
  description?: string;
  price: number;
  date: string;
  status: string;
}

interface ResourceAssignment {
  id: string;
  profile_id: string;
  booking_status: string;
  hr_profiles: {
    name: string;
  };
}

interface ProjectCardProps {
  project: Project;
  onStatusToggle: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onView: (id: string) => void;
}

interface PlankaProject {
  planka_url: string;
}

export function ProjectCard({ project, onStatusToggle, onDelete, onView }: ProjectCardProps) {
  const { user } = useKeycloakAuth();
  const [plankaProject, setPlankaProject] = useState<PlankaProject | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [resourceAssignments, setResourceAssignments] = useState<ResourceAssignment[]>([]);
  const [isBookingTeam, setIsBookingTeam] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  useEffect(() => {
    checkPlankaProject();
    fetchResourceAssignments();
  }, [project.id]);

  const fetchResourceAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('hr_resource_assignments')
        .select(`
          id,
          profile_id,
          booking_status,
          hr_profiles (
            name
          )
        `)
        .eq('project_id', project.id);

      if (error) {
        console.error('Error fetching resource assignments:', error);
        return;
      }

      setResourceAssignments(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const checkPlankaProject = async () => {
    if (isChecked) return;
    
    try {
      const { data, error } = await supabase
        .from('planka_projects')
        .select('planka_url')
        .eq('project_id', project.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking Planka project:', error);
        return;
      }

      if (data) {
        setPlankaProject({ planka_url: data.planka_url });
      }
      
      setIsChecked(true);
    } catch (error) {
      console.error('Error checking Planka project:', error);
    }
  };

  const handleStatusToggle = async () => {
    // Check if all resources are booked before allowing play
    const allResourcesBooked = resourceAssignments.every(assignment => assignment.booking_status === 'booké');
    
    if (project.status === 'pause' && !allResourcesBooked) {
      toast.error('Toutes les ressources doivent être bookées avant de démarrer le projet');
      return;
    }

    const newStatus = project.status === 'play' ? 'pause' : 'play';
    
    // If switching to play, create Keycloak project and sync with Planka
    if (newStatus === 'play') {
      try {
        setIsSyncing(true);
        
        // Create Keycloak project group and add team members
        await createKeycloakProjectGroup();
        
        // Sync with Planka
        await syncWithPlanka();
        
        // Update project status
        await onStatusToggle(project.id, newStatus);
        
        toast.success('Projet démarré avec succès ! Équipe créée et espace de travail prêt.');
      } catch (error) {
        console.error('Error starting project:', error);
        toast.error('Erreur lors du démarrage du projet');
        return;
      } finally {
        setIsSyncing(false);
      }
    } else {
      // Simple pause
      await onStatusToggle(project.id, newStatus);
    }
  };

  const handleBookingTeam = async () => {
    setIsBookingTeam(true);
    try {
      const { data, error } = await supabase.functions.invoke('resource-booking', {
        body: {
          projectId: project.id,
          action: 'find_candidates'
        }
      });

      if (error) throw error;

      toast.success(data.message);
      // Refresh resource assignments to update status
      await fetchResourceAssignments();
    } catch (error) {
      console.error('Error booking team:', error);
      toast.error('Erreur lors de la recherche d\'équipe');
    } finally {
      setIsBookingTeam(false);
    }
  };

  const createKeycloakProjectGroup = async () => {
    try {
      console.log('Creating Keycloak project group...');
      
      // Create the project group
      const { data: groupData, error: groupError } = await supabase.functions.invoke('keycloak-user-management', {
        body: {
          action: 'create-project-group',
          projectId: project.id,
          groupName: `Projet-${project.title.replace(/\s+/g, '-')}`
        }
      });

      if (groupError) throw groupError;
      
      console.log('Project group created:', groupData);

      // Get all booked resources for this project
      const { data: bookedResources, error: resourceError } = await supabase
        .from('project_bookings')
        .select(`
          candidate_id,
          candidate_profiles (
            keycloak_user_id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('project_id', project.id)
        .eq('status', 'accepted');

      if (resourceError) throw resourceError;

      // Get project owner (client)
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select(`
          keycloak_user_id,
          title
        `)
        .eq('id', project.id)
        .single();

      if (projectError) throw projectError;

      // Add each team member to the group
      const members = [];
      
      // Add client to the group
      if (projectData?.keycloak_user_id) {
        try {
          const { data: addClientData, error: addClientError } = await supabase.functions.invoke('keycloak-user-management', {
            body: {
              action: 'add-user-to-group',
              userId: projectData.keycloak_user_id,
              groupId: groupData.groupId
            }
          });
          
          if (!addClientError) {
            members.push('Client (propriétaire)');
          }
        } catch (error) {
          console.warn('Failed to add client to group:', error);
        }
      }

      // Add each booked resource to the group
      if (bookedResources) {
        for (const booking of bookedResources) {
          const candidate = booking.candidate_profiles;
          if (candidate?.keycloak_user_id) {
            try {
              const { data: addMemberData, error: addMemberError } = await supabase.functions.invoke('keycloak-user-management', {
                body: {
                  action: 'add-user-to-group',
                  userId: candidate.keycloak_user_id,
                  groupId: groupData.groupId
                }
              });
              
              if (!addMemberError) {
                members.push(`${candidate.first_name} ${candidate.last_name}`);
              }
            } catch (error) {
              console.warn(`Failed to add ${candidate.email} to group:`, error);
            }
          }
        }
      }

      console.log(`Keycloak project group created with ${members.length} members:`, members);
      return { success: true, members };
      
    } catch (error) {
      console.error('Error creating Keycloak project group:', error);
      throw error;
    }
  };

  const syncWithPlanka = async () => {
    try {
      // Get the Keycloak access token
      const token = user?.access_token;
      console.log('🔐 SYNC PLANKA - Token Debug:');
      console.log('User object:', user);
      console.log('Access token length:', token?.length || 'UNDEFINED');
      console.log('Token preview:', token ? `${token.substring(0, 50)}...` : 'NO TOKEN');
      
      if (!token) {
        console.error('❌ No authentication token available');
        throw new Error('No authentication token available');
      }

      console.log('🚀 Calling planka-integration with Keycloak token...');
      
      // Create a temporary Supabase client without auth for this request  
      // We need to bypass Supabase's automatic auth to use our Keycloak token instead
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL || 'https://egdelmcijszuapcpglsy.supabase.co'}/functions/v1/planka-integration`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U',
        },
        body: JSON.stringify({
          action: 'sync-project',
          projectId: project.id,
        }),
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Success response:', data);

      if (data.success) {
        if (data.exists) {
          console.log('Projet Planka déjà existant');
        } else {
          console.log('Projet créé avec succès dans Planka');
        }
        
        setPlankaProject({ planka_url: data.plankaUrl });
        return { success: true, plankaUrl: data.plankaUrl };
      } else {
        throw new Error('Échec de la synchronisation');
      }
    } catch (error) {
      console.error('Error syncing with Planka:', error);
      throw error;
    }
  };

  const openPlanka = () => {
    if (plankaProject?.planka_url) {
      window.open(plankaProject.planka_url, '_blank');
    }
  };

  const getBookingProgress = () => {
    if (resourceAssignments.length === 0) return { percentage: 0, text: 'Aucune ressource' };
    
    const bookedCount = resourceAssignments.filter(assignment => assignment.booking_status === 'booké').length;
    const percentage = (bookedCount / resourceAssignments.length) * 100;
    
    return {
      percentage,
      text: `${bookedCount}/${resourceAssignments.length} ressources bookées`
    };
  };

  const bookingProgress = getBookingProgress();
  const allResourcesBooked = resourceAssignments.every(assignment => assignment.booking_status === 'booké');

  return (
    <Card className="w-full max-w-md bg-background border border-border shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">{project.title}</h3>
          <Badge variant={project.status === 'play' ? 'default' : 'secondary'}>
            {project.status === 'play' ? 'En cours' : 'En pause'}
          </Badge>
        </div>
        {project.description && (
          <p className="text-sm text-muted-foreground mt-2">{project.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Prix total:</span>
          <span className="font-medium text-foreground">{project.price}€</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Date:</span>
          <span className="text-foreground">{formatDate(project.date)}</span>
        </div>
        
        {/* Resource assignments section */}
        {resourceAssignments.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Équipe:</span>
              <span className="text-foreground">{bookingProgress.text}</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300" 
                style={{ width: `${bookingProgress.percentage}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {resourceAssignments.map((assignment) => (
                <Badge 
                  key={assignment.id} 
                  variant={assignment.booking_status === 'booké' ? 'default' : 'outline'}
                  className="text-xs"
                >
                  {assignment.hr_profiles.name}
                  {assignment.booking_status === 'booké' && ' ✓'}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleStatusToggle}
            className="flex-1"
            disabled={project.status === 'pause' && !allResourcesBooked}
          >
            {project.status === 'play' ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Play
              </>
            )}
          </Button>

          <Button variant="outline" size="sm" onClick={() => onView(project.id)}>
            <Eye className="w-4 h-4" />
          </Button>

          <Button variant="destructive" size="sm" onClick={() => onDelete(project.id)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Booking Team button - only show when resources exist but not all are booked */}
        {resourceAssignments.length > 0 && !allResourcesBooked && project.status === 'pause' && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleBookingTeam}
            disabled={isBookingTeam}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Users className="w-4 h-4 mr-2" />
            {isBookingTeam ? 'Recherche en cours...' : 'Rejoindre l\'équipe'}
          </Button>
        )}

        {/* My Workspace button - only show when project is active (play) */}
        {project.status === 'play' && plankaProject?.planka_url && (
          <Button
            variant="default"
            size="sm"
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
            onClick={() => window.open(plankaProject.planka_url, '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Mon espace de travail
          </Button>
        )}

        {/* Sync with Planka button - only show for admins when not checked and project is paused */}
        {!isChecked && project.status === 'pause' && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={syncWithPlanka}
              disabled={isSyncing}
              className="flex-1"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              {isSyncing ? 'Synchronisation...' : 'Synchroniser avec Planka'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}