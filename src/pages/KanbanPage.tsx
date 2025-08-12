import { useEffect, useState } from 'react';
import { useKanban } from '@/hooks/useKanban';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
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
import { useNavigate } from 'react-router-dom';

const KanbanPage = () => {
  const navigate = useNavigate();
  const { 
    board, 
    isLoading,
    createBoard, 
    addColumn, 
    addCard, 
    updateCard,
    deleteCard,
    deleteColumn,
    handleDragEnd,
    exportBoard,
    importBoard
  } = useKanban();

  // Dialog states
  const [showColumnDialog, setShowColumnDialog] = useState(false);
  const [showCardDialog, setShowCardDialog] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState<string>('');
  const [selectedCard, setSelectedCard] = useState<KanbanCard | null>(null);

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

  // Initialize demo board
  useEffect(() => {
    if (!board) {
      const newBoard = createBoard(
        'Projet de développement web',
        'Tableau de suivi pour le développement de notre application web'
      );
      
      // Add default columns
      setTimeout(() => {
        addColumn({
          title: 'À faire',
          position: 0,
          color: '#ef4444'
        });
        
        addColumn({
          title: 'En cours',
          position: 1,
          color: '#f59e0b',
          limit: 3
        });
        
        addColumn({
          title: 'En révision',
          position: 2,
          color: '#3b82f6'
        });
        
        addColumn({
          title: 'Terminé',
          position: 3,
          color: '#10b981'
        });
      }, 100);

      // Add demo cards
      setTimeout(() => {
        if (newBoard) {
          addCard({
            title: 'Créer la page d\'accueil',
            description: 'Développer la page d\'accueil avec le design responsive',
            columnId: newBoard.columns?.[0]?.id || '',
            priority: 'high',
            status: 'todo',
            assignedTo: '4', // Sophie Chen (Designer)
            labels: ['Frontend', 'Design'],
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          });

          addCard({
            title: 'API utilisateurs',
            description: 'Créer les endpoints pour la gestion des utilisateurs',
            columnId: newBoard.columns?.[1]?.id || '',
            priority: 'medium',
            status: 'in_progress',
            assignedTo: '3', // Jean Martin (Backend)
            labels: ['Backend', 'API']
          });

          addCard({
            title: 'Tests unitaires',
            description: 'Écrire les tests pour les composants principaux',
            columnId: newBoard.columns?.[2]?.id || '',
            priority: 'low',
            status: 'review',
            assignedTo: '5', // Alex Rodriguez (QA)
            labels: ['Tests']
          });
        }
      }, 500);
    }
  }, [board, createBoard, addColumn, addCard]);

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
    setCardForm({
      title: card.title,
      description: card.description || '',
      columnId: '',
      priority: card.priority,
      status: card.status,
      assignedTo: card.assignedTo,
      labels: card.labels
    });
    setCardProgress(card.progress);
    setShowCardDialog(true);
  };

  const submitColumn = () => {
    if (!columnForm.title.trim()) return;
    
    addColumn(columnForm);
    setShowColumnDialog(false);
    setColumnForm({ title: '', position: 0 });
  };

  const submitCard = () => {
    if (!cardForm.title.trim()) return;
    
    if (selectedCard) {
      // Update existing card
      updateCard({
        id: selectedCard.id,
        title: cardForm.title,
        description: cardForm.description,
        priority: cardForm.priority,
        status: cardForm.status,
        assignedTo: cardForm.assignedTo,
        progress: cardProgress
      });
    } else {
      // Create new card
      addCard({
        ...cardForm,
        columnId: selectedColumnId
      });
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
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Retour
          </Button>
          <div className="h-4 w-px bg-gray-300" />
          <h1 className="text-lg font-semibold">Tableau Kanban</h1>
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
          onDeleteColumn={deleteColumn}
          onCardClick={handleCardClick}
          onCardDelete={deleteCard}
        />
      </div>

      {/* Add Column Dialog */}
      <Dialog open={showColumnDialog} onOpenChange={setShowColumnDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une colonne</DialogTitle>
            <DialogDescription>
              Créez une nouvelle colonne pour organiser vos tâches dans le tableau Kanban.
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
              <Button variant="outline" onClick={() => setShowColumnDialog(false)}>
                Annuler
              </Button>
              <Button onClick={submitColumn}>
                Ajouter
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
        <DialogContent className="max-w-md">
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