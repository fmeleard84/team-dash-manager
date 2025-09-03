import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Plus, Calendar, Flag, User, MoreVertical, Trash2, Edit } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  assignedTo?: string;
  files?: any[];
  labels?: string[];
}

interface KanbanColumn {
  id: string;
  title: string;
  color?: string;
  cards?: KanbanCard[];
  cardIds: string[];
  position: number;
}

interface KanbanBoard {
  id: string;
  title: string;
  columns: KanbanColumn[];
  cards: KanbanCard[];
}

interface KanbanBoardProps {
  board: KanbanBoard;
  onDragEnd: (result: DropResult) => void;
  onAddColumn?: () => void;
  onAddCard?: (columnId: string) => void;
  onEditColumn?: (column: KanbanColumn) => void;
  onDeleteColumn?: (columnId: string) => void;
  onCardClick?: (card: KanbanCard) => void;
  onCardEdit?: (card: KanbanCard) => void;
  onCardDelete?: (cardId: string) => void;
  projectFilter?: string;
  onProjectFilterChange?: (filter: string) => void;
  availableProjects?: any[];
  userFilter?: string;
  onUserFilterChange?: (filter: string) => void;
  projectMembers?: any[];
  hideTitle?: boolean;
}

export function KanbanBoard({
  board,
  onDragEnd,
  onAddColumn,
  onAddCard,
  onEditColumn,
  onDeleteColumn,
  onCardClick,
  onCardEdit,
  onCardDelete,
  hideTitle,
}: KanbanBoardProps) {
  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getCardsByColumnId = (columnId: string) => {
    const column = board.columns.find(col => col.id === columnId);
    if (!column) return [];
    
    return column.cardIds
      .map(cardId => board.cards.find(card => card.id === cardId))
      .filter(Boolean) as KanbanCard[];
  };

  return (
    <div className="h-full flex flex-col">
      {!hideTitle && (
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">{board.title}</h2>
          {onAddColumn && (
            <Button onClick={onAddColumn} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter une colonne
            </Button>
          )}
        </div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-4 min-h-full pb-4">
            {board.columns.map((column) => {
              const columnCards = getCardsByColumnId(column.id);
              
              return (
                <div key={column.id} className="flex-shrink-0 w-80">
                  <Card className="h-full flex flex-col">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: column.color || '#3b82f6' }}
                          />
                          <CardTitle className="text-lg">{column.title}</CardTitle>
                          <Badge variant="secondary" className="text-xs">
                            {columnCards.length}
                          </Badge>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {onEditColumn && (
                              <DropdownMenuItem onClick={() => onEditColumn(column)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Modifier
                              </DropdownMenuItem>
                            )}
                            {onDeleteColumn && (
                              <DropdownMenuItem 
                                onClick={() => onDeleteColumn(column.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>

                    <CardContent className="flex-1 pt-0">
                      <Droppable droppableId={column.id}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`space-y-3 min-h-[200px] p-2 rounded-md transition-colors ${
                              snapshot.isDraggingOver ? 'bg-muted/50' : ''
                            }`}
                          >
                            {columnCards.map((card, index) => (
                              <Draggable key={card.id} draggableId={card.id} index={index}>
                                {(provided, snapshot) => (
                                  <Card
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`cursor-pointer hover:shadow-md transition-shadow ${
                                      snapshot.isDragging ? 'shadow-lg rotate-2' : ''
                                    }`}
                                    onClick={() => onCardClick?.(card)}
                                  >
                                    <CardContent className="p-3">
                                      <div className="space-y-2">
                                        <div className="flex items-start justify-between">
                                          <h4 className="font-medium text-sm leading-tight">
                                            {card.title}
                                          </h4>
                                          {card.priority && (
                                            <div 
                                              className={`w-2 h-2 rounded-full ${getPriorityColor(card.priority)}`}
                                              title={`Priorité: ${card.priority}`}
                                            />
                                          )}
                                        </div>
                                        
                                        {card.description && (
                                          <p className="text-xs text-muted-foreground line-clamp-2">
                                            {card.description}
                                          </p>
                                        )}

                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-1">
                                            {card.dueDate && (
                                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(card.dueDate).toLocaleDateString()}
                                              </div>
                                            )}
                                            {card.files && card.files.length > 0 && (
                                              <Badge variant="outline" className="text-xs">
                                                {card.files.length} fichier(s)
                                              </Badge>
                                            )}
                                          </div>
                                          
                                          {card.assignedTo && (
                                            <Avatar className="w-6 h-6">
                                              <AvatarFallback className="text-xs">
                                                {card.assignedTo.substring(0, 2).toUpperCase()}
                                              </AvatarFallback>
                                            </Avatar>
                                          )}
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                            
                            {onAddCard && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-muted-foreground hover:text-foreground"
                                onClick={() => onAddCard(column.id)}
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Ajouter une carte
                              </Button>
                            )}
                          </div>
                        )}
                      </Droppable>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}