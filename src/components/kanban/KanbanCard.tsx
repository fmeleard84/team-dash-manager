import { Draggable } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MessageSquare, 
  Paperclip, 
  User, 
  AlertTriangle,
  Clock,
  MoreHorizontal,
  CalendarDays,
  Star
} from 'lucide-react';
import { KanbanCard as KanbanCardType } from '@/types/kanban';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useKanbanCardFiles } from '@/hooks/useKanbanCardFiles';
import { getStatusFromColumnTitle, getStatusLabel, getStatusColor, getStatusDotColor } from '@/utils/kanbanStatus';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface KanbanCardProps {
  card: KanbanCardType;
  index: number;
  columnTitle?: string;
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

// Status functions moved to utils/kanbanStatus.ts

export const KanbanCard = ({ card, index, columnTitle, onClick, onEdit, onDelete }: KanbanCardProps) => {
  // Derive status from column title
  const status = columnTitle ? getStatusFromColumnTitle(columnTitle) : card.status;
  const isOverdue = card.dueDate && new Date(card.dueDate) < new Date();
  
  // Use files from card.files instead of useKanbanCardFiles hook
  const fileCount = card.files?.length || 0;
  
  // État pour stocker la note moyenne
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [hasRating, setHasRating] = useState(false);
  
  // Charger la note moyenne si la carte est finalisée
  useEffect(() => {
    const loadRating = async () => {
      if (status === 'done') {
        const { data } = await supabase
          .from('task_ratings')
          .select('rating')
          .eq('task_id', card.id);
        
        if (data && data.length > 0) {
          const average = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
          setAverageRating(Math.round(average * 10) / 10); // Arrondir à 1 décimale
          setHasRating(true);
        }
      }
    };
    
    loadRating();
    
    // Subscribe to realtime updates for ratings
    const subscription = supabase
      .channel(`task-rating-${card.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_ratings',
          filter: `task_id=eq.${card.id}`
        },
        () => {
          loadRating();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [card.id, status]);
  
  // Check if card has assigned users (support both string and array formats)
  const hasAssignedUsers = () => {
    if (card.assignedToName) return true;
    if (card.assignedTo) {
      if (Array.isArray(card.assignedTo)) {
        return card.assignedTo.length > 0 && card.assignedTo.some(user => user && user !== '[]' && user !== '');
      }
      if (typeof card.assignedTo === 'string') {
        return card.assignedTo !== '' && card.assignedTo !== '[]';
      }
    }
    return false;
  };

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`mb-3 ${snapshot.isDragging ? 'rotate-1 z-[9999]' : ''}`}
        >
            <Card
              className={`cursor-pointer bg-card rounded-xl border ${
                snapshot.isDragging
                  ? 'shadow-2xl ring-2 ring-primary opacity-90 scale-105'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={onClick}
            >
            <CardHeader className="p-4 pb-2">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-medium text-sm text-card-foreground line-clamp-2 flex-1">
                  {card.title}
                </h4>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-accent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="w-3 h-3 text-gray-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-32 bg-background border shadow-lg z-[100]">
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      onEdit?.();
                    }} className="cursor-pointer">
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete?.();
                      }}
                      className="text-red-600 cursor-pointer"
                    >
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Status and Labels */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {/* Status Badge - Plus visible */}
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
                  <div className={`w-2 h-2 rounded-full ${getStatusDotColor(status)}`} />
                  {getStatusLabel(status)}
                </span>
                
                {/* Rating Badge pour les cartes finalisées avec note */}
                {hasRating && averageRating !== null && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-50 border border-yellow-200 text-yellow-700">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    {averageRating}
                  </span>
                )}
                
                {/* Labels */}
                {card.labels.slice(0, 2).map((label) => (
                  <span 
                    key={label} 
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700"
                  >
                    {label}
                  </span>
                ))}
                {card.labels.length > 2 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-50 text-gray-500">
                    +{card.labels.length - 2}
                  </span>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-2 space-y-3">
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
                    <span className="font-medium">{card.progress}%</span>
                  </div>
                  <div className="w-full bg-accent rounded-full h-2 overflow-hidden shadow-inner">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-500 shadow-lg relative after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/20 after:to-transparent after:animate-pulse"
                      style={{ width: `${card.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Visual indicators row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Assignment indicator */}
                  {hasAssignedUsers() && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-primary" />
                      </div>
                    </div>
                  )}
                  
                  {/* Files indicator */}
                  {fileCount > 0 && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Paperclip className="w-3 h-3" />
                      <span className="text-xs">{fileCount}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom row with info */}
              <div className="flex items-center justify-between pt-2 border-t border-border/30">
                <div className="flex items-center gap-2">
                  {/* Priority indicator */}
                  {card.priority && (
                    <div className={`w-2 h-2 rounded-full ${
                      card.priority === 'high' ? 'bg-red-500' : 
                      card.priority === 'medium' ? 'bg-yellow-500' : 
                      'bg-green-500'
                    }`} title={`Priorité: ${card.priority === 'low' ? 'Faible' : card.priority === 'medium' ? 'Moyenne' : 'Élevée'}`} />
                  )}

                  {/* Comments count */}
                  {card.comments.length > 0 && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MessageSquare className="w-3 h-3" />
                      <span className="text-xs">{card.comments.length}</span>
                    </div>
                  )}

                </div>

                <div className="flex items-center gap-2">
                  {/* Due date */}
                  {card.dueDate && (
                    <div className={`flex items-center gap-1 text-xs ${
                      isOverdue 
                        ? 'text-destructive font-medium' 
                        : 'text-muted-foreground'
                    }`}>
                      <CalendarDays className="w-3 h-3" />
                      <span>
                        {format(new Date(card.dueDate), 'dd MMM', { locale: fr })}
                      </span>
                    </div>
                  )}

                  {/* Assigned user */}
                  {card.assignedToName && (
                    <Avatar className="w-6 h-6 ring-2 ring-white shadow-sm" title={`Assigné à ${card.assignedToName}`}>
                      <AvatarImage src={card.assignedToAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${card.assignedToName}`} />
                      <AvatarFallback className="text-[10px] bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                        {card.assignedToName.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
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