import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/Card";
import { PageHeader } from "@/ui/layout/PageHeader";
import { Button } from "@/ui/components/Button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Info, Settings, User, Briefcase, Award, CheckCircle } from "lucide-react";
import { EditJobModal } from "./EditJobModal";
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

// Fonction pour calculer le tarif journalier basé sur le prix de base et la séniorité
const calculateDailyRate = (basePrice: number, seniority: string) => {
  // Prix de base par minute * 60 minutes * 8 heures = prix journalier de base
  const baseDailyRate = basePrice * 60 * 8;
  
  // Multiplicateurs selon la séniorité
  const seniorityMultipliers: Record<string, number> = {
    'junior': 1.0,
    'intermediate': 1.15,  // Ajout du niveau intermediate
    'confirmé': 1.3,
    'senior': 1.6,
    'expert': 2.0
  };
  
  const multiplier = seniorityMultipliers[seniority] || 1.0;
  
  return Math.round(baseDailyRate * multiplier);
};

// Fonction pour calculer le tarif avec toutes les expertises et langues
const calculateRateWithExpertise = (
  baseRate: number, 
  expertiseCount: number, 
  languageCount: number
) => {
  // 5% par expertise, 5% par langue (comme dans ReactFlow)
  const expertisePercentage = expertiseCount * 0.05;
  const languagePercentage = languageCount * 0.05;
  const totalPercentage = 1 + expertisePercentage + languagePercentage;
  
  return Math.round(baseRate * totalPercentage);
};

