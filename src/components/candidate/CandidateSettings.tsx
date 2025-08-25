import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditJobModal } from "./EditJobModal";
import { EditRateModal } from "./EditRateModal";
import { EditLanguagesModal } from "./EditLanguagesModal";
import { EditExpertisesModal } from "./EditExpertisesModal";
import { EditSeniorityModal } from "./EditSeniorityModal";
import { QualificationResults } from "./QualificationResults";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface CandidateSettingsProps {
  candidateId: string;
  onProfileUpdate?: () => void;
}

export const CandidateSettings = ({ candidateId, onProfileUpdate }: CandidateSettingsProps) => {
  // Early return if candidateId is not provided
  if (!candidateId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">Chargement du profil...</p>
        </CardContent>
      </Card>
    );
  }
  const [isEditJobModalOpen, setIsEditJobModalOpen] = useState(false);
  const [isEditRateModalOpen, setIsEditRateModalOpen] = useState(false);
  const [isEditLanguagesModalOpen, setIsEditLanguagesModalOpen] = useState(false);
  const [isEditExpertisesModalOpen, setIsEditExpertisesModalOpen] = useState(false);
  const [isEditSeniorityModalOpen, setIsEditSeniorityModalOpen] = useState(false);
  const [personalInfo, setPersonalInfo] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: ''
  });
  const { toast } = useToast();

  // Fetch comprehensive candidate profile data
  const { data: candidateData, refetch: refetchCandidate } = useQuery({
    queryKey: ['candidateProfile', candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('candidate_profiles')
        .select('*')
        .eq('id', candidateId)
        .single();
      
      if (error) throw error;
      
      // Initialize personal info state
      setPersonalInfo({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        phone: data.phone || ''
      });
      
      return data;
    }
  });

  // Fetch profile data separately
  const { data: profileData } = useQuery({
    queryKey: ['profileData', candidateData?.profile_id],
    queryFn: async () => {
      if (!candidateData?.profile_id) return null;
      
      const { data, error } = await supabase
        .from('hr_profiles')
        .select(`
          id,
          name,
          hr_categories (
            id,
            name
          )
        `)
        .eq('id', candidateData.profile_id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!candidateData?.profile_id
  });

  // Fetch candidate's languages
  const { data: candidateLanguages, refetch: refetchLanguages } = useQuery({
    queryKey: ['candidateLanguages', candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('candidate_languages')
        .select(`
          id,
          hr_languages (
            id,
            name
          )
        `)
        .eq('candidate_id', candidateId);
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch candidate's expertises
  const { data: candidateExpertises, refetch: refetchExpertises } = useQuery({
    queryKey: ['candidateExpertises', candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('candidate_expertises')
        .select(`
          id,
          hr_expertises (
            id,
            name
          )
        `)
        .eq('candidate_id', candidateId);
      
      if (error) throw error;
      return data;
    }
  });

  const handleUpdate = () => {
    refetchCandidate();
    refetchLanguages();
    refetchExpertises();
    toast({
      title: "Succès",
      description: "Profil mis à jour avec succès."
    });
  };

  const handlePersonalInfoSave = async () => {
    try {
      // Mettre à jour candidate_profiles
      const { error: candidateError } = await supabase
        .from('candidate_profiles')
        .update({
          first_name: personalInfo.first_name,
          last_name: personalInfo.last_name,
          email: personalInfo.email,
          phone: personalInfo.phone
        })
        .eq('id', candidateId);

      if (candidateError) throw candidateError;

      // Mettre à jour aussi profiles pour le téléphone (pour l'affichage dans AuthContext)
      if (candidateData?.user_id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            first_name: personalInfo.first_name,
            last_name: personalInfo.last_name,
            phone: personalInfo.phone
          })
          .eq('id', candidateData.user_id);

        if (profileError) {
          console.error('Error updating profile:', profileError);
        }
      }

      toast({
        title: "Informations mises à jour",
        description: "Vos informations personnelles ont été modifiées avec succès."
      });
      
      refetchCandidate();
      
      // Refresh auth context if callback available
      if (onProfileUpdate) {
        onProfileUpdate();
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les informations.",
        variant: "destructive"
      });
    }
  };

  if (!candidateData) {
    return (
      <div className="p-6">
        <p className="text-center text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Paramètres du profil</h2>
      
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="personal">Informations</TabsTrigger>
          <TabsTrigger value="professional">Professionnel</TabsTrigger>
          <TabsTrigger value="skills">Compétences</TabsTrigger>
          <TabsTrigger value="qualification">Qualification</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informations personnelles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">Prénom</Label>
                  <Input
                    id="first_name"
                    value={personalInfo.first_name}
                    onChange={(e) => setPersonalInfo(prev => ({ ...prev, first_name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Nom</Label>
                  <Input
                    id="last_name"
                    value={personalInfo.last_name}
                    onChange={(e) => setPersonalInfo(prev => ({ ...prev, last_name: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={personalInfo.email}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={personalInfo.phone}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <Button onClick={handlePersonalInfoSave}>
                Enregistrer les modifications
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="professional" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profil professionnel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Poste / Fonction</h4>
                      <p className="text-sm text-muted-foreground">
                        {profileData?.hr_categories?.name} - {profileData?.name}
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => setIsEditJobModalOpen(true)}>
                      Modifier
                    </Button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Tarif journalier</h4>
                      <p className="text-sm text-muted-foreground">
                        {candidateData.daily_rate}€ / jour
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => setIsEditRateModalOpen(true)}>
                      Modifier
                    </Button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Séniorité</h4>
                      <p className="text-sm text-muted-foreground capitalize">
                        {candidateData.seniority}
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => setIsEditSeniorityModalOpen(true)}>
                      Modifier
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compétences et langues</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Langues parlées</h4>
                  <Button variant="outline" onClick={() => setIsEditLanguagesModalOpen(true)}>
                    Modifier
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {candidateLanguages?.map((lang) => (
                    <span
                      key={lang.id}
                      className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm"
                    >
                      {lang.hr_languages?.name}
                    </span>
                  ))}
                  {(!candidateLanguages || candidateLanguages.length === 0) && (
                    <span className="text-sm text-muted-foreground">Aucune langue renseignée</span>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Expertises</h4>
                  <Button variant="outline" onClick={() => setIsEditExpertisesModalOpen(true)}>
                    Modifier
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {candidateExpertises?.map((exp) => (
                    <span
                      key={exp.id}
                      className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm"
                    >
                      {exp.hr_expertises?.name}
                    </span>
                  ))}
                  {(!candidateExpertises || candidateExpertises.length === 0) && (
                    <span className="text-sm text-muted-foreground">Aucune expertise renseignée</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qualification">
          {candidateId ? (
            <QualificationResults candidateId={candidateId} />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-gray-500">Chargement du profil...</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {candidateData.profile_id && (
        <>
          <EditJobModal
            isOpen={isEditJobModalOpen}
            onClose={() => setIsEditJobModalOpen(false)}
            currentCandidateId={candidateId}
            currentProfileId={candidateData.profile_id}
            onUpdate={handleUpdate}
          />
          <EditRateModal
            isOpen={isEditRateModalOpen}
            onClose={() => setIsEditRateModalOpen(false)}
            currentCandidateId={candidateId}
            currentRate={candidateData.daily_rate}
            onUpdate={handleUpdate}
          />
          <EditLanguagesModal
            isOpen={isEditLanguagesModalOpen}
            onClose={() => setIsEditLanguagesModalOpen(false)}
            currentCandidateId={candidateId}
            onUpdate={handleUpdate}
          />
          <EditExpertisesModal
            isOpen={isEditExpertisesModalOpen}
            onClose={() => setIsEditExpertisesModalOpen(false)}
            currentCandidateId={candidateId}
            currentProfileId={candidateData.profile_id}
            onUpdate={handleUpdate}
          />
          <EditSeniorityModal
            isOpen={isEditSeniorityModalOpen}
            onClose={() => setIsEditSeniorityModalOpen(false)}
            currentCandidateId={candidateId}
            currentSeniority={candidateData.seniority}
            onUpdate={handleUpdate}
          />
        </>
      )}
    </div>
  );
};