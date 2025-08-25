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
import { CardEditDialog } from "@/components/kanban/dialogs/CardEditDialog";
import { CardCreateDialog } from "@/components/kanban/dialogs/CardCreateDialog";
import { ColumnCreateDialog } from "@/components/kanban/dialogs/ColumnCreateDialog";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { uploadMultipleFiles, syncKanbanFilesToDrive, UploadedFile } from "@/utils/fileUpload";

interface Project {
  id: string;
  title: string;
  status: string;
  owner_id?: string;
}

interface ClientKanbanViewProps {
  availableProjects?: Project[];
  selectedProjectId?: string;
  onProjectChange?: (projectId: string) => void;
}

export default function ClientKanbanView({ 
  availableProjects = [],
  selectedProjectId: propSelectedProjectId,
  onProjectChange 
}: ClientKanbanViewProps) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [boardId, setBoardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [isCardDialogOpen, setIsCardDialogOpen] = useState(false);
  const [newCardData, setNewCardData] = useState({ 
    title: '', 
    description: '', 
    columnId: '',
    dueDate: '',
    priority: 'medium',
    assignedTo: []
  });
  const [isNewCardDialogOpen, setIsNewCardDialogOpen] = useState(false);
  const [userFilter, setUserFilter] = useState('all');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isColumnDialogOpen, setIsColumnDialogOpen] = useState(false);
  const [newColumnData, setNewColumnData] = useState({ title: '', color: '#3b82f6' });
  const [isSavingCard, setIsSavingCard] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ uploaded: 0, total: 0 });
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [taskToRate, setTaskToRate] = useState<any>(null);
  const navigate = useNavigate();

  // Use the unified hook for project users
  const { displayNames: projectMembers } = useProjectUsers(selectedProjectId);

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

  // Use projects from props or load them
  useEffect(() => {
    if (availableProjects.length > 0) {
      setProjects(availableProjects);
      setLoading(false);
    } else {
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
    }
  }, [user, availableProjects]);

  // Sync selectedProjectId with prop
  useEffect(() => {
    if (propSelectedProjectId) {
      setSelectedProjectId(propSelectedProjectId);
    } else if (!propSelectedProjectId && projects.length === 1) {
      const projectId = projects[0].id;
      setSelectedProjectId(projectId);
      onProjectChange?.(projectId);
    }
  }, [propSelectedProjectId, projects, onProjectChange]);

  // Load board when project is selected
  useEffect(() => {
    const loadBoard = async () => {
      if (!selectedProjectId) return;
      
      try {
        const { data: existingBoard, error } = await supabase
          .from('kanban_boards')
          .select('id')
          .eq('project_id', selectedProjectId)
          .maybeSingle();

        if (error) {
          console.error('Erreur chargement board:', error);
          return;
        }

        if (existingBoard) {
          setBoardId(existingBoard.id);
        }
      } catch (error) {
        console.error('Erreur:', error);
      }
    };

    loadBoard();
  }, [selectedProjectId]);

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
      <Card className="p-8 text-center">
        <h3 className="text-lg font-semibold mb-2">Aucun projet actif</h3>
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
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Kanban - Sélectionner un projet</h2>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Choisir un projet</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionner un projet..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!boardId) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-muted-foreground mb-4">Aucun tableau Kanban trouvé</div>
          <p className="text-sm text-muted-foreground">
            Le tableau sera créé automatiquement lors du démarrage du projet.
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
      setIsCardDialogOpen(true);
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
    setIsNewCardDialogOpen(true);
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
        
        setIsNewCardDialogOpen(false);
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
    setIsColumnDialogOpen(true);
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
      setIsColumnDialogOpen(false);
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
        
        setIsCardDialogOpen(false);
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
      {/* Header avec design Ialla - Fixed width */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 mb-4 border border-purple-200/50 flex-shrink-0 overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Layout className="w-6 h-6 text-white" />
            </div>
            
            <Select 
              value={selectedProjectId} 
              onValueChange={(value) => {
                setSelectedProjectId(value);
                onProjectChange?.(value);
              }}
            >
              <SelectTrigger className="w-64 bg-white border-purple-200 focus:border-purple-400">
                <SelectValue placeholder="Sélectionner un projet..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedProject && (
            <div className="flex items-center gap-2">
              <Button 
                onClick={handleAddColumn}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                size="sm"
              >
                <Columns className="w-4 h-4 mr-2" />
                Nouvelle colonne
              </Button>
            </div>
          )}
        </div>
      </div>

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

      {/* Dialog pour voir/éditer une carte */}
      <CardEditDialog
        open={isCardDialogOpen}
        onOpenChange={setIsCardDialogOpen}
        card={selectedCard}
        onCardChange={setSelectedCard}
        projectMembers={projectMembers}
        uploadedFiles={uploadedFiles}
        onUploadedFilesChange={setUploadedFiles}
        onSave={handleSaveCard}
        isSaving={isSavingCard}
        uploadProgress={uploadProgress}
      />

      {/* Dialog pour créer une nouvelle carte */}
      <CardCreateDialog
        open={isNewCardDialogOpen}
        onOpenChange={setIsNewCardDialogOpen}
        cardData={newCardData}
        onCardDataChange={setNewCardData}
        projectMembers={projectMembers}
        uploadedFiles={uploadedFiles}
        onUploadedFilesChange={setUploadedFiles}
        onSave={handleSaveNewCard}
        isSaving={isSavingCard}
        uploadProgress={uploadProgress}
      />

      {/* Dialog pour créer une nouvelle colonne */}
      <ColumnCreateDialog
        open={isColumnDialogOpen}
        onOpenChange={setIsColumnDialogOpen}
        columnData={newColumnData}
        onColumnDataChange={setNewColumnData}
        onSave={handleSaveColumn}
      />


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