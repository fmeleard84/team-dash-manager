import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Users, Plus, UserPlus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useClientTeamMembers } from '@/hooks/useClientTeamMembers';
import { AddTeamMemberModal } from '@/components/client/AddTeamMemberModal';

interface HRProfile {
  id: string;
  name: string;
  category_id: string;
  base_price: number;
  is_ai?: boolean;
}

interface HRCategory {
  id: string;
  name: string;
  profiles: HRProfile[];
}

interface HRCategoriesPanelProps {
  onProfileSelect: (profile: HRProfile) => void;
}

const HRCategoriesPanel = ({ onProfileSelect }: HRCategoriesPanelProps) => {
  const [categories, setCategories] = useState<HRCategory[]>([]);
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [teamSectionOpen, setTeamSectionOpen] = useState(false);
  const [addTeamMemberModalOpen, setAddTeamMemberModalOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { teamMembers, loading: teamLoading, deleteTeamMember, refetch: refetchTeamMembers } = useClientTeamMembers();
  
  // Check if current user is a client
  const isClient = user?.profile?.role === 'client';

  useEffect(() => {
    fetchCategoriesAndProfiles();
  }, []);

  const fetchCategoriesAndProfiles = async () => {
    try {
      // Récupérer les catégories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('hr_categories')
        .select('*')
        .order('name');

      if (categoriesError) throw categoriesError;

      // Récupérer les profils
      const { data: profilesData, error: profilesError } = await supabase
        .from('hr_profiles')
        .select('*')
        .order('name');

      if (profilesError) throw profilesError;

      // Organiser les profils par catégorie
      const categoriesWithProfiles = categoriesData.map(category => ({
        ...category,
        profiles: profilesData.filter(profile => profile.category_id === category.id)
      }));

      setCategories(categoriesWithProfiles);
      
      // Ouvrir la première catégorie par défaut
      if (categoriesWithProfiles.length > 0) {
        setOpenCategories([categoriesWithProfiles[0].id]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des catégories:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les catégories RH.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setOpenCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleProfileDragStart = (e: React.DragEvent, profile: HRProfile) => {
    e.dataTransfer.setData('application/json', JSON.stringify(profile));
    e.dataTransfer.effectAllowed = 'copy';
  };

  if (isLoading) {
    return (
      <div className="w-80 bg-card border-r p-4 space-y-2">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Ressources Humaines</h2>
        </div>
        <p className="text-sm text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="w-80 bg-card border-r p-4 space-y-2">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-primary" />
        <h2 className="font-semibold">Ressources Humaines</h2>
      </div>

      <div className="space-y-1">
        {categories.map(category => (
          <Collapsible
            key={category.id}
            open={openCategories.includes(category.id)}
            onOpenChange={() => toggleCategory(category.id)}
          >
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-accent text-left">
              {openCategories.includes(category.id) ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <span className="font-medium">{category.name}</span>
              <span className="text-xs text-muted-foreground ml-auto">
                {category.profiles.length}
              </span>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="ml-6 space-y-1">
              {category.profiles.map(profile => (
                <div
                  key={profile.id}
                  draggable
                  onDragStart={(e) => handleProfileDragStart(e, profile)}
                  className={cn(
                    "p-2 rounded-md cursor-grab active:cursor-grabbing",
                    "hover:bg-accent/50 border border-transparent hover:border-border",
                    "transition-colors duration-200"
                  )}
                  onClick={() => onProfileSelect(profile)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {profile.is_ai && (
                        <span className="text-xs px-1.5 py-0.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded font-semibold">
                          IA
                        </span>
                      )}
                      <span className="text-sm">{profile.name}</span>
                    </div>
                     <span className="text-xs text-muted-foreground">
                      {profile.base_price}€/mn
                    </span>
                  </div>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>

      {/* Section Mon équipe - Visible seulement pour les clients */}
      {isClient && (
        <>
          <div className="mt-6 border-t pt-4">
            <Collapsible
              open={teamSectionOpen}
              onOpenChange={setTeamSectionOpen}
            >
              <div className="flex items-center justify-between w-full">
                <CollapsibleTrigger className="flex items-center gap-2 flex-1 p-2 rounded-md hover:bg-accent">
                  {teamSectionOpen ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  <UserPlus className="w-4 h-4 text-primary" />
                  <span className="font-medium">Mon équipe</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({teamMembers.length})
                  </span>
                </CollapsibleTrigger>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setAddTeamMemberModalOpen(true)}
                  className="h-6 px-2 mr-2"
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              
              <CollapsibleContent className="mt-2 space-y-1">
                {teamLoading ? (
                  <p className="text-xs text-muted-foreground p-2">Chargement...</p>
                ) : teamMembers.length === 0 ? (
                  <div className="p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-2">
                      Aucun membre dans votre équipe
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAddTeamMemberModalOpen(true)}
                      className="w-full"
                    >
                      <UserPlus className="w-3 h-3 mr-1" />
                      Ajouter un membre
                    </Button>
                  </div>
                ) : (
                  <div className="ml-6 space-y-1">
                    {teamMembers.map((member) => (
                      <div
                        key={member.id}
                        draggable
                        onDragStart={(e) => {
                          // Format as HRProfile for drag&drop - use the actual member ID
                          const teamProfile: HRProfile = {
                            id: member.id, // Utiliser l'ID réel du membre
                            name: `${member.first_name} ${member.last_name}`,
                            category_id: 'team',
                            base_price: member.daily_rate ? parseFloat((member.daily_rate / 480).toFixed(2)) : 0, // Convert daily to per minute (8h = 480mn)
                            is_ai: false
                          };
                          // Add member data with description
                          e.dataTransfer.setData('application/json', JSON.stringify(teamProfile));
                          e.dataTransfer.setData('team-member', 'true');
                          e.dataTransfer.setData('team-member-data', JSON.stringify({
                            description: member.description || '',
                            job_title: member.job_title,
                            member_id: member.id // Ajouter l'ID du membre
                          }));
                          e.dataTransfer.effectAllowed = 'copy';
                        }}
                        onClick={() => {
                          // Create HRProfile object for click selection - use actual member ID
                          const teamProfile: HRProfile = {
                            id: member.id, // Utiliser l'ID réel du membre
                            name: `${member.first_name} ${member.last_name}`,
                            category_id: 'team',
                            base_price: member.daily_rate ? parseFloat((member.daily_rate / 480).toFixed(2)) : 0,
                            is_ai: false,
                            // Add team member specific data
                            is_team_member: true,
                            description: member.description || '',
                            job_title: member.job_title || ''
                          };
                          // Call the same function as regular profiles
                          onProfileSelect(teamProfile);
                        }}
                        className={cn(
                          "p-2 rounded-md cursor-pointer hover:bg-accent/50 border border-transparent hover:border-border",
                          "transition-colors duration-200 group"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">
                                Équipe
                              </span>
                              <span className="text-sm font-medium">
                                {member.first_name} {member.last_name}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground ml-8">
                              {member.job_title}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {member.is_billable && member.daily_rate && (
                              <span className="text-xs text-muted-foreground">
                                {member.daily_rate}€/j
                              </span>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (confirm('Êtes-vous sûr de vouloir supprimer ce membre ?')) {
                                  try {
                                    await deleteTeamMember(member.id);
                                    toast({
                                      title: "Membre supprimé",
                                      description: "Le membre a été retiré de votre équipe"
                                    });
                                  } catch (error) {
                                    toast({
                                      title: "Erreur",
                                      description: "Impossible de supprimer le membre",
                                      variant: "destructive"
                                    });
                                  }
                                }
                              }}
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
          
          {/* Modal pour ajouter un membre */}
          <AddTeamMemberModal
            isOpen={addTeamMemberModalOpen}
            onClose={() => setAddTeamMemberModalOpen(false)}
            onSuccess={() => {
              // Refresh team members list
              refetchTeamMembers();
              toast({
                title: "Membre ajouté",
                description: "Le membre a été ajouté à votre équipe avec succès"
              });
            }}
          />
        </>
      )}

      <div className="mt-6 p-3 bg-muted/50 rounded-md">
        <p className="text-xs text-muted-foreground">
          Glissez-déposez les profils sur le canvas pour les ajouter à votre projet.
        </p>
      </div>
    </div>
  );
};

export default HRCategoriesPanel;