export const CandidateSettingsNew = ({ candidateId, onProfileUpdate }: CandidateSettingsProps) => {
  // Early return if candidateId is not provided
  if (!candidateId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-fg/60">Chargement du Profile...</p>
        </CardContent>
      </Card>
    );
  }
  const [isEditJobModalOpen, setIsEditJobModalOpen] = useState(false);
  const [isEditLanguagesModalOpen, setIsEditLanguagesModalOpen] = useState(false);
  const [isEditExpertisesModalOpen, setIsEditExpertisesModalOpen] = useState(false);
  const [isEditSeniorityModalOpen, setIsEditSeniorityModalOpen] = useState(false);
  const [personalInfo, setPersonalInfo] = useState({
    first_name: '',
    last_name: '',
    EMayl: '',
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
      
      // Si le numéro de téléphone n'est pas dans candidate_profiles, le chercher dans profiles
      let phone = data.phone || '';
      if (!phone) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('phone')
          .eq('id', candidateId)  // Utiliser directement candidateId (ID universel)
          .single();
        
        if (profileData?.phone) {
          phone = profileData.phone;
          
          // Mettre à jour candidate_profiles avec le numéro trouvé
          await supabase
            .from('candidate_profiles')
            .update({ phone: profileData.phone })
            .eq('id', candidateId);
        }
      }
      
      // Initialize personal info state
      setPersonalInfo({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        phone: phone
      });
      
      return { ...data, phone };
    }
  });

  // Fetch profile data separately with base_price
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['profileData', candidateData?.profile_id],
    queryFn: async () => {
      if (!candidateData?.profile_id) return null;
      
      console.log('Fetching profile with ID:', candidateData.profile_id);
      
      const { data, error } = await supabase
        .from('hr_profiles')
        .select(`
          id,
          name,
          base_price,
          hr_categories (
            id,
            name
          )
        `)
        .eq('id', candidateData.profile_id)
        .single();
      
      if (error) {
        console.error('Error fetching profile:', error);
        
        // Si l'erreur est "no rows", essayons de voir tous les profils disponibles
        if (error.code === 'PGRST116') {
          console.log('Profile not found, listing available profiles...');
          const { data: allProfiles } = await supabase
            .from('hr_profiles')
            .select('id, name')
            .limit(10);
          console.log('Available Profilees:', allProfiles);
        }
        
        return null;
      }
      
      console.log('Profilee fetched successfully:', data);
      
      // Calculer le tarif journalier basé sur le profil et la séniorité
      if (data && data.base_price && candidateData?.seniority) {
        const dailyRate = calculateDailyRate(data.base_price, candidateData.seniority);
        
        // Si le tarif n'est pas défini ou différent, le mettre à jour
        if (!candidateData.daily_rate || Math.abs(candidateData.daily_rate - dailyRate) > 1) {
          console.log('Updating daily rate from', candidateData.daily_rate, 'to', dailyRate);
          await supabase
            .from('candidate_profiles')
            .update({ daily_rate: dailyRate })
            .eq('id', candidateData.id);
        }
      }
      
      return data;
    },
    enabled: !!candidateData?.profile_id
  });

  // Fetch candidate's languages
  const { data: candidateLanguages, refetch: refetchLanguages } = useQuery({
    queryKey: ['CandidateeLanguages', candidateId],
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
  const { data: CandidateeExpertises, refetch: refetchExpertises } = useQuery({
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
        .eq('candidate_id', CandidateeId);
      
      if (error) throw error;
      return data;
    }
  });

  const handleUpdate = () => {
    refetchCandidatee();
    refetchLanguages();
    refetchExpertises();
    toast({
      title: 'Succès",
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
      // Avec l'ID universel, on utilise directement candidateId
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: personalInfo.first_name,
          last_name: personalInfo.last_name,
          phone: personalInfo.phone
        })
        .eq('id', candidateId);

      if (profileError) {
        console.error('Error updating profile:', ProfileeError);
      }

      toast({
        title: 'Informations mises à jour",
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

  if (!CandidateeData) {
    return (
      <div className="p-6">
        <p className="text-center text-fg/60">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec PageHeader unifié */}
      <PageHeader
        icon={Settings}
        title="Paramètres du profil"
        subtitle="Gérez vos informations personnelles et professionnelles"
      />
      
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-muted">
          <TabsTrigger value="personal">Informations</TabsTrigger>
          <TabsTrigger value="professional">Professionnel</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="qualification">Qualification</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-fg">
                <User className="w-5 h-5" />
                Informations personnelles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First name</Label>
                  <Input
                    id="first_name"
                    value={personalInfo.first_name}
                    onChange={(e) => setPersonalInfo(prev => ({ ...prev, first_name: e.target.value }))}
                    className="bg-bg border-border text-fg"
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Name</Label>
                  <Input
                    id="last_name"
                    value={personalInfo.last_name}
                    onChange={(e) => setPersonalInfo(prev => ({ ...prev, last_name: e.target.value }))}
                    className="bg-bg border-border text-fg"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email">EMayl</Label>
                <Input
                  id="email"
                  type="email"
                  value={personalInfo.email}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, email: e.target.value }))}
                  className="bg-bg border-border text-fg"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={personalInfo.phone}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, phone: e.target.value }))}
                  className="bg-bg border-border text-fg"
                />
              </div>
              <Button onClick={handlePersonalInfoSave} variant="primary">
                Save les modifications
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="professional" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-fg">
                <Briefcase className="w-5 h-5" />
                Profile professionnel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-fg">Poste / Fonction</h4>
                      <p className="text-sm text-fg/60">
                        {profileLoading && candidateData?.profile_id ? (
                          'Chargement...'
                        ) : profileData ? (
                          `${profileData.hr_categories?.name || 'Catégorie non définie'} - ${profileData.name || 'Profil non défini'}`
                        ) : candidateData?.profile_id ? (
                          <span className="text-warning">Profil introuvable (ID: {candidateData.profile_id})</span>
                        ) : (
                          <span className="text-warning">Métier non configuré</span>
                        )}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setIsEditJobModalOpen(true)}>
                      {candidateData?.profile_id ? 'Modifier' : 'Configurer'}
                    </Button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-fg">Séniorité</h4>
                      <p className="text-sm text-fg/60 capitalize">
                        {candidateData?.seniority ? (
                          candidateData.seniority
                        ) : (
                          <span className="text-warning">Séniorité non définie</span>
                        )}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setIsEditSeniorityModalOpen(true)}>
                      {candidateData?.seniority ? 'Modifier' : 'Configurer'}
                    </Button>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <h4 className="font-medium mb-3 text-fg">Tarification</h4>
                  {profileData?.base_price && candidateData?.seniority ? (
                    <div className="space-y-3">
                      {/* Debug: afficher les valeurs de calcul */}
                      {console.log('Calcul tarif:', {
                        basePrice: profileData.base_price,
                        seniority: candidateData.seniority,
                        baseDailyWithoutMultiplier: profileData.base_price * 60 * 8,
                        multiplier: candidateData.seniority === 'intermediate' ? 1.15 : 1,
                        finalRate: calculateDailyRate(profileData.base_price, candidateData.seniority)
                      })}
                      
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-sm text-fg/60">Daily rate brut :</span>
                          <div className="text-xs text-fg/40 mt-1">
                            ({profileData.base_price}€/min × 480min {candidateData.seniority !== 'junior' && `× ${candidateData.seniority === 'intermediate' ? '1.15' : candidateData.seniority === 'confirmé' ? '1.3' : candidateData.seniority === 'senior' ? '1.6' : candidateData.seniority === 'expert' ? '2.0' : '1'}`})
                          </div>
                        </div>
                        <span className="text-lg font-semibold text-fg">
                          {calculateDailyRate(profileData.base_price, candidateData.seniority)}€
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-fg/60">
                          Tarif avec l'ensemble de vos expertises* :
                        </span>
                        <span className="text-lg font-semibold text-brand">
                          {calculateRateWithExpertise(
                            calculateDailyRate(profileData.base_price, candidateData.seniority),
                            candidateExpertises?.length || 0,
                            candidateLanguages?.length || 0
                          )}€
                        </span>
                      </div>
                      
                      {(candidateExpertises?.length || 0) + (candidateLanguages?.length || 0) > 0 && (
                        <p className="text-xs text-fg/50 italic">
                          * Inclut +5% par expertise ({candidateExpertises?.length || 0}) et +5% par langue ({candidateLanguages?.length || 0})
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-warning">
                      Configurez votre métier et séniorité pour voir vos tarifs
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Carte explicative des tarifs */}
          <Card className="bg-info/10 border-info">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-fg">
                <Info className="w-5 h-5 text-info" />
                Comment fonctionne votre tarification ?
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-fg/70 space-y-2">
              <p>
                <strong>Daily rate brut :</strong> C'est votre tarif de base calculé selon votre métier et votre niveau de séniorité. 
                Il correspond à 8 hours de travail par day.
              </p>
              <p>
                <strong>Tarif avec expertises :</strong> Lorsqu'un Client souhaite mobiliser l'ensemble de vos Skills 
                (expertises techniques et Languages), un bonus de 5% par compétence est ajouté à votre tarif de base. 
                Cela valorise votre polyvalence et vos Skills multiples.
              </p>
              <p className="pt-2 text-fg/60 italic">
                Ces tarifs sont automatiquement appliqués lors de la création des missions. Le Client voit le tarif 
                correspondant aux Skills qu'il demande pour son Project.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-fg">
                <Award className="w-5 h-5" />
                Skills et Languages
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-fg">Languages parlées</h4>
                  <Button variant="outline" size="sm" onClick={() => setIsEditLanguagesModalOpen(true)}>
                    Modifier
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {candidateLanguages?.map((lang) => (
                    <Badge
                      key={lang.id}
                      variant="secondary"
                    >
                      {lang.hr_languages?.name}
                    </Badge>
                  ))}
                  {(!candidateLanguages || candidateLanguages.length === 0) && (
                    <span className="text-sm text-fg/60">Aucune Language renseignée</span>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-fg">Expertises</h4>
                  <Button variant="outline" size="sm" onClick={() => setIsEditExpertisesModalOpen(true)}>
                    Modifier
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {candidateExpertises?.map((exp) => (
                    <Badge
                      key={exp.id}
                      variant="secondary"
                    >
                      {exp.hr_expertises?.name}
                    </Badge>
                  ))}
                  {(!candidateExpertises || candidateExpertises.length === 0) && (
                    <span className="text-sm text-fg/60">Aucune expertise renseignée</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qualification">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-fg">
                <CheckCircle className="w-5 h-5" />
                Résultats de qualification
              </CardTitle>
            </CardHeader>
            <CardContent>
              {candidateId ? (
                <QualificationResults candidateId={candidateId} />
              ) : (
                <p className="text-center text-fg/60">Chargement du Profile...</p>
              )}
            </CardContent>
          </Card>
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