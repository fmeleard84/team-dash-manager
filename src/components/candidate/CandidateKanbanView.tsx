import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { useKanbanSupabase } from "@/hooks/useKanbanSupabase";
import { useCandidateProjectsOptimized } from "@/hooks/useCandidateProjectsOptimized";
import { useProjectUsers } from "@/hooks/useProjectUsers";
import { Plus, Paperclip, Eye, Download, Trash2, Columns, Layout, User, Users, X, CalendarDays, FileText, Flag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CardEditDialog } from "@/components/kanban/dialogs/CardEditDialog";
import { CardCreateDialog } from "@/components/kanban/dialogs/CardCreateDialog";
import { ColumnCreateDialog } from "@/components/kanban/dialogs/ColumnCreateDialog";
import { toast } from "sonner";
import { uploadMultipleFiles, syncKanbanFilesToDrive, UploadedFile } from "@/utils/fileUpload";

interface CandidateKanbanViewProps {
  projectId?: string;
}

export default function CandidateKanbanView({ projectId }: CandidateKanbanViewProps = {}) {
  const { projects, loading, candidateId } = useCandidateProjectsOptimized();
  const selectedProjectId = projectId || "";
  const [boardId, setBoardId] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [isCardDialogOpen, setIsCardDialogOpen] = useState(false);
  const [isCardReadOnly, setIsCardReadOnly] = useState(false);
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

  // Set project from prop or default if only one available
  useEffect(() => {
    if (projectId) {
      setSelectedProjectId(projectId);
    } else if (projects.length === 1 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId, projectId]);

  if (!candidateId) {
    return (
      <Card className="p-8 text-center">
        <h3 className="text-lg font-semibold mb-2">Profil non trouvé</h3>
        <p className="text-muted-foreground">
          Impossible de charger votre profil candidat.
        </p>
      </Card>
    );
  }

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
        <Layout className="w-12 h-12 mx-auto mb-4 text-purple-500 opacity-50" />
        <h3 className="text-lg font-semibold mb-2">Aucun projet assigné</h3>
        <p className="text-muted-foreground">
          Vous n'avez aucun projet assigné pour le moment.
        </p>
      </Card>
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

  // Handler pour ouvrir la carte
  const handleCardClick = (card: any) => {
    
    // Check if card is in "Finalisé" or "Terminé" column
    const column = board?.columns.find(col => col.cardIds.includes(card.id));
    const isFinalized = column && (
      column.title.toLowerCase().includes('finalisé') || 
      column.title.toLowerCase().includes('terminé') ||
      column.title.toLowerCase().includes('done') ||
      column.title.toLowerCase().includes('complet')
    );
    
    // If card is finalized, open in read-only mode for candidates
    if (isFinalized) {
      setIsCardReadOnly(true);
    } else {
      setIsCardReadOnly(false);
    }
    
    // Format the date to YYYY-MM-DD for the input field and ensure assignedTo is an array
    let assignedToArray = [];
    
    if (card.assignedTo) {
      if (Array.isArray(card.assignedTo)) {
        assignedToArray = card.assignedTo.filter(item => item && item !== '[]' && item !== '');
      } else if (typeof card.assignedTo === 'string' && card.assignedTo !== '[]' && card.assignedTo !== '') {
        try {
          // Try to parse if it's a JSON string
          const parsed = JSON.parse(card.assignedTo);
          assignedToArray = Array.isArray(parsed) ? parsed.filter(item => item && item !== '[]' && item !== '') : [card.assignedTo];
        } catch {
          assignedToArray = [card.assignedTo];
        }
      }
    }

    // Handle files properly - check if it's a JSON string
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
    setUploadedFiles([]); // Reset uploaded files when opening a card
    setIsCardDialogOpen(true);
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

  // Handler pour sauvegarder une nouvelle carte
  const handleSaveNewCard = async () => {
    if (newCardData.title.trim()) {
      setIsSavingCard(true);
      setUploadProgress({ uploaded: 0, total: uploadedFiles.length });
      
      try {
        let newUploadedFiles: UploadedFile[] = [];
        
        // Upload new files to Supabase Storage if any
        if (uploadedFiles.length > 0) {
          console.log('📤 Uploading', uploadedFiles.length, 'files for new card...');
          
          // Generate temporary card ID for upload folder
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
            // Don't fail the whole operation if Drive sync fails
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
    // Pour l'instant, on peut juste permettre de renommer
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

  // Handler pour sauvegarder les modifications d'une carte
  const handleSaveCard = async () => {
    if (selectedCard) {
      setIsSavingCard(true);
      setUploadProgress({ uploaded: 0, total: uploadedFiles.length });
      
      try {
        let newUploadedFiles: UploadedFile[] = [];
        
        // Upload new files to Supabase Storage if any
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

        // Create UpdateCardInput object with correct structure
        const updateData = {
          id: selectedCard.id,
          title: selectedCard.title,
          description: selectedCard.description,
          assignedTo: Array.isArray(selectedCard.assignedTo) ? selectedCard.assignedTo[0] : selectedCard.assignedTo,
          dueDate: selectedCard.dueDate,
          priority: selectedCard.priority,
          files: combinedFiles
        };
        
        console.log('💾 DEBUG - selectedCard.files:', selectedCard.files);
        console.log('💾 DEBUG - newUploadedFiles:', newUploadedFiles);
        console.log('💾 DEBUG - Saving card with files:', combinedFiles);
        console.log('💾 DEBUG - Update data being sent:', updateData);
        
        // Wait for the card update to complete
        await updateCard(updateData);
        
        // Sync new files to Drive
        if (newUploadedFiles.length > 0 && selectedProjectId) {
          try {
            await syncKanbanFilesToDrive(newUploadedFiles, selectedProjectId);
            console.log('📁 Files synced to Drive successfully');
          } catch (syncError) {
            console.error('❌ Error syncing files to Drive:', syncError);
            // Don't fail the whole operation if Drive sync fails
          }
        }
        
        setIsCardDialogOpen(false);
        setUploadedFiles([]);
        setUploadProgress({ uploaded: 0, total: 0 });
        toast.success(`Carte sauvegardée${newUploadedFiles.length > 0 ? ` avec ${newUploadedFiles.length} fichier(s)` : ''}`);
      } catch (error) {
        console.error('Error saving card:', error);
        toast.error('Erreur lors de la sauvegarde: ' + (error as Error).message);
      } finally {
        setIsSavingCard(false);
      }
    }
  };

  return (
    <div>
      {/* Kanban board or empty state */}
      {selectedProjectId && boardId && board ? (
        <div className="h-[calc(100vh-20rem)]">
          <KanbanBoard
            board={board}
            onDragEnd={handleDragEnd}
            onAddColumn={handleAddColumn} // Use our custom handler
            onAddCard={handleAddCard} // Use our custom handler
            onEditColumn={handleEditColumn} // Use our custom handler
            onDeleteColumn={handleDeleteColumn} // Use our custom handler
            onCardClick={handleCardClick} // Use our custom handler
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
            hideTitle={true} // Nouveau prop pour cacher le titre du KanbanBoard
          />
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Layout className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Sélectionnez un projet pour voir le tableau Kanban</p>
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
        readOnly={isCardReadOnly}
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
    </div>
  );
}
