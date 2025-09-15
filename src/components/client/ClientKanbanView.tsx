import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { useKanbanSupabase } from "@/hooks/useKanbanSupabase";
import { useProjectUsers } from "@/hooks/useProjectUsers";
import { Plus, Paperclip, Eye, Download, Trash2, Columns, Layout, User, Users, X, CalendarDays, FileText, Flag } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TaskRatingDialog } from "@/components/kanban/TaskRatingDialog";
import { FullScreenModal, ModalActions, useFullScreenModal } from "@/components/ui/fullscreen-modal";
import { UserSelectNeon } from "@/components/ui/user-select-neon";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";
import { useToast } from '@/hooks/use-toast';
import { uploadMultipleFiles, syncKanbanFilesToDrive, UploadedFile, forceFileDownload } from "@/utils/fileUpload";

interface Project {
  id: string;
  title: string;
  status: string;
  owner_id?: string;
}

interface ClientKanbanViewProps {
  projectId?: string;
}

export default function ClientKanbanView({ projectId: propProjectId }: ClientKanbanViewProps) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [boardId, setBoardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const cardModal = useFullScreenModal();
  const [newCardData, setNewCardData] = useState({ 
    title: '', 
    description: '', 
    columnId: '',
    dueDate: '',
    priority: 'medium',
    assignedTo: []
  });
  const newCardModal = useFullScreenModal();
  const [userFilter, setUserFilter] = useState('all');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const columnModal = useFullScreenModal();
  const [newColumnData, setNewColumnData] = useState({ title: '', color: '#3b82f6' });
  const [isSavingCard, setIsSavingCard] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ uploaded: 0, total: 0 });
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [taskToRate, setTaskToRate] = useState<any>(null);
  const navigate = useNavigate();

  // Use the unified hook for project users
  const { displayNames: projectMembers, users: projectUsers } = useProjectUsers(selectedProjectId);

  const { 
    board, 
    isLoading: boardLoading,
    handleDragEnd,
    addCard,
    updateCard,
    deleteCard,
    addColumn,
    updateColumn,
    deleteColumn
  } = useKanbanSupabase(boardId || undefined);

  // Load projects
  useEffect(() => {
    const loadProjects = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('id, title, status, owner_id')
          .eq('status', 'play') // Only active projects have Kanban
          .order('created_at', { ascending: false });

        if (error) throw error;
        setProjects(data || []);
      } catch (error) {
        console.error('Erreur chargement projets:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, [user]);

  // Set selected project from prop
  useEffect(() => {
    if (propProjectId) {
      console.log('Setting selected project from prop:', propProjectId);
      setSelectedProjectId(propProjectId);
    } else if (projects.length === 1 && !selectedProjectId) {
      console.log('Auto-selecting single project:', projects[0].id);
      setSelectedProjectId(projects[0].id);
    }
  }, [propProjectId, projects, selectedProjectId]);

  // Load board when project is selected
  useEffect(() => {
    const loadOrCreateBoard = async () => {
      if (!selectedProjectId || !user) return;
      
      try {
        // First, try to get existing board
        const { data: existingBoard, error: fetchError } = await supabase
          .from('kanban_boards')
          .select('id')
          .eq('project_id', selectedProjectId)
          .maybeSingle();

        if (fetchError && fetchError.code !== 'PGRST116') {
          console.error('Erreur chargement board:', fetchError);
          return;
        }

        if (existingBoard) {
          setBoardId(existingBoard.id);
        } else {
          // Create a new board if it doesn't exist
          console.log('Création d\'un nouveau board pour le projet:', selectedProjectId);
          
          const { data: newBoard, error: createError } = await supabase
            .from('kanban_boards')
            .insert({
              project_id: selectedProjectId,
              title: 'Tableau Kanban',
              description: 'Tableau de gestion des tâches',
              created_by: user.id
            })
            .select('id')
            .single();

          if (createError) {
            console.error('Erreur création board:', createError);
            return;
          }

          if (newBoard) {
            // Create default columns
            const defaultColumns = [
              { board_id: newBoard.id, title: 'À faire', position: 0, color: '#94a3b8' },
              { board_id: newBoard.id, title: 'En cours', position: 1, color: '#60a5fa' },
              { board_id: newBoard.id, title: 'En revue', position: 2, color: '#fbbf24' },
              { board_id: newBoard.id, title: 'Terminé', position: 3, color: '#34d399' }
            ];

            const { error: columnsError } = await supabase
              .from('kanban_columns')
              .insert(defaultColumns);

            if (columnsError) {
              console.error('Erreur création colonnes:', columnsError);
            }

            setBoardId(newBoard.id);
            toast.success('Tableau Kanban créé avec succès');
          }
        }
      } catch (error) {
        console.error('Erreur:', error);
      }
    };

    loadOrCreateBoard();
  }, [selectedProjectId, user]);

  // Load project members when project is selected (adapted from candidate version)
  // DEPRECATED: Ce code est maintenant remplacé par useProjectUsers
  useEffect(() => {
    return; // Désactivé - utilise useProjectUsers maintenant
    const loadProjectMembers = async () => {
      if (!selectedProjectId) return;
      
      try {
        console.log('Loading project members for:', selectedProjectId);
        const members = [];

        // Add current user (client) first
        const clientName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Client';
        members.push(`${clientName} (Client)`);
        console.log('✅ Added current client:', clientName);

        // Try to get real team members from project_bookings with profiles
        try {
          const { data: bookingsData, error: bookingsError } = await supabase
            .from('project_bookings')
            .select('candidate_id, status')
            .eq('project_id', selectedProjectId);

          console.log('📋 DEBUG - All bookings (any status):', bookingsData);

          if (bookingsError) {
            console.error('Error fetching bookings:', bookingsError);
          } else if (bookingsData && bookingsData.length > 0) {
            // Now try to get profiles for each candidate (any status)
            for (const booking of bookingsData) {
              try {
                const { data: profile, error: profileError } = await supabase
                  .from('profiles')
                  .select('id, email, first_name, last_name')
                  .eq('id', booking.candidate_id)
                  .single();

                if (profile && !profileError) {
                  const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
                  const displayName = fullName || profile.email || `Membre ${profile.id}`;
                  members.push(displayName);
                  console.log('✅ Added real team member:', displayName);
                } else {
                  console.log('❌ Could not fetch profile for:', booking.candidate_id, profileError);
                }
              } catch (profileErr) {
                console.log('❌ Profile fetch error:', profileErr);
              }
            }
          }
        } catch (err) {
          console.error('Could not fetch team members:', err);
        }

        // If we have bookings but couldn't get profiles, use email-based approach
        if (members.length === 1) { // Only client so far
          // Add demo team members to show interface structure
          members.push('Développeur (À assigner)');
          members.push('Designer (À assigner)');
          console.log('Added demo team members due to empty database');
        }

        console.log('Final project members:', members);
        // setProjectMembers n'est plus nécessaire, on utilise useProjectUsers
      } catch (error) {
        console.error('Error loading project members:', error);
        // Les membres sont gérés par useProjectUsers
      }
    };

    loadProjectMembers();
  }, [selectedProjectId, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Chargement des projets...</div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <Card className="p-8 text-center bg-card">
        <h3 className="text-lg font-semibold mb-2 text-card-foreground">Aucun projet actif</h3>
        <p className="text-muted-foreground">
          Vous n'avez aucun projet en cours avec un tableau Kanban.
        </p>
        <Button 
          className="mt-4" 
          onClick={() => window.location.reload()}
        >
          Actualiser
        </Button>
      </Card>
    );
  }

  if (!selectedProjectId) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="p-8 text-center bg-card border-border">
          <h3 className="text-lg font-semibold mb-2 text-card-foreground">Sélection d'un projet</h3>
          <p className="text-muted-foreground">
            Veuillez sélectionner un projet dans la barre de navigation pour afficher le tableau Kanban.
          </p>
        </Card>
      </div>
    );
  }

  if (!boardId && selectedProjectId) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-muted-foreground mb-4">Initialisation du tableau Kanban...</div>
          <p className="text-sm text-muted-foreground">
            Le tableau est en cours de création.
          </p>
        </div>
      </div>
    );
  }

  if (boardLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Chargement du tableau...</div>
      </div>
    );
  }

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // Handler pour ouvrir la carte (copied from candidate version)
  const handleCardClick = (card: any) => {
    // Check if card is in "Finalisé" or "Terminé" column
    const column = board?.columns.find(col => col.cardIds.includes(card.id));
    const isFinalized = column && (
      column.title.toLowerCase().includes('finalisé') || 
      column.title.toLowerCase().includes('terminé') ||
      column.title.toLowerCase().includes('done') ||
      column.title.toLowerCase().includes('complet')
    );
    
    // Helper function to open normal edit dialog
    const openEditDialog = () => {
      // Format the date to YYYY-MM-DD for the input field and ensure assignedTo is an array
      let assignedToArray = [];
      
      if (card.assignedTo) {
        if (Array.isArray(card.assignedTo)) {
          assignedToArray = card.assignedTo.filter(item => item && item !== '[]' && item !== '');
        } else if (typeof card.assignedTo === 'string' && card.assignedTo !== '[]' && card.assignedTo !== '') {
          try {
            const parsed = JSON.parse(card.assignedTo);
            assignedToArray = Array.isArray(parsed) ? parsed.filter(item => item && item !== '[]' && item !== '') : [card.assignedTo];
          } catch {
            assignedToArray = [card.assignedTo];
          }
        }
      }

      // Handle files properly
      let filesArray = [];
      if (card.files) {
        if (Array.isArray(card.files)) {
          filesArray = card.files;
        } else if (typeof card.files === 'string') {
          try {
            const parsed = JSON.parse(card.files);
            filesArray = Array.isArray(parsed) ? parsed : [parsed];
          } catch {
            filesArray = [card.files];
          }
        } else {
          filesArray = [card.files];
        }
      }

      const formattedCard = {
        ...card,
        dueDate: card.dueDate ? new Date(card.dueDate).toISOString().split('T')[0] : '',
        assignedTo: assignedToArray,
        files: filesArray,
        columnTitle: column?.title, // Add column title for status determination
        isFinalized: isFinalized // Pass the finalized state
      };
      
      setSelectedCard(formattedCard);
      setUploadedFiles([]);
      cardModal.open();
    };
    
    // If finalized and client, check if already rated
    if (isFinalized && user?.user_metadata?.role === 'client') {
      // Get the candidate ID from assignments
      const getCandidateId = async () => {
        let candidateId = null;
        
        // Get the assigned user name (first one if array)
        const assignedUser = Array.isArray(card.assignedTo) ? card.assignedTo[0] : card.assignedTo;
        
        if (assignedUser && assignedUser !== '[]' && assignedUser !== '') {
          // Query the hr_resource_assignments table to get the candidate_id
          // First try to find by name match in candidate_profiles
          const { data: candidateProfile } = await supabase
            .from('candidate_profiles')
            .select('id')
            .or(`first_name.ilike.%${assignedUser}%,last_name.ilike.%${assignedUser}%`)
            .single();
          
          if (candidateProfile?.id) {
            candidateId = candidateProfile.id;
          } else {
            // Try to find in hr_resource_assignments
            const { data: assignments } = await supabase
              .from('hr_resource_assignments')
              .select('candidate_id')
              .eq('project_id', selectedProjectId)
              .single();
            
            if (assignments?.candidate_id) {
              candidateId = assignments.candidate_id;
            }
          }
        }
        
        // Open rating dialog with or without candidateId
        setTaskToRate({
          id: card.id,
          title: card.title,
          projectId: selectedProjectId,
          candidateId
        });
        setRatingDialogOpen(true);
      };
      
      getCandidateId();
      return;
    }
    
    // Otherwise open normal edit dialog
    openEditDialog();
  };

  // Handler pour créer une nouvelle carte
  const handleAddCard = (columnId: string) => {
    setNewCardData({ 
      title: '', 
      description: '', 
      columnId,
      dueDate: '',
      priority: 'medium',
      assignedTo: []
    });
    newCardModal.open();
  };

  // Handler pour sauvegarder une nouvelle carte (copied from candidate version)
  const handleSaveNewCard = async () => {
    if (newCardData.title.trim()) {
      setIsSavingCard(true);
      setUploadProgress({ uploaded: 0, total: uploadedFiles.length });
      
      try {
        let newUploadedFiles: UploadedFile[] = [];
        
        // Upload new files to Supabase Storage if any
        if (uploadedFiles.length > 0) {
          console.log('📤 Uploading', uploadedFiles.length, 'files for new card...');
          
          const tempCardId = `temp-${Date.now()}`;
          
          newUploadedFiles = await uploadMultipleFiles(
            uploadedFiles,
            'kanban-files',
            `cards/${tempCardId}`,
            (uploaded, total) => {
              setUploadProgress({ uploaded, total });
              console.log(`📊 Upload progress: ${uploaded}/${total}`);
            }
          );
          
          console.log('✅ All files uploaded for new card:', newUploadedFiles);
        }

        const newCard = {
          title: newCardData.title,
          description: newCardData.description,
          columnId: newCardData.columnId,
          priority: newCardData.priority as const,
          status: 'todo' as const,
          dueDate: newCardData.dueDate || null,
          assignedTo: newCardData.assignedTo,
          files: newUploadedFiles
        };
        
        console.log('Saving new card with uploaded files:', newCard.files);
        await addCard(newCard);
        
        // Sync new files to Drive
        if (newUploadedFiles.length > 0 && selectedProjectId) {
          try {
            await syncKanbanFilesToDrive(newUploadedFiles, selectedProjectId);
            console.log('📁 New card files synced to Drive successfully');
          } catch (syncError) {
            console.error('❌ Error syncing new card files to Drive:', syncError);
          }
        }
        
        newCardModal.close();
        setUploadedFiles([]);
        setUploadProgress({ uploaded: 0, total: 0 });
        setNewCardData({ 
          title: '', 
          description: '', 
          columnId: '',
          dueDate: '',
          priority: 'medium',
          assignedTo: []
        });
        
        toast.success(`Carte créée${newUploadedFiles.length > 0 ? ` avec ${newUploadedFiles.length} fichier(s)` : ''}`);
      } catch (error) {
        console.error('Error creating card:', error);
        toast.error('Erreur lors de la création: ' + (error as Error).message);
      } finally {
        setIsSavingCard(false);
      }
    }
  };

  // Handler pour ajouter une colonne
  const handleAddColumn = () => {
    setNewColumnData({ title: '', color: '#3b82f6' });
    columnModal.open();
  };

  // Handler pour sauvegarder une nouvelle colonne
  const handleSaveColumn = () => {
    if (newColumnData.title.trim() && board) {
      const newColumn = {
        title: newColumnData.title,
        position: board.columns.length,
        color: newColumnData.color
      };
      addColumn(newColumn);
      columnModal.close();
      setNewColumnData({ title: '', color: '#3b82f6' });
    }
  };

  // Handler pour éditer une colonne
  const handleEditColumn = (column: any) => {
    const newTitle = prompt('Nouveau nom de la colonne:', column.title);
    if (newTitle && newTitle.trim() !== column.title) {
      updateColumn({
        id: column.id,
        title: newTitle.trim()
      });
    }
  };

  // Handler pour supprimer une colonne
  const handleDeleteColumn = (columnId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette colonne et toutes ses cartes ?')) {
      deleteColumn(columnId);
    }
  };

  // Handler pour sauvegarder les modifications d'une carte (copied from candidate version)
  const handleSaveCard = async () => {
    if (selectedCard) {
      setIsSavingCard(true);
      setUploadProgress({ uploaded: 0, total: uploadedFiles.length });
      
      // Vérifier si la carte passe en "done" (finalisé)
      const wasNotDone = selectedCard.status !== 'done';
      
      try {
        let newUploadedFiles: UploadedFile[] = [];
        
        if (uploadedFiles.length > 0) {
          console.log('📤 Uploading', uploadedFiles.length, 'files...');
          
          newUploadedFiles = await uploadMultipleFiles(
            uploadedFiles,
            'kanban-files',
            `cards/${selectedCard.id}`,
            (uploaded, total) => {
              setUploadProgress({ uploaded, total });
              console.log(`📊 Upload progress: ${uploaded}/${total}`);
            }
          );
          
          console.log('✅ All files uploaded:', newUploadedFiles);
        }

        // Combine existing files with new uploads
        const combinedFiles = [
          ...(selectedCard.files || []),
          ...newUploadedFiles
        ];

        const updateData = {
          id: selectedCard.id,
          title: selectedCard.title,
          description: selectedCard.description,
          status: selectedCard.status || 'todo',
          assignedTo: Array.isArray(selectedCard.assignedTo) ? selectedCard.assignedTo[0] : selectedCard.assignedTo,
          dueDate: selectedCard.dueDate,
          priority: selectedCard.priority,
          files: combinedFiles
        };
        
        console.log('💾 DEBUG - Saving card with files:', combinedFiles);
        
        await updateCard(updateData);
        
        // Sync new files to Drive
        if (newUploadedFiles.length > 0 && selectedProjectId) {
          try {
            await syncKanbanFilesToDrive(newUploadedFiles, selectedProjectId);
            console.log('📁 Files synced to Drive successfully');
          } catch (syncError) {
            console.error('❌ Error syncing files to Drive:', syncError);
          }
        }
        
        cardModal.close();
        setUploadedFiles([]);
        setUploadProgress({ uploaded: 0, total: 0 });
        
        // Si la carte vient de passer en "done", ouvrir le dialogue de notation
        if (wasNotDone && selectedCard.status === 'done') {
          // Récupérer le candidat assigné à la carte
          const assignedUser = selectedCard.assignedTo?.[0];
          let candidateId = null;
          
          if (assignedUser) {
            // Essayer de trouver l'ID du candidat depuis les membres du projet
            const { data: assignments } = await supabase
              .from('hr_resource_assignments')
              .select('candidate_id')
              .eq('project_id', selectedProjectId)
              .single();
            
            candidateId = assignments?.candidate_id;
          }
          
          setTaskToRate({
            id: selectedCard.id,
            title: selectedCard.title,
            projectId: selectedProjectId,
            candidateId
          });
          setRatingDialogOpen(true);
          toast.info('🎆 Tâche terminée ! Merci de noter la qualité du livrable.');
        } else {
          toast.success(`Carte sauvegardée${newUploadedFiles.length > 0 ? ` avec ${newUploadedFiles.length} fichier(s)` : ''}`);
        }
      } catch (error) {
        console.error('Error saving card:', error);
        toast.error('Erreur lors de la sauvegarde: ' + (error as Error).message);
      } finally {
        setIsSavingCard(false);
      }
    }
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden max-w-full">

      {/* Kanban Board - Scrollable container */}
      {board ? (
        <div className="flex-1 overflow-hidden">
          <KanbanBoard
            board={board}
            onDragEnd={handleDragEnd}
            onAddColumn={handleAddColumn}
            onAddCard={handleAddCard}
            onEditColumn={handleEditColumn}
            onDeleteColumn={handleDeleteColumn}
            onCardClick={handleCardClick}
            onCardEdit={(card) => {
              handleCardClick(card);
            }}
            onCardDelete={deleteCard}
            projectFilter=""
            onProjectFilterChange={() => {}}
            availableProjects={[]}
            userFilter={userFilter}
            onUserFilterChange={setUserFilter}
            projectMembers={projectMembers}
            hideTitle={true}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <Card className="p-8 text-center">
            <h3 className="text-lg font-semibold mb-2">Tableau non disponible</h3>
            <p className="text-muted-foreground">
              Le tableau Kanban n'est pas encore configuré pour ce projet.
            </p>
          </Card>
        </div>
      )}

      {/* Modal fullscreen pour voir/éditer une carte */}
      <FullScreenModal
        isOpen={cardModal.isOpen}
        onClose={cardModal.close}
        title={selectedCard ? "Modifier la carte" : ""}
        description={selectedCard?.columnTitle || ""}
        actions={
          <ModalActions
            onSave={handleSaveCard}
            onDelete={() => {
              if (confirm('Êtes-vous sûr de vouloir supprimer cette carte ?')) {
                deleteCard(selectedCard.id);
                cardModal.close();
              }
            }}
            saveDisabled={!selectedCard?.title}
            isLoading={isSavingCard}
          />
        }
      >
        {selectedCard && (
          <div className="space-y-6">
            <div>
              <Label htmlFor="title">Titre</Label>
              <Input
                id="title"
                value={selectedCard.title}
                onChange={(e) => setSelectedCard({ ...selectedCard, title: e.target.value })}
                placeholder="Titre de la carte"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={selectedCard.description || ''}
                onChange={(e) => setSelectedCard({ ...selectedCard, description: e.target.value })}
                placeholder="Description de la carte"
                className="mt-2 min-h-[120px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="assignedTo">Assigné à</Label>
                <div className="mt-2">
                  {/* Affichage des membres déjà assignés */}
                  {selectedCard.assignedTo?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2 bg-neutral-50 dark:bg-neutral-900/50 rounded-lg min-h-[32px] border border-neutral-200 dark:border-neutral-700 mb-2">
                      {selectedCard.assignedTo?.map((member: string, index: number) => {
                        const parts = member.split(' - ');
                        const name = parts[0] || member;
                        const role = parts[1] || '';
                        const nameParts = name.split(' ');
                        const initials = nameParts.length > 1
                          ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
                          : name.substring(0, 2).toUpperCase();

                        // Générer un gradient basé sur les initiales
                        const charCode = initials.charCodeAt(0) + (initials.charCodeAt(1) || 0);
                        const gradients = [
                          'from-purple-500 to-pink-500',
                          'from-blue-500 to-cyan-500',
                          'from-green-500 to-emerald-500',
                          'from-orange-500 to-red-500',
                          'from-indigo-500 to-purple-500'
                        ];
                        const gradient = gradients[charCode % gradients.length];

                        return (
                          <div key={index} className="flex items-center gap-1.5 bg-white dark:bg-neutral-800 px-2 py-1 rounded-full border border-neutral-200 dark:border-neutral-700 shadow-sm">
                            <Avatar className="w-5 h-5 border border-white dark:border-neutral-800">
                              <AvatarFallback className={`text-[9px] bg-gradient-to-br ${gradient} text-white font-bold`}>
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-neutral-700 dark:text-neutral-300">{name}</span>
                            {role && <span className="text-xs text-neutral-500 dark:text-neutral-400">({role})</span>}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="ml-0.5 h-3.5 w-3.5 p-0 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full"
                              onClick={() => {
                                const newAssignees = selectedCard.assignedTo.filter((_: any, i: number) => i !== index);
                                setSelectedCard({ ...selectedCard, assignedTo: newAssignees });
                              }}
                            >
                              <X className="w-2.5 h-2.5 text-neutral-400 dark:text-neutral-300 hover:text-neutral-600 dark:hover:text-neutral-100" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Sélecteur pour ajouter de nouveaux membres */}
                  <UserSelectNeon
                    users={projectUsers ?
                      projectUsers.filter(u => !selectedCard.assignedTo?.includes(`${u.display_name} - ${u.job_title}`)).map(user => ({
                        id: `${user.display_name} - ${user.job_title}`,
                        name: user.display_name,
                        role: user.job_title,
                        email: user.email
                      }))
                      : projectMembers.filter(m => !selectedCard.assignedTo?.includes(m)).map((member) => {
                        const parts = member.split(' - ');
                        const name = parts[0];
                        const role = parts[1] || '';
                        return {
                          id: member,
                          name: name,
                          role: role
                        };
                      })
                    }
                    selectedUserId=""
                    onUserChange={(value) => {
                      if (value && !selectedCard.assignedTo?.includes(value)) {
                        setSelectedCard({
                          ...selectedCard,
                          assignedTo: [...(selectedCard.assignedTo || []), value]
                        });
                      }
                    }}
                    placeholder="Ajouter un membre"
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="dueDate">Date d'échéance</Label>
                <div className="mt-2">
                  <DatePicker
                    date={selectedCard.dueDate ? new Date(selectedCard.dueDate) : undefined}
                    onSelect={(date) => setSelectedCard({ ...selectedCard, dueDate: date ? date.toISOString().split('T')[0] : '' })}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="priority">Priorité</Label>
              <Select 
                value={selectedCard.priority || 'medium'}
                onValueChange={(value) => setSelectedCard({ ...selectedCard, priority: value })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Basse</SelectItem>
                  <SelectItem value="medium">Moyenne</SelectItem>
                  <SelectItem value="high">Haute</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Fichiers attachés</Label>
              <div className="mt-2 space-y-2">
                {selectedCard.files?.map((file: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-neutral-800 rounded hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors">
                    <div className="flex items-center gap-2 flex-1">
                      <Paperclip className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium">{file.name || `Fichier ${index + 1}`}</span>
                      {file.size && (
                        <span className="text-xs text-gray-500">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {file.url ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => window.open(file.url, '_blank')}
                            title="Voir le fichier"
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={async () => {
                              toast.info('Téléchargement en cours...');
                              await forceFileDownload(file.url, file.name || `fichier-${index + 1}`);
                              toast.success('Téléchargement terminé');
                            }}
                            title="Télécharger le fichier"
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400 italic px-2">
                          Fichier sauvegardé
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        onClick={() => {
                          const newFiles = selectedCard.files.filter((_: any, i: number) => i !== index);
                          setSelectedCard({ ...selectedCard, files: newFiles });
                          toast.success('Fichier supprimé de la carte');
                        }}
                        title="Supprimer le fichier"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                {/* Afficher les fichiers en attente d'upload */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2 mb-2">
                    <div className="text-xs font-medium text-gray-600">Fichiers à uploader :</div>
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                        <div className="flex items-center gap-2 flex-1">
                          <Paperclip className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-medium">{file.name}</span>
                          <span className="text-xs text-gray-500">
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          onClick={() => {
                            const newFiles = uploadedFiles.filter((_, i) => i !== index);
                            setUploadedFiles(newFiles);
                            toast.info('Fichier retiré de la liste');
                          }}
                          title="Retirer de la liste"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <Input
                  type="file"
                  multiple
                  onChange={(e) => {
                    if (e.target.files) {
                      const newFiles = Array.from(e.target.files);
                      // Ajouter aux fichiers existants au lieu de remplacer
                      setUploadedFiles(prev => [...prev, ...newFiles]);
                    }
                  }}
                  className="mt-2"
                />
                {uploadProgress.total > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Upload: {uploadProgress.uploaded}/{uploadProgress.total}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </FullScreenModal>

      {/* Modal fullscreen pour créer une nouvelle carte */}
      <FullScreenModal
        isOpen={newCardModal.isOpen}
        onClose={newCardModal.close}
        title="Nouvelle carte"
        actions={
          <ModalActions
            onSave={handleSaveNewCard}
            onCancel={newCardModal.close}
            saveDisabled={!newCardData.title.trim()}
            isLoading={isSavingCard}
            saveText="Créer"
          />
        }
      >
        <div className="space-y-6">
          <div>
            <Label htmlFor="new-title">Titre *</Label>
            <Input
              id="new-title"
              value={newCardData.title}
              onChange={(e) => setNewCardData({ ...newCardData, title: e.target.value })}
              placeholder="Titre de la carte"
              className="mt-2"
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="new-description">Description</Label>
            <Textarea
              id="new-description"
              value={newCardData.description}
              onChange={(e) => setNewCardData({ ...newCardData, description: e.target.value })}
              placeholder="Description de la carte"
              className="mt-2 min-h-[120px]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="new-assignedTo">Assigné à</Label>
              <div className="mt-2">
                {/* Affichage des membres déjà assignés */}
                {newCardData.assignedTo?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-neutral-50 dark:bg-neutral-900/50 rounded-lg min-h-[32px] border border-neutral-200 dark:border-neutral-700 mb-2">
                    {newCardData.assignedTo?.map((member: string, index: number) => {
                      const parts = member.split(' - ');
                      const name = parts[0] || member;
                      const role = parts[1] || '';
                      const nameParts = name.split(' ');
                      const initials = nameParts.length > 1
                        ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
                        : name.substring(0, 2).toUpperCase();

                      // Générer un gradient basé sur les initiales
                      const charCode = initials.charCodeAt(0) + (initials.charCodeAt(1) || 0);
                      const gradients = [
                        'from-purple-500 to-pink-500',
                        'from-blue-500 to-cyan-500',
                        'from-green-500 to-emerald-500',
                        'from-orange-500 to-red-500',
                        'from-indigo-500 to-purple-500'
                      ];
                      const gradient = gradients[charCode % gradients.length];

                      return (
                        <div key={index} className="flex items-center gap-1.5 bg-white dark:bg-neutral-800 px-2 py-1 rounded-full border border-neutral-200 dark:border-neutral-700 shadow-sm">
                          <Avatar className="w-5 h-5 border border-white dark:border-neutral-800">
                            <AvatarFallback className={`text-[9px] bg-gradient-to-br ${gradient} text-white font-bold`}>
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-neutral-700 dark:text-neutral-300">{name}</span>
                          {role && <span className="text-xs text-neutral-500 dark:text-neutral-400">({role})</span>}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-0.5 h-3.5 w-3.5 p-0 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full"
                            onClick={() => {
                              const newAssignees = newCardData.assignedTo.filter((_: any, i: number) => i !== index);
                              setNewCardData({ ...newCardData, assignedTo: newAssignees });
                            }}
                          >
                            <X className="w-2.5 h-2.5 text-neutral-400 dark:text-neutral-300 hover:text-neutral-600 dark:hover:text-neutral-100" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Sélecteur pour ajouter de nouveaux membres */}
                <UserSelectNeon
                  users={projectUsers ?
                    projectUsers.filter(u => !newCardData.assignedTo?.includes(`${u.display_name} - ${u.job_title}`)).map(user => ({
                      id: `${user.display_name} - ${user.job_title}`,
                      name: user.display_name,
                      role: user.job_title,
                      email: user.email
                    }))
                    : projectMembers.filter(m => !newCardData.assignedTo?.includes(m)).map((member) => {
                      const parts = member.split(' - ');
                      const name = parts[0];
                      const role = parts[1] || '';
                      return {
                        id: member,
                        name: name,
                        role: role
                      };
                    })
                  }
                  selectedUserId=""
                  onUserChange={(value) => {
                    if (value && !newCardData.assignedTo?.includes(value)) {
                      setNewCardData({
                        ...newCardData,
                        assignedTo: [...(newCardData.assignedTo || []), value]
                      });
                    }
                  }}
                  placeholder="Ajouter un membre"
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="new-dueDate">Date d'échéance</Label>
              <div className="mt-2">
                <DatePicker
                  date={newCardData.dueDate ? new Date(newCardData.dueDate) : undefined}
                  onSelect={(date) => setNewCardData({ ...newCardData, dueDate: date ? date.toISOString().split('T')[0] : '' })}
                />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="new-priority">Priorité</Label>
            <Select 
              value={newCardData.priority}
              onValueChange={(value) => setNewCardData({ ...newCardData, priority: value })}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Basse</SelectItem>
                <SelectItem value="medium">Moyenne</SelectItem>
                <SelectItem value="high">Haute</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="new-files">Fichiers attachés</Label>
            <Input
              id="new-files"
              type="file"
              multiple
              onChange={(e) => {
                if (e.target.files) {
                  setUploadedFiles(Array.from(e.target.files));
                }
              }}
              className="mt-2"
            />
            {uploadedFiles.length > 0 && (
              <div className="mt-2 text-sm text-muted-foreground">
                {uploadedFiles.length} fichier(s) sélectionné(s)
              </div>
            )}
            {uploadProgress.total > 0 && (
              <div className="text-sm text-muted-foreground">
                Upload: {uploadProgress.uploaded}/{uploadProgress.total}
              </div>
            )}
          </div>
        </div>
      </FullScreenModal>

      {/* Modal fullscreen pour créer une nouvelle colonne */}
      <FullScreenModal
        isOpen={columnModal.isOpen}
        onClose={columnModal.close}
        title="Nouvelle colonne"
        actions={
          <ModalActions
            onSave={handleSaveColumn}
            onCancel={columnModal.close}
            saveDisabled={!newColumnData.title.trim()}
            saveText="Créer la colonne"
          />
        }
      >
        <div className="space-y-6">
          <div>
            <Label htmlFor="column-title">Nom de la colonne *</Label>
            <Input
              id="column-title"
              value={newColumnData.title}
              onChange={(e) => setNewColumnData({ ...newColumnData, title: e.target.value })}
              placeholder="Ex: À faire, En cours, Terminé"
              className="mt-2"
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="column-color">Couleur de la colonne</Label>
            <div className="mt-2 flex items-center gap-3">
              <Input
                id="column-color"
                type="color"
                value={newColumnData.color}
                onChange={(e) => setNewColumnData({ ...newColumnData, color: e.target.value })}
                className="w-20 h-10"
              />
              <span className="text-sm text-muted-foreground">{newColumnData.color}</span>
            </div>
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Aperçu :</strong> La colonne "{newColumnData.title || 'Nouvelle colonne'}" sera ajoutée 
              avec la couleur sélectionnée. Vous pourrez la renommer ou la supprimer plus tard.
            </p>
          </div>
        </div>
      </FullScreenModal>


      {/* Dialog de notation des tâches finalisées */}
      {taskToRate && (
        <TaskRatingDialog
          open={ratingDialogOpen}
          onOpenChange={setRatingDialogOpen}
          taskId={taskToRate.id}
          taskTitle={taskToRate.title}
          projectId={taskToRate.projectId}
          candidateId={taskToRate.candidateId}
          onRatingSubmitted={() => {
            toast.success('Merci pour votre évaluation !');
            setTaskToRate(null);
          }}
        />
      )}
    </div>
  );
}