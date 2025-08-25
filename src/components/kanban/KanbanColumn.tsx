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
    <div className="flex flex-col w-80 min-h-[600px] bg-gradient-to-b from-white to-purple-50/30 rounded-xl shadow-sm border border-purple-100 p-4 flex-shrink-0">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-purple-100">
        <div className="flex items-center gap-3">
          {column.color && (
            <div 
              className="w-4 h-4 rounded-full shadow-sm ring-2 ring-white"
              style={{ backgroundColor: column.color }}
            />
          )}
          <h3 className="font-medium text-gray-900 tracking-tight">{column.title}</h3>
          <span className={`inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full ${
            isOverLimit 
              ? 'bg-red-100 text-red-700' 
              : 'bg-purple-100 text-purple-700'
          }`}>
            {cards.length}
            {column.limit && `/${column.limit}`}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddCard}
            className="h-7 w-7 p-0 hover:bg-purple-100 transition-colors"
          >
            <Plus className="w-4 h-4 text-purple-600" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-purple-100 transition-colors">
                <MoreHorizontal className="w-4 h-4 text-gray-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background border shadow-lg z-50">
              <DropdownMenuItem onClick={onEditColumn} className="cursor-pointer">
                Modifier la colonne
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={onDeleteColumn}
                className="text-red-600 cursor-pointer"
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
            className={`flex-1 min-h-[200px] rounded-lg transition-all p-1 ${
              snapshot.isDraggingOver 
                ? 'bg-gradient-to-b from-blue-50 to-purple-50 border-2 border-purple-300 border-dashed shadow-inner' 
                : 'bg-transparent'
            }`}
          >
            {cards.map((card, index) => (
              <KanbanCard
                key={card.id}
                card={card}
                index={index}
                columnTitle={column.title}
                onClick={() => onCardClick?.(card)}
                onEdit={() => onCardEdit?.(card)}
                onDelete={() => onCardDelete?.(card)}
              />
            ))}
            {provided.placeholder}

            {/* Empty state */}
            {cards.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mb-3">
                  <Plus className="w-6 h-6 text-purple-600" />
                </div>
                <p className="text-sm text-center text-gray-500 mb-3">
                  Aucune tâche dans cette étape
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onAddCard}
                  className="text-xs hover:bg-purple-100 text-purple-600"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Créer une tâche
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
          className="mt-3 text-purple-600 hover:text-purple-700 hover:bg-purple-50 justify-start transition-colors"
        >
          <Plus className="w-3 h-3 mr-2" />
          Ajouter une tâche
        </Button>
      )}

      {/* WIP Limit Warning */}
      {isOverLimit && (
        <div className="mt-3 p-2 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-lg text-xs text-red-600 font-medium">
          ⚠️ Limite atteinte ({cards.length}/{column.limit})
        </div>
      )}
    </div>
  );
};