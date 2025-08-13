import { useEffect, useState } from 'react';
import { useKanbanSupabase } from '@/hooks/useKanbanSupabase';
import { useKanbanFiles } from '@/hooks/useKanbanFiles';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { FileUploadArea } from '@/components/kanban/FileUploadArea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { KanbanCard, KanbanColumn, CreateCardInput, CreateColumnInput, TeamMember } from '@/types/kanban';
import { ArrowLeft, Plus, Download, Upload } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';


const KanbanPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [availableProjects, setAvailableProjects] = useState<Array<{ id: string; title: string }>>([]);

  const { 
    board, 
    isLoading,
    createBoard, 
    addColumn, 
    updateColumn,
    addCard, 
    updateCard,
    deleteCard,
    deleteColumn,
    handleDragEnd,
    exportBoard,
    importBoard
  } = useKanbanSupabase(boardId || undefined);

  // Dialog states
  const [showColumnDialog, setShowColumnDialog] = useState(false);
  const [showCardDialog, setShowCardDialog] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState<string>('');
  const [selectedCard, setSelectedCard] = useState<KanbanCard | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<KanbanColumn | null>(null);

  // File management hook for the selected card
  const { 
    files, 
    uploading, 
    loadFiles, 
    uploadFile, 
    deleteFile, 
    downloadFile 
  } = useKanbanFiles(selectedCard?.id || '');

  // File management for new cards
  const [newCardFiles, setNewCardFiles] = useState<File[]>([]);

  // Form states
  const [columnForm, setColumnForm] = useState<CreateColumnInput>({
    title: '',
    position: 0
  });

  const [cardForm, setCardForm] = useState<CreateCardInput>({
    title: '',
    description: '',
    columnId: '',
    priority: 'medium',
    status: 'todo',
    assignedTo: undefined
  });
  
  const [cardProgress, setCardProgress] = useState(0);

  // Load available projects
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const { data: projects, error } = await supabase
          .from('projects')
          .select('id, title')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setAvailableProjects(projects || []);
      } catch (error) {
        console.error('Error loading projects:', error);
      }
    };
    loadProjects();
  }, []);

  // Bootstrap board based on project_id
  useEffect(() => {
    const pid = searchParams.get('project_id');
    if (pid) setProjectId(pid);
  }, [searchParams]);

  useEffect(() => {
    const bootstrap = async () => {
      if (!projectId || boardId) return;
      // Try to find existing board for this project
      const { data: existing, error: findErr } = await (supabase as any)
        .from('kanban_boards')
        .select('id')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .maybeSingle();

      if (existing?.id) {
        setBoardId(existing.id);
        return;
      }

      // Create a new board for this project
      const created = await createBoard('Kanban', 'Tableau du projet', projectId);
      if (created?.id) setBoardId(created.id);
    };
    bootstrap();
  }, [projectId, boardId, createBoard]);

  const handleAddColumn = () => {
    setColumnForm({
      title: '',
      position: board?.columns.length || 0
    });
    setShowColumnDialog(true);
  };

  const handleAddCard = (columnId: string) => {
    setSelectedColumnId(columnId);
    setCardForm({
      title: '',
      description: '',
      columnId,
      priority: 'medium',
      status: 'todo',
      assignedTo: undefined
    });
    setCardProgress(0);
    setShowCardDialog(true);
  };

  const handleCardClick = (card: KanbanCard) => {
    setSelectedCard(card);
    
    // Convert ISO date to YYYY-MM-DD format for date input
    const formattedDate = card.dueDate ? 
      new Date(card.dueDate).toISOString().split('T')[0] : '';
    
    setCardForm({
      title: card.title,
      description: card.description || '',
      columnId: '',
      priority: card.priority,
      status: card.status,
      assignedTo: card.assignedTo,
      dueDate: formattedDate,
      labels: card.labels
    });
    setCardProgress(card.progress);
    setShowCardDialog(true);
    
    // Load files for this card
    setTimeout(() => {
      if (card.id) loadFiles();
    }, 100);
  };

  const submitColumn = () => {
    if (!columnForm.title.trim()) return;
    
    if (selectedColumn) {
      // Update existing column
      updateColumn({
        id: selectedColumn.id,
        title: columnForm.title,
        position: columnForm.position,
        color: columnForm.color,
        limit: columnForm.limit
      });
    } else {
      // Create new column
      addColumn(columnForm);
    }
    
    setShowColumnDialog(false);
    setSelectedColumn(null);
    setColumnForm({ title: '', position: 0 });
  };

  const submitCard = async () => {
    if (!cardForm.title.trim()) return;
    
    // Convert date from YYYY-MM-DD to proper date format for storage
    const processedForm = {
      ...cardForm,
      dueDate: cardForm.dueDate ? new Date(cardForm.dueDate + 'T00:00:00.000Z').toISOString() : undefined
    };
    
    if (selectedCard) {
      // Update existing card
      updateCard({
        id: selectedCard.id,
        title: processedForm.title,
        description: processedForm.description,
        priority: processedForm.priority,
        status: processedForm.status,
        assignedTo: processedForm.assignedTo,
        dueDate: processedForm.dueDate,
        progress: cardProgress
      });
    } else {
      // Create new card
      const newCard = await addCard({
        ...processedForm,
        columnId: selectedColumnId
      });
      
      // Upload files for new card if any
      if (newCard && newCardFiles.length > 0) {
        for (const file of newCardFiles) {
          await uploadFile(file);
        }
        setNewCardFiles([]);
      }
    }
    
    setShowCardDialog(false);
    setSelectedCard(null);
    setCardForm({
      title: '',
      description: '',
      columnId: '',
      priority: 'medium',
      status: 'todo',
      assignedTo: undefined
    });
    setCardProgress(0);
  };

  // Handle project filter change
  const handleProjectFilterChange = (newProjectId: string) => {
    if (newProjectId && newProjectId !== projectId) {
      setProjectId(newProjectId);
      setBoardId(null); // Reset board ID to force reload
      navigate(`/kanban?project_id=${newProjectId}`);
    }
  };

  if (!board) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Chargement du tableau...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/client-dashboard?tab=kanban')}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Retour
          </Button>
          <div className="h-4 w-px bg-gray-300" />
          <h1 className="text-lg font-semibold">Mon suivi de projet</h1>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {Object.keys(board.cards).length} cartes
          </Badge>
          <Badge variant="secondary">
            {board.columns.length} colonnes
          </Badge>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportBoard()}
            className="ml-4"
          >
            <Download className="w-4 h-4 mr-1" />
            Exporter JSON
          </Button>
          
          <label className="cursor-pointer">
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <span>
                <Upload className="w-4 h-4 mr-1" />
                Importer JSON
              </span>
            </Button>
            <input
              type="file"
              accept=".json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const content = event.target?.result as string;
                    importBoard(content);
                  };
                  reader.readAsText(file);
                }
              }}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="h-[calc(100vh-73px)]">
        <KanbanBoard
          board={board}
          onDragEnd={handleDragEnd}
          onAddColumn={handleAddColumn}
          onAddCard={handleAddCard}
          onEditColumn={(column) => {
            setSelectedColumn(column);
            setColumnForm({ 
              title: column.title, 
              position: column.position,
              color: column.color,
              limit: column.limit 
            });
            setShowColumnDialog(true);
          }}
          onDeleteColumn={deleteColumn}
          onCardClick={handleCardClick}
          onCardEdit={handleCardClick}
          onCardDelete={deleteCard}
          projectFilter={projectId || ''}
          onProjectFilterChange={handleProjectFilterChange}
          availableProjects={availableProjects}
        />
      </div>

      {/* Add Column Dialog */}
      <Dialog open={showColumnDialog} onOpenChange={setShowColumnDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedColumn ? 'Modifier la colonne' : 'Ajouter une colonne'}
            </DialogTitle>
            <DialogDescription>
              {selectedColumn 
                ? 'Modifiez les paramètres de cette colonne.'
                : 'Créez une nouvelle colonne pour organiser vos tâches dans le tableau Kanban.'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="column-title">Titre de la colonne</Label>
              <Input
                id="column-title"
                value={columnForm.title}
                onChange={(e) => setColumnForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: À faire, En cours, Terminé"
              />
            </div>
            <div>
              <Label htmlFor="column-color">Couleur (optionnelle)</Label>
              <Input
                id="column-color"
                type="color"
                value={columnForm.color || '#6b7280'}
                onChange={(e) => setColumnForm(prev => ({ ...prev, color: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="column-limit">Limite de cartes (optionnelle)</Label>
              <Input
                id="column-limit"
                type="number"
                min="1"
                value={columnForm.limit || ''}
                onChange={(e) => setColumnForm(prev => ({ 
                  ...prev, 
                  limit: e.target.value ? parseInt(e.target.value) : undefined 
                }))}
                placeholder="Ex: 5"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => {
                setShowColumnDialog(false);
                setSelectedColumn(null);
              }}>
                Annuler
              </Button>
              <Button onClick={submitColumn}>
                {selectedColumn ? 'Modifier' : 'Ajouter'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Card Dialog */}
      <Dialog open={showCardDialog} onOpenChange={(open) => {
        setShowCardDialog(open);
        if (!open) {
          setSelectedCard(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedCard ? 'Modifier la carte' : 'Ajouter une carte'}
            </DialogTitle>
            <DialogDescription>
              {selectedCard 
                ? 'Modifiez les informations de cette carte et son assignation.'
                : 'Créez une nouvelle carte avec les détails de la tâche.'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="card-title">Titre de la carte</Label>
              <Input
                id="card-title"
                value={cardForm.title}
                onChange={(e) => setCardForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Développer la fonctionnalité X"
              />
            </div>
            
            <div>
              <Label htmlFor="card-description">Description</Label>
              <Textarea
                id="card-description"
                value={cardForm.description}
                onChange={(e) => setCardForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Décrivez la tâche en détail..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="card-priority">Priorité</Label>
                <Select
                  value={cardForm.priority}
                  onValueChange={(value: 'low' | 'medium' | 'high') =>
                    setCardForm(prev => ({ ...prev, priority: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une priorité" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Faible</SelectItem>
                    <SelectItem value="medium">Moyenne</SelectItem>
                    <SelectItem value="high">Élevée</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="card-status">Statut</Label>
                <Select
                  value={cardForm.status}
                  onValueChange={(value: 'todo' | 'in_progress' | 'review' | 'done') =>
                    setCardForm(prev => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">À faire</SelectItem>
                    <SelectItem value="in_progress">En cours</SelectItem>
                    <SelectItem value="review">À vérifier</SelectItem>
                    <SelectItem value="done">Finalisé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="card-assignee">Assigné à</Label>
              <Select
                value={cardForm.assignedTo || 'unassigned'}
                onValueChange={(value) =>
                  setCardForm(prev => ({ 
                    ...prev, 
                    assignedTo: value === 'unassigned' ? undefined : value 
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un membre de l'équipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Personne</SelectItem>
                  {board?.teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={member.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${member.name}`} />
                          <AvatarFallback className="text-xs">
                            {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{member.name}</span>
                          <span className="text-xs text-muted-foreground">{member.role}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="card-due-date">Date d'échéance</Label>
              <Input
                id="card-due-date"
                type="date"
                value={cardForm.dueDate || ''}
                onChange={(e) => setCardForm(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>


            <div>
              <Label htmlFor="card-progress">Progression ({cardProgress}%)</Label>
              <div className="space-y-2">
                <Progress value={cardProgress} className="w-full" />
                <Input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={cardProgress}
                  onChange={(e) => setCardProgress(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            {/* File Upload Section */}
            <div>
              <Label>Fichiers joints</Label>
              {selectedCard ? (
                <FileUploadArea
                  files={files}
                  uploading={uploading}
                  onFileUpload={async (uploadedFiles) => {
                    for (const file of uploadedFiles) {
                      await uploadFile(file);
                    }
                  }}
                  onFileDelete={deleteFile}
                  onFileDownload={downloadFile}
                />
              ) : (
                <FileUploadArea
                  files={newCardFiles.map(file => ({
                    id: file.name,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    url: '',
                    uploadedAt: new Date().toISOString()
                  }))}
                  uploading={false}
                  onFileUpload={(uploadedFiles) => {
                    setNewCardFiles(prev => [...prev, ...uploadedFiles]);
                  }}
                  onFileDelete={(fileName) => {
                    setNewCardFiles(prev => prev.filter(f => f.name !== fileName));
                  }}
                  onFileDownload={() => {}}
                />
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowCardDialog(false)}>
                Annuler
              </Button>
              <Button onClick={submitCard}>
                {selectedCard ? 'Modifier' : 'Ajouter'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KanbanPage;