import { Droppable } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, MoreHorizontal } from 'lucide-react';
import { KanbanColumn as KanbanColumnType, KanbanCard as KanbanCardType } from '@/types/kanban';
import { KanbanCard } from './KanbanCard';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface KanbanColumnProps {
  column: KanbanColumnType;
  cards: KanbanCardType[];
  onAddCard?: () => void;
  onEditColumn?: () => void;
  onDeleteColumn?: () => void;
  onCardClick?: (card: KanbanCardType) => void;
  onCardEdit?: (card: KanbanCardType) => void;
  onCardDelete?: (card: KanbanCardType) => void;
}

export const KanbanColumn = ({ 
  column, 
  cards, 
  onAddCard, 
  onEditColumn, 
  onDeleteColumn,
  onCardClick,
  onCardEdit,
  onCardDelete
}: KanbanColumnProps) => {
  const isOverLimit = column.limit && cards.length > column.limit;

  return (
    <div className="flex flex-col w-80 bg-gray-50 rounded-lg p-3">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {column.color && (
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: column.color }}
            />
          )}
          <h3 className="font-semibold text-sm">{column.title}</h3>
          <Badge 
            variant={isOverLimit ? "destructive" : "secondary"} 
            className="text-xs"
          >
            {cards.length}
            {column.limit && `/${column.limit}`}
          </Badge>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddCard}
            className="h-7 w-7 p-0"
          >
            <Plus className="w-3 h-3" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <MoreHorizontal className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEditColumn}>
                Modifier la colonne
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={onDeleteColumn}
                className="text-red-600"
              >
                Supprimer la colonne
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Cards Container */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 min-h-32 rounded transition-colors ${
              snapshot.isDraggingOver 
                ? 'bg-blue-50 border-2 border-blue-200 border-dashed' 
                : ''
            }`}
          >
            {cards.map((card, index) => (
              <KanbanCard
                key={card.id}
                card={card}
                index={index}
                onClick={() => onCardClick?.(card)}
                onEdit={() => onCardEdit?.(card)}
                onDelete={() => onCardDelete?.(card)}
              />
            ))}
            {provided.placeholder}

            {/* Empty state */}
            {cards.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <div className="text-4xl mb-2">📝</div>
                <p className="text-sm text-center">
                  Aucune carte dans cette colonne
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onAddCard}
                  className="mt-2 text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Ajouter une carte
                </Button>
              </div>
            )}
          </div>
        )}
      </Droppable>

      {/* Add Card Button (when cards exist) */}
      {cards.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onAddCard}
          className="mt-2 text-muted-foreground hover:text-foreground justify-start"
        >
          <Plus className="w-3 h-3 mr-2" />
          Ajouter une carte
        </Button>
      )}

      {/* WIP Limit Warning */}
      {isOverLimit && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
          ⚠️ Limite de travail en cours dépassée ({cards.length}/{column.limit})
        </div>
      )}
    </div>
  );
};