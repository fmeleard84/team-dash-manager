import { Draggable } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Calendar, 
  MessageSquare, 
  Paperclip, 
  User, 
  AlertTriangle,
  Clock,
  MoreHorizontal
} from 'lucide-react';
import { KanbanCard as KanbanCardType } from '@/types/kanban';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface KanbanCardProps {
  card: KanbanCardType;
  index: number;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const getPriorityColor = (priority: 'low' | 'medium' | 'high') => {
  switch (priority) {
    case 'high': return 'bg-red-500';
    case 'medium': return 'bg-yellow-500';
    case 'low': return 'bg-green-500';
    default: return 'bg-gray-500';
  }
};

const getPriorityIcon = (priority: 'low' | 'medium' | 'high') => {
  switch (priority) {
    case 'high': return <AlertTriangle className="w-3 h-3" />;
    case 'medium': return <Clock className="w-3 h-3" />;
    case 'low': return null;
    default: return null;
  }
};

const getStatusColor = (status: 'todo' | 'in_progress' | 'review' | 'done') => {
  switch (status) {
    case 'todo': return 'bg-gray-100 text-gray-600 border-gray-300';
    case 'in_progress': return 'bg-blue-100 text-blue-600 border-blue-300';
    case 'review': return 'bg-orange-100 text-orange-600 border-orange-300';
    case 'done': return 'bg-green-100 text-green-600 border-green-300';
    default: return 'bg-gray-100 text-gray-600 border-gray-300';
  }
};

const getStatusLabel = (status: 'todo' | 'in_progress' | 'review' | 'done') => {
  switch (status) {
    case 'todo': return 'À faire';
    case 'in_progress': return 'En cours';
    case 'review': return 'À vérifier';
    case 'done': return 'Finalisé';
    default: return 'À faire';
  }
};

export const KanbanCard = ({ card, index, onClick, onEdit, onDelete }: KanbanCardProps) => {
  const isOverdue = card.dueDate && new Date(card.dueDate) < new Date();

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`mb-3 ${snapshot.isDragging ? 'rotate-2 shadow-lg' : ''}`}
        >
          <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${
              snapshot.isDragging ? 'shadow-xl bg-blue-50 border-blue-200' : ''
            }`}
            onClick={onClick}
          >
            <CardHeader className="p-3 pb-2">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-medium text-sm line-clamp-2 flex-1">
                  {card.title}
                </h4>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-gray-100">
                      <MoreHorizontal className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-32">
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      onEdit?.();
                    }}>
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete?.();
                      }}
                      className="text-red-600"
                    >
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Status and Labels */}
              <div className="flex flex-wrap gap-1 mt-1">
                {/* Status Badge */}
                <Badge 
                  className={`text-xs px-2 py-0.5 h-auto border ${getStatusColor(card.status)}`}
                  variant="outline"
                >
                  {getStatusLabel(card.status)}
                </Badge>
                
                {/* Labels */}
                {card.labels.slice(0, 2).map((label) => (
                  <Badge 
                    key={label} 
                    variant="secondary" 
                    className="text-xs px-1.5 py-0.5 h-auto"
                  >
                    {label}
                  </Badge>
                ))}
                {card.labels.length > 2 && (
                  <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-auto">
                    +{card.labels.length - 2}
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-3 pt-0 space-y-2">
              {/* Description preview */}
              {card.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {card.description}
                </p>
              )}

              {/* Progress bar */}
              {card.progress > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progression</span>
                    <span>{card.progress}%</span>
                  </div>
                  <Progress value={card.progress} className="h-1.5" />
                </div>
              )}

              {/* Bottom row with info */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  {/* Priority indicator */}
                  {card.priority !== 'low' && (
                    <div className={`flex items-center gap-1 ${getPriorityColor(card.priority)} text-white px-1.5 py-0.5 rounded text-xs`}>
                      {getPriorityIcon(card.priority)}
                      <span className="capitalize">{card.priority}</span>
                    </div>
                  )}

                  {/* Comments count */}
                  {card.comments.length > 0 && (
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      <span>{card.comments.length}</span>
                    </div>
                  )}

                  {/* Attachments count */}
                  {card.attachments.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Paperclip className="w-3 h-3" />
                      <span>{card.attachments.length}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Due date */}
                  {card.dueDate && (
                    <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : ''}`}>
                      <Calendar className="w-3 h-3" />
                      <span>
                        {format(new Date(card.dueDate), 'dd MMM', { locale: fr })}
                      </span>
                    </div>
                  )}

                  {/* Assigned user */}
                  {card.assignedToName && (
                    <div className="flex items-center gap-1" title={`Assigné à ${card.assignedToName}`}>
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={card.assignedToAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${card.assignedToName}`} />
                        <AvatarFallback className="text-xs">
                          {card.assignedToName.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Draggable>
  );
};