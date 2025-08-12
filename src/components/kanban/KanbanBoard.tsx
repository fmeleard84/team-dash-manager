import { useState } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Filter, 
  Users, 
  Calendar,
  Settings
} from 'lucide-react';
import { KanbanBoard as KanbanBoardType, KanbanCard, KanbanColumn as KanbanColumnType } from '@/types/kanban';
import { KanbanColumn } from './KanbanColumn';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface KanbanBoardProps {
  board: KanbanBoardType;
  onDragEnd: (result: DropResult) => void;
  onAddColumn?: () => void;
  onAddCard?: (columnId: string) => void;
  onEditColumn?: (column: KanbanColumnType) => void;
  onDeleteColumn?: (columnId: string) => void;
  onCardClick?: (card: KanbanCard) => void;
  onCardEdit?: (card: KanbanCard) => void;
  onCardDelete?: (cardId: string) => void;
  onBoardSettings?: () => void;
}

export const KanbanBoard = ({
  board,
  onDragEnd,
  onAddColumn,
  onAddCard,
  onEditColumn,
  onDeleteColumn,
  onCardClick,
  onCardEdit,
  onCardDelete,
  onBoardSettings
}: KanbanBoardProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Get cards for a specific column
  const getCardsForColumn = (columnId: string): KanbanCard[] => {
    const column = board.columns.find(col => col.id === columnId);
    if (!column) return [];

    return column.cardIds
      .map(cardId => board.cards[cardId])
      .filter(Boolean)
      .filter(card => {
        if (!searchTerm) return true;
        return card.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
               card.description?.toLowerCase().includes(searchTerm.toLowerCase());
      });
  };

  // Calculate board stats
  const totalCards = Object.keys(board.cards).length;
  const completedCards = board.columns
    .find(col => col.title.toLowerCase().includes('terminé') || col.title.toLowerCase().includes('done'))
    ?.cardIds.length || 0;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Board Header */}
      <div className="border-b bg-white p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{board.title}</h1>
            {board.description && (
              <p className="text-muted-foreground mt-1">{board.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {totalCards} cartes
            </Badge>
            <Badge variant="outline">
              {completedCards} terminées
            </Badge>
            
            <Button variant="outline" size="sm" onClick={onBoardSettings}>
              <Settings className="w-4 h-4 mr-1" />
              Paramètres
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher des cartes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-1" />
            Filtres
          </Button>

          <Button 
            variant="outline" 
            size="sm"
            onClick={onAddColumn}
          >
            <Plus className="w-4 h-4 mr-1" />
            Ajouter colonne
          </Button>
        </div>

        {/* Filters Panel (collapsible) */}
        {showFilters && (
          <div className="bg-gray-50 p-3 rounded-lg space-y-2">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Assigné à:</span>
                <Badge variant="secondary">Tous</Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Échéance:</span>
                <Badge variant="secondary">Toutes</Badge>
              </div>

              <Button variant="ghost" size="sm" className="ml-auto">
                Réinitialiser les filtres
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Board Content */}
      <div className="flex-1 overflow-hidden">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 p-4 h-full overflow-x-auto">
            {board.columns
              .sort((a, b) => a.position - b.position)
              .map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  cards={getCardsForColumn(column.id)}
                  onAddCard={() => onAddCard?.(column.id)}
                  onEditColumn={() => onEditColumn?.(column)}
                  onDeleteColumn={() => onDeleteColumn?.(column.id)}
                  onCardClick={onCardClick}
                  onCardEdit={onCardEdit}
                  onCardDelete={(card) => onCardDelete?.(card.id)}
                />
              ))
            }

            {/* Add Column Button */}
            <div className="flex items-center justify-center w-80 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
              <Button
                variant="ghost"
                onClick={onAddColumn}
                className="flex flex-col items-center gap-2 h-32 text-muted-foreground hover:text-foreground"
              >
                <Plus className="w-6 h-6" />
                <span className="text-sm font-medium">Ajouter une colonne</span>
              </Button>
            </div>
          </div>
        </DragDropContext>
      </div>

      {/* Empty State */}
      {board.columns.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-md">
            <div className="text-6xl">📋</div>
            <h3 className="text-xl font-semibold">Tableau vide</h3>
            <p className="text-muted-foreground">
              Commencez par créer votre première colonne pour organiser vos tâches.
            </p>
            <Button onClick={onAddColumn}>
              <Plus className="w-4 h-4 mr-2" />
              Créer une colonne
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};