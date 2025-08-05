import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, DollarSign, Languages, Award, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import type { Database } from '@/integrations/supabase/types';
import { EditJobModal } from './EditJobModal';
import { EditRateModal } from './EditRateModal';
import { EditLanguagesModal } from './EditLanguagesModal';
import { EditExpertisesModal } from './EditExpertisesModal';

interface CandidateSettingsProps {
  currentCandidateId: string;
}

export function CandidateSettings({ currentCandidateId }: CandidateSettingsProps) {
  const [editJobModal, setEditJobModal] = useState(false);
  const [editRateModal, setEditRateModal] = useState(false);
  const [editLanguagesModal, setEditLanguagesModal] = useState(false);
  const [editExpertisesModal, setEditExpertisesModal] = useState(false);

  // Fetch candidate profile with related data
  const { data: candidateProfile, refetch } = useQuery({
    queryKey: ['candidate-profile-full', currentCandidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('candidate_profiles')
        .select(`
          *,
          candidate_languages (
            hr_languages (id, name)
          ),
          candidate_expertises (
            hr_expertises (id, name)
          )
        `)
        .eq('id', currentCandidateId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!currentCandidateId
  });

  const handleUpdate = () => {
    refetch();
    toast.success('Profil mis à jour');
  };

  const handleSeniorityChange = async (newSeniority: Database['public']['Enums']['hr_seniority']) => {
    try {
      const { error } = await supabase
        .from('candidate_profiles')
        .update({ seniority: newSeniority })
        .eq('id', currentCandidateId);

      if (error) throw error;

      handleUpdate();
    } catch (error: any) {
      toast.error('Erreur lors de la modification: ' + error.message);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from('candidate_profiles')
        .update({ status: newStatus })
        .eq('id', currentCandidateId);

      if (error) throw error;

      handleUpdate();
    } catch (error: any) {
      toast.error('Erreur lors de la modification: ' + error.message);
    }
  };

  if (!candidateProfile) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-muted-foreground">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Paramètres du profil</h1>
      </div>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informations personnelles
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Prénom</p>
              <p className="text-lg">{candidateProfile.first_name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Nom</p>
              <p className="text-lg">{candidateProfile.last_name}</p>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Email</p>
            <p className="text-lg">{candidateProfile.email}</p>
          </div>
          {candidateProfile.phone && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Téléphone</p>
              <p className="text-lg">{candidateProfile.phone}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Job Position */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Poste et séniorité
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Profil</p>
              <p className="text-lg">Ressource IT</p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setEditJobModal(true)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </Button>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Type de profil</p>
            <p className="text-lg capitalize">{candidateProfile.profile_type || 'resource'}</p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Niveau d'expérience</p>
              <Badge variant="secondary" className="capitalize">
                {candidateProfile.seniority}
              </Badge>
            </div>
            <Select
              value={candidateProfile.seniority}
              onValueChange={handleSeniorityChange}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="junior">Junior</SelectItem>
                <SelectItem value="intermediate">Intermédiaire</SelectItem>
                <SelectItem value="senior">Senior</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Rate Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Tarification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Tarif journalier</p>
              <p className="text-2xl font-bold">{candidateProfile.daily_rate}€</p>
              <p className="text-sm text-muted-foreground">
                Soit {(candidateProfile.daily_rate / 8).toFixed(2)}€/heure | {(candidateProfile.daily_rate / (8 * 60)).toFixed(2)}€/minute
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setEditRateModal(true)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Languages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            Langues parlées
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between">
            <div className="flex flex-wrap gap-2">
              {candidateProfile.candidate_languages?.length > 0 ? (
                candidateProfile.candidate_languages.map((cl, index) => (
                  <Badge key={index} variant="secondary">
                    {cl.hr_languages?.name}
                  </Badge>
                ))
              ) : (
                <p className="text-muted-foreground">Aucune langue renseignée</p>
              )}
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setEditLanguagesModal(true)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Expertises */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Expertises
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between">
            <div className="flex flex-wrap gap-2">
              {candidateProfile.candidate_expertises?.length > 0 ? (
                candidateProfile.candidate_expertises.map((ce, index) => (
                  <Badge key={index} variant="secondary">
                    {ce.hr_expertises?.name}
                  </Badge>
                ))
              ) : (
                <p className="text-muted-foreground">Aucune expertise renseignée</p>
              )}
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setEditExpertisesModal(true)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <EditJobModal
        isOpen={editJobModal}
        onClose={() => setEditJobModal(false)}
        currentCandidateId={currentCandidateId}
        currentProfileId={candidateProfile.profile_id}
        onUpdate={handleUpdate}
      />

      <EditRateModal
        isOpen={editRateModal}
        onClose={() => setEditRateModal(false)}
        currentCandidateId={currentCandidateId}
        currentRate={candidateProfile.daily_rate}
        onUpdate={handleUpdate}
      />

      <EditLanguagesModal
        isOpen={editLanguagesModal}
        onClose={() => setEditLanguagesModal(false)}
        currentCandidateId={currentCandidateId}
        onUpdate={handleUpdate}
      />

      <EditExpertisesModal
        isOpen={editExpertisesModal}
        onClose={() => setEditExpertisesModal(false)}
        currentCandidateId={currentCandidateId}
        currentProfileId={candidateProfile.profile_id}
        onUpdate={handleUpdate}
      />
    </div>
  );
}