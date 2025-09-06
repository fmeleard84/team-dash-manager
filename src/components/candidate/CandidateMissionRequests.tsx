import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { CandidateMissionCard } from './CandidateMissionCard';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  MapPin, 
  Calendar, 
  DollarSign,
  Users,
  Briefcase,
  Languages,
  Award,
  Info,
  AlertTriangle,
  Building,
  Timer
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface MissionRequest {
  id: string;
  project_id: string;
  project_title: string;
  project_description: string;
  client_name: string;
  client_email: string;
  profile_name: string;
  profile_id: string;
  category_name: string;
  seniority: 'junior' | 'intermediate' | 'senior';
  languages: string[];
  expertises: string[];
  calculated_price: number;
  project_budget: number;
  start_date: string;
  end_date: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  created_at: string;
  expires_at: string;
  booking_data: any;
}

const getSeniorityColor = (seniority: string) => {
  switch (seniority) {
    case 'junior': return 'bg-green-100 text-green-800 border-green-200';
    case 'intermediate': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'senior': return 'bg-purple-100 text-purple-800 border-purple-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'accepted': return 'bg-green-100 text-green-800 border-green-200';
    case 'declined': return 'bg-red-100 text-red-800 border-red-200';
    case 'expired': return 'bg-gray-100 text-gray-800 border-gray-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getTimeSince = (createdAt: string) => {
  const now = new Date();
  const created = new Date(createdAt);
  const diff = now.getTime() - created.getTime();
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days > 0) {
    return `Depuis ${days}j`;
  } else if (hours > 0) {
    return `Depuis ${hours}h`;
  } else if (minutes > 0) {
    return `Depuis ${minutes}min`;
  } else {
    return `À l'instant`;
  }
};

