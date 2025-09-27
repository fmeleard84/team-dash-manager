import { useState, useCallback } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { Button } from '@/ui/components/button';
import { Input } from '@/ui/components/input';
import { Badge } from '@/ui/components/badge';
import {
  Plus,
  Search,
  Filter,
  Users,
  Calendar,
  Settings,
  FolderKanban,
  BarChart3,
  AlertCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/ui/components/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/select';
import { UserSelectNeon } from '@/ui/components/user-select-neon';
import { UserAvatarNeon } from '@/ui/components/user-avatar-neon';
import { useKanbanBoard, useKanbanActions, useKanbanMembers, useKanbanStats } from '../hooks';
import type { KanbanBoard as KanbanBoardType, KanbanCard, KanbanColumn as KanbanColumnType } from '../types';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard as KanbanCardComponent } from './KanbanCard';

interface KanbanBoardProps {
  boardId: string;
  projectId?: string;
  hideTitle?: boolean;
  onCardClick?: (card: KanbanCard) => void;
  onCardEdit?: (card: KanbanCard) => void;
  onBoardSettings?: () => void;
  className?: string;
}

export function KanbanBoard({
  boardId,
  projectId,
  hideTitle = false,
  onCardClick,
  onCardEdit,
  onBoardSettings,
  className = ''
}: KanbanBoardProps) {
  // Hooks du module Kanban
  const { board, loading, error, refetch } = useKanbanBoard(boardId);
  const { members, loading: membersLoading } = useKanbanMembers(boardId);
  const { stats } = useKanbanStats(boardId);
  const {
    moveCard,
    createColumn,
    createCard,
    updateColumn,
    deleteColumn,
    deleteCard,
    loading: actionLoading,
    error: actionError
  } = useKanbanActions();

  // État local pour les filtres et UI
  const [searchQuery, setSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [showColumnDialog, setShowColumnDialog] = useState(false);
  const [showCardDialog, setShowCardDialog] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState<string>('');

  // Gestion du drag and drop
  const handleDragEnd = useCallback(async (result: DropResult) => {
    if (!result.destination || !board) return;

    const { draggableId, source, destination } = result;

    // Si la carte n'a pas changé de position, ne rien faire
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    console.log('🔄 [KanbanBoard] Moving card:', {
      cardId: draggableId,
      from: source.droppableId,
      to: destination.droppableId,
      newPosition: destination.index + 1
    });

    // Déplacer la carte
    const success = await moveCard({
      cardId: draggableId,
      sourceColumnId: source.droppableId,
      targetColumnId: destination.droppableId,
      newPosition: destination.index + 1
    });

    if (success) {
      // Rafraîchir le board pour refléter les changements
      refetch();
    }
  }, [board, moveCard, refetch]);

  // Gestion des actions
  const handleAddColumn = useCallback(async (title: string) => {
    if (!board || !title.trim()) return;

    const success = await createColumn({
      title: title.trim(),
      boardId: board.id
    });

    if (success) {
      setShowColumnDialog(false);
      refetch();
    }
  }, [board, createColumn, refetch]);

  const handleAddCard = useCallback(async (columnId: string, title: string) => {
    if (!board || !title.trim()) return;

    const success = await createCard({
      title: title.trim(),
      columnId,
      boardId: board.id
    });

    if (success) {
      setShowCardDialog(false);
      setSelectedColumnId('');
      refetch();
    }
  }, [board, createCard, refetch]);

  const handleDeleteColumn = useCallback(async (columnId: string) => {
    const success = await deleteColumn(columnId);
    if (success) {
      refetch();
    }
  }, [deleteColumn, refetch]);

  const handleDeleteCard = useCallback(async (cardId: string) => {
    const success = await deleteCard(cardId);
    if (success) {
      refetch();
    }
  }, [deleteCard, refetch]);

  // Filtrage des cartes
  const getFilteredCards = useCallback((cards: Record<string, KanbanCard>) => {
    return Object.values(cards).filter(card => {
      // Filtre par recherche
      if (searchQuery && !card.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Filtre par utilisateur
      if (userFilter && card.assignedTo !== userFilter) {
        return false;
      }

      return true;
    });
  }, [searchQuery, userFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-neutral-600 dark:text-neutral-400">Chargement du Kanban...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 dark:text-red-400 p-8">
        <AlertCircle className="w-12 h-12 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Erreur de chargement</h3>
        <p className="mb-4">{error}</p>
        <Button onClick={refetch} variant="outline">
          Réessayer
        </Button>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="text-center text-neutral-600 dark:text-neutral-400 p-8">
        <FolderKanban className="w-12 h-12 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Board non trouvé</h3>
        <p>Ce board n'existe pas ou vous n'y avez pas accès.</p>
      </div>
    );
  }

  const filteredCards = getFilteredCards(board.cards);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header du board */}
      {!hideTitle && (
        <div className="flex items-center justify-between mb-6 p-4 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-primary-500" />
              <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">
                {board.title}
              </h1>
            </div>

            {stats && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1">
                  <BarChart3 className="w-3 h-3" />
                  {stats.totalCards} cartes
                </Badge>
                <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200">
                  {Math.round(stats.completionRate)}% complété
                </Badge>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Membres d'équipe */}
            {!membersLoading && members.length > 0 && (
              <div className="flex items-center gap-1">
                {members.slice(0, 3).map(member => (
                  <UserAvatarNeon
                    key={member.id}
                    name={member.name}
                    size="sm"
                    className="ring-2 ring-white dark:ring-neutral-900"
                  />
                ))}
                {members.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{members.length - 3}
                  </Badge>
                )}
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="w-4 h-4" />
              Filtres
            </Button>

            <Dialog open={showColumnDialog} onOpenChange={setShowColumnDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Colonne
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nouvelle colonne</DialogTitle>
                </DialogHeader>
                <ColumnCreateForm onSubmit={handleAddColumn} loading={actionLoading} />
              </DialogContent>
            </Dialog>

            {onBoardSettings && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBoardSettings}
                className="gap-2"
              >
                <Settings className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Filtres */}
      {showFilters && (
        <div className="mb-4 p-4 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-neutral-400" />
              <Input
                placeholder="Rechercher une carte..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrer par membre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les membres</SelectItem>
                {members.map(member => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setUserFilter('');
              }}
              className="gap-2"
            >
              Réinitialiser
            </Button>
          </div>
        </div>
      )}

      {/* Board Kanban */}
      <div className="flex-1 overflow-hidden">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 h-full overflow-x-auto pb-4">
            {board.columns
              .sort((a, b) => a.position - b.position)
              .map(column => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  cards={column.cardIds
                    .map(cardId => board.cards[cardId])
                    .filter(card => card && filteredCards.some(fc => fc.id === card.id))
                    .sort((a, b) => a.position - b.position)
                  }
                  onAddCard={() => {
                    setSelectedColumnId(column.id);
                    setShowCardDialog(true);
                  }}
                  onEditColumn={(col) => console.log('Edit column:', col)}
                  onDeleteColumn={() => handleDeleteColumn(column.id)}
                  onCardClick={onCardClick}
                  onCardEdit={onCardEdit}
                  onCardDelete={handleDeleteCard}
                  teamMembers={members}
                />
              ))
            }
          </div>
        </DragDropContext>
      </div>

      {/* Dialog création de carte */}
      <Dialog open={showCardDialog} onOpenChange={(open) => {
        setShowCardDialog(open);
        if (!open) setSelectedColumnId('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle carte</DialogTitle>
          </DialogHeader>
          <CardCreateForm
            onSubmit={(title) => handleAddCard(selectedColumnId, title)}
            loading={actionLoading}
          />
        </DialogContent>
      </Dialog>

      {/* Affichage des erreurs */}
      {actionError && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white p-3 rounded-lg shadow-lg">
          {actionError}
        </div>
      )}
    </div>
  );
}

// Composants formulaires simples
function ColumnCreateForm({ onSubmit, loading }: { onSubmit: (title: string) => void; loading: boolean }) {
  const [title, setTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onSubmit(title);
      setTitle('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        placeholder="Nom de la colonne"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={loading}
      />
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={loading || !title.trim()}>
          {loading ? 'Création...' : 'Créer'}
        </Button>
      </div>
    </form>
  );
}

function CardCreateForm({ onSubmit, loading }: { onSubmit: (title: string) => void; loading: boolean }) {
  const [title, setTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onSubmit(title);
      setTitle('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        placeholder="Titre de la carte"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={loading}
      />
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={loading || !title.trim()}>
          {loading ? 'Création...' : 'Créer'}
        </Button>
      </div>
    </form>
  );
}

export default KanbanBoard;