export const CandidateMissionRequests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<MissionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'declined'>('pending');

  const fetchMissionRequests = async () => {
    if (!user?.email) return;

    try {
      setLoading(true);
      
      // D'abord récupérer le profil candidat
      const { data: candidateProfile } = await supabase
        .from('candidate_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      // Puis récupérer les langues et expertises séparément
      let candidateLanguagesData = [];
      let candidateExpertisesData = [];
      
      if (candidateProfile) {
        // Récupérer les langues
        const { data: langData } = await supabase
          .from('candidate_languages')
          .select('*, hr_languages(*)')
          .eq('candidate_id', candidateProfile.id);
        
        if (langData) {
          candidateLanguagesData = langData;
        }
        
        // Récupérer les expertises
        const { data: expData } = await supabase
          .from('candidate_expertises')
          .select('*, hr_expertises(*)')
          .eq('candidate_id', candidateProfile.id);
        
        if (expData) {
          candidateExpertisesData = expData;
        }
        
        // Ajouter les données au profil pour compatibilité
        candidateProfile.candidate_languages = candidateLanguagesData;
        candidateProfile.candidate_expertises = candidateExpertisesData;
      }
      
      console.log('Candidate profile:', candidateProfile);
      
      if (!candidateProfile) {
        console.log('No candidate profile found for email:', user.email);
        setLoading(false);
        return;
      }
      
      // Récupérer les demandes de mission pour ce candidat
      const { data, error } = await supabase
        .from('hr_resource_assignments')
        .select(`
          id,
          project_id,
          profile_id,
          seniority,
          languages,
          expertises,
          calculated_price,
          booking_status,
          candidate_id,
          created_at,
          projects (
            id,
            title,
            description,
            owner_id,
            client_budget,
            project_date,
            due_date
          ),
          hr_profiles (
            id,
            name,
            hr_categories (
              name
            )
          )
        `)
        .order('created_at', { ascending: false });
      
      console.log('All hr_resource_assignments:', data?.map(a => ({
        id: a.id,
        project: a.projects?.title,
        booking_status: a.booking_status,
        seniority: a.seniority,
        languages: a.languages,
        expertises: a.expertises
      })));
      
      // Filter by status after getting all data
      const searchingAssignments = (data || []).filter(assignment => 
        assignment.booking_status === 'recherche' || assignment.booking_status === 'draft'
      );

      if (error) throw error;

      // Filtrer les demandes qui correspondent au profil du candidat
      const matchingAssignments = searchingAssignments.filter(assignment => {
        // CRITICAL: Check if assignment is already assigned to another candidate
        if (assignment.candidate_id && assignment.candidate_id !== candidateProfile.id) {
          console.log(`Assignment ${assignment.id} for project "${assignment.projects?.title}" is already assigned to candidate ${assignment.candidate_id}`);
          return false;
        }
        
        // If specifically assigned to this candidate, always show it
        if (assignment.candidate_id === candidateProfile.id) {
          console.log(`Assignment ${assignment.id} for project "${assignment.projects?.title}" is specifically assigned to this candidate`);
          return true;
        }
        
        // For unassigned positions, check if candidate qualifies
        // 1. EXACT PROFILE MATCH: Le candidat doit avoir exactement le bon métier recherché
        const profileMatch = assignment.profile_id === candidateProfile.profile_id;
        
        // 2. EXACT SENIORITY MATCH: Le candidat doit avoir exactement la séniorité recherchée
        const seniorityMatch = assignment.seniority === candidateProfile.seniority;
        
        // 3. STATUS CHECK: Le candidat doit être disponible
        const statusMatch = candidateProfile.status === 'disponible';
        
        // Extraire les langues et expertises du candidat depuis les relations
        const candidateLanguages = candidateProfile.candidate_languages?.map(cl => cl.hr_languages?.name) || [];
        const candidateExpertises = candidateProfile.candidate_expertises?.map(ce => ce.hr_expertises?.name) || [];
        
        // 4. LANGUAGES MATCH: Le candidat doit avoir au moins toutes les langues recherchées
        const languagesMatch = !assignment.languages?.length || 
          assignment.languages.every(lang => candidateLanguages.includes(lang));
        
        // 5. EXPERTISES MATCH: Le candidat doit avoir au moins toutes les expertises recherchées
        const expertisesMatch = !assignment.expertises?.length || 
          assignment.expertises.every(exp => candidateExpertises.includes(exp));
        
        console.log('Assignment matching for:', assignment.id, assignment.projects?.title, {
          candidate_id: assignment.candidate_id,
          profileMatch,
          seniorityMatch,
          statusMatch,
          languagesMatch,
          expertisesMatch,
          assignment: {
            profile_id: assignment.profile_id,
            seniority: assignment.seniority,
            languages: assignment.languages,
            expertises: assignment.expertises
          },
          candidate: {
            profile_id: candidateProfile.profile_id,
            seniority: candidateProfile.seniority,
            status: candidateProfile.status,
            languages: candidateLanguages,
            expertises: candidateExpertises
          },
          finalMatch: profileMatch && seniorityMatch && statusMatch && languagesMatch && expertisesMatch
        });
        
        return profileMatch && seniorityMatch && statusMatch && languagesMatch && expertisesMatch;
      });

      console.log('Matching assignments for candidate:', matchingAssignments.length, 'out of', searchingAssignments.length);

      // Get unique owner IDs to fetch client information
      const ownerIds = [...new Set(matchingAssignments.map(assignment => assignment.projects?.owner_id).filter(Boolean))];
      
      // Fetch client profiles separately
      let clientProfiles = new Map();
      if (ownerIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', ownerIds);
        
        if (profilesData) {
          clientProfiles = new Map(profilesData.map(profile => [profile.id, profile]));
        }
      }

      const formattedRequests: MissionRequest[] = matchingAssignments.map(assignment => {
        const clientProfile = clientProfiles.get(assignment.projects?.owner_id);
        return {
        id: assignment.id,
        project_id: assignment.project_id,
        project_title: assignment.projects?.title || 'Projet sans titre',
        project_description: assignment.projects?.description || '',
        client_name: `${clientProfile?.first_name || ''} ${clientProfile?.last_name || ''}`.trim() || clientProfile?.email || 'Client',
        client_email: clientProfile?.email || '',
        profile_name: assignment.hr_profiles?.name || 'Profil inconnu',
        profile_id: assignment.profile_id,
        category_name: assignment.hr_profiles?.hr_categories?.name || 'Catégorie',
        seniority: assignment.seniority || 'intermediate',
        languages: assignment.languages || [],
        expertises: assignment.expertises || [],
        calculated_price: assignment.calculated_price || 0,
        project_budget: assignment.projects?.client_budget || 0,
        start_date: assignment.projects?.project_date || '',
        end_date: assignment.projects?.due_date || '',
        status: assignment.booking_status === 'recherche' ? 'pending' : 
                assignment.booking_status === 'accepted' ? 'accepted' : 
                assignment.booking_status === 'declined' ? 'declined' : 'expired',
        created_at: assignment.created_at,
        expires_at: assignment.created_at, // Using created_at for time display
        booking_data: null
        };
      });

      setRequests(formattedRequests);
    } catch (error: any) {
      console.error('Error fetching mission requests:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les demandes de mission."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (requestId: string, action: 'accept' | 'decline') => {
    try {
      setProcessingIds(prev => new Set([...prev, requestId]));

      const response = await supabase.functions.invoke('resource-booking', {
        body: {
          action: action === 'accept' ? 'accept_mission' : 'decline_mission',
          assignment_id: requestId,
          candidate_email: user?.email
        }
      });

      if (response.error) throw response.error;

      toast({
        title: action === 'accept' ? "Mission acceptée" : "Mission refusée",
        description: action === 'accept' 
          ? "Vous avez accepté cette mission avec succès." 
          : "Vous avez refusé cette mission."
      });

      // Rafraîchir la liste
      await fetchMissionRequests();

    } catch (error: any) {
      console.error(`Error ${action}ing mission:`, error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: `Impossible de ${action === 'accept' ? 'accepter' : 'refuser'} la mission.`
      });
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  useEffect(() => {
    fetchMissionRequests();

    if (!candidateProfile?.id) return;

    // Set up real-time subscription for new mission requests
    const channel = supabase
      .channel('mission-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'candidate_notifications',
          filter: `candidate_id=eq.${candidateProfile.id}`
        },
        (payload) => {
          console.log('🔄 Real-time update: candidate_notifications changed', payload);
          console.log('Event type:', payload.eventType);
          console.log('New record:', payload.new);
          fetchMissionRequests();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hr_resource_assignments',
          filter: `booking_status=eq.recherche`
        },
        () => {
          console.log('🔄 Real-time update: hr_resource_assignments changed');
          fetchMissionRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.email, candidateProfile?.id]);

  const filteredRequests = requests.filter(request => {
    if (filter === 'all') return true;
    return request.status === filter;
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const acceptedCount = requests.filter(r => r.status === 'accepted').length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Demandes de Mission
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Demandes de Mission
                {pendingCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {pendingCount} en attente
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Gérez vos demandes de participation aux projets clients
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant={filter === 'pending' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilter('pending')}
              >
                En attente ({pendingCount})
              </Button>
              <Button 
                variant={filter === 'accepted' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilter('accepted')}
              >
                Acceptées ({acceptedCount})
              </Button>
              <Button 
                variant={filter === 'all' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilter('all')}
              >
                Toutes ({requests.length})
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Aucune demande de mission</p>
              <p className="text-sm">
                {filter === 'pending' 
                  ? "Vous n'avez pas de nouvelles demandes en attente"
                  : `Aucune mission ${filter === 'all' ? '' : filter}`
                }
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {filteredRequests.map((request) => (
                  <CandidateMissionCard
                    key={request.id}
                    request={request}
                    onAccept={(id) => handleResponse(id, 'accept')}
                    onDecline={(id) => handleResponse(id, 'decline')}
                    processing={processingIds.has(request.id)}
                    getStatusColor={getStatusColor}
                    getSeniorityColor={getSeniorityColor}
                    getTimeRemaining={getTimeSince}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {pendingCount > 0 && (
        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            Vous avez <strong>{pendingCount}</strong> demande{pendingCount > 1 ? 's' : ''} de mission en attente. 
            Répondez rapidement pour maximiser vos chances de participer aux projets !
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};