import { useState, useCallback, useEffect } from 'react';
import { DropResult } from '@hello-pangea/dnd';
import { 
  KanbanBoard, 
  KanbanCard, 
  KanbanColumn, 
  CreateCardInput, 
  CreateColumnInput,
  UpdateCardInput,
  UpdateColumnInput
} from '@/types/kanban';
import { toast } from 'sonner';

const KANBAN_STORAGE_KEY = 'kanban_boards';

export const useKanban = (boardId?: string) => {
  const [board, setBoard] = useState<KanbanBoard | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper function to generate IDs
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Load boards from localStorage
  const loadBoards = useCallback((): KanbanBoard[] => {
    try {
      const stored = localStorage.getItem(KANBAN_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading boards:', error);
      return [];
    }
  }, []);

  // Save boards to localStorage
  const saveBoards = useCallback((boards: KanbanBoard[]) => {
    try {
      localStorage.setItem(KANBAN_STORAGE_KEY, JSON.stringify(boards));
    } catch (error) {
      console.error('Error saving boards:', error);
    }
  }, []);

  // Load specific board or create default
  useEffect(() => {
    setIsLoading(true);
    const boards = loadBoards();
    
    if (boardId) {
      const foundBoard = boards.find(b => b.id === boardId);
      setBoard(foundBoard || null);
    } else if (boards.length > 0) {
      // Load the most recent board
      const mostRecent = boards.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )[0];
      setBoard(mostRecent);
    }
    
    setIsLoading(false);
  }, [boardId, loadBoards]);

  // Auto-save board changes
  useEffect(() => {
    if (!board) return;
    
    const boards = loadBoards();
    const updatedBoards = boards.filter(b => b.id !== board.id);
    updatedBoards.push(board);
    saveBoards(updatedBoards);
  }, [board, loadBoards, saveBoards]);

  // Create a new board
  const createBoard = useCallback((title: string, description?: string) => {
    const newBoard: KanbanBoard = {
      id: generateId(),
      title,
      description,
      columns: [],
      cards: {},
      createdBy: '1', // TODO: Get from auth context
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      members: ['1'],
      teamMembers: [
        {
          id: '1',
          name: 'François Meleard',
          email: 'fmeleard+client@gmail.com',
          role: 'Chef de projet'
        },
        {
          id: '2',
          name: 'Marie Dupont',
          email: 'marie.dupont@example.com',
          role: 'Développeuse Frontend'
        },
        {
          id: '3',
          name: 'Jean Martin',
          email: 'jean.martin@example.com',
          role: 'Développeur Backend'
        },
        {
          id: '4',
          name: 'Sophie Chen',
          email: 'sophie.chen@example.com',
          role: 'Designer UX/UI'
        },
        {
          id: '5',
          name: 'Alex Rodriguez',
          email: 'alex.rodriguez@example.com',
          role: 'QA Tester'
        }
      ]
    };
    setBoard(newBoard);
    return newBoard;
  }, []);

  // Add a new column
  const addColumn = useCallback((input: CreateColumnInput) => {
    if (!board) return;

    const newColumn: KanbanColumn = {
      id: generateId(),
      title: input.title,
      position: input.position,
      cardIds: [],
      color: input.color,
      limit: input.limit
    };

    setBoard(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        columns: [...prev.columns, newColumn],
        updatedAt: new Date().toISOString()
      };
    });

    toast.success(`Colonne "${input.title}" ajoutée`);
  }, [board]);

  // Update a column
  const updateColumn = useCallback((input: UpdateColumnInput) => {
    if (!board) return;

    setBoard(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        columns: prev.columns.map(col => 
          col.id === input.id 
            ? { ...col, ...input, id: col.id }
            : col
        ),
        updatedAt: new Date().toISOString()
      };
    });

    toast.success('Colonne mise à jour');
  }, [board]);

  // Delete a column
  const deleteColumn = useCallback((columnId: string) => {
    if (!board) return;

    const column = board.columns.find(col => col.id === columnId);
    if (!column) return;

    // Move cards to first available column or delete them
    const remainingColumns = board.columns.filter(col => col.id !== columnId);
    const cardsToMove = column.cardIds;

    if (remainingColumns.length > 0 && cardsToMove.length > 0) {
      const targetColumn = remainingColumns[0];
      setBoard(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map(col => 
            col.id === targetColumn.id 
              ? { ...col, cardIds: [...col.cardIds, ...cardsToMove] }
              : col.id === columnId 
              ? null 
              : col
          ).filter(Boolean) as KanbanColumn[],
          updatedAt: new Date().toISOString()
        };
      });
    } else {
      // Delete cards if no other column exists
      setBoard(prev => {
        if (!prev) return prev;
        const newCards = { ...prev.cards };
        cardsToMove.forEach(cardId => {
          delete newCards[cardId];
        });

        return {
          ...prev,
          columns: prev.columns.filter(col => col.id !== columnId),
          cards: newCards,
          updatedAt: new Date().toISOString()
        };
      });
    }

    toast.success(`Colonne "${column.title}" supprimée`);
  }, [board]);

  // Add a new card
  const addCard = useCallback((input: CreateCardInput) => {
    if (!board) return;

    // Find team member if assigned
    const assignedMember = input.assignedTo ? 
      board.teamMembers.find(member => member.id === input.assignedTo) : undefined;

    const newCard: KanbanCard = {
      id: generateId(),
      title: input.title,
      description: input.description,
      assignedTo: input.assignedTo,
      assignedToName: assignedMember?.name,
      assignedToEmail: assignedMember?.email,
      assignedToAvatar: assignedMember?.avatar,
      dueDate: input.dueDate,
      priority: input.priority || 'medium',
      status: input.status || 'todo',
      labels: input.labels || [],
      attachments: [],
      comments: [],
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: '1' // TODO: Get from auth context
    };

    setBoard(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        cards: {
          ...prev.cards,
          [newCard.id]: newCard
        },
        columns: prev.columns.map(col =>
          col.id === input.columnId
            ? { ...col, cardIds: [...col.cardIds, newCard.id] }
            : col
        ),
        updatedAt: new Date().toISOString()
      };
    });

    toast.success(`Carte "${input.title}" ajoutée`);
    return newCard;
  }, [board]);

  // Update a card
  const updateCard = useCallback((input: UpdateCardInput) => {
    if (!board) return;

    setBoard(prev => {
      if (!prev) return prev;
      const existingCard = prev.cards[input.id];
      if (!existingCard) return prev;

      return {
        ...prev,
        cards: {
          ...prev.cards,
          [input.id]: {
            ...existingCard,
            ...input,
            id: existingCard.id,
            updatedAt: new Date().toISOString()
          }
        },
        updatedAt: new Date().toISOString()
      };
    });

    toast.success('Carte mise à jour');
  }, [board]);

  // Delete a card
  const deleteCard = useCallback((cardId: string) => {
    if (!board) return;

    const card = board.cards[cardId];
    if (!card) return;

    setBoard(prev => {
      if (!prev) return prev;
      const newCards = { ...prev.cards };
      delete newCards[cardId];

      return {
        ...prev,
        cards: newCards,
        columns: prev.columns.map(col => ({
          ...col,
          cardIds: col.cardIds.filter(id => id !== cardId)
        })),
        updatedAt: new Date().toISOString()
      };
    });

    toast.success(`Carte "${card.title}" supprimée`);
  }, [board]);

  // Handle drag and drop
  const handleDragEnd = useCallback((result: DropResult) => {
    const { destination, source, draggableId } = result;

    // No destination or same position
    if (!destination || 
        (destination.droppableId === source.droppableId && 
         destination.index === source.index)) {
      return;
    }

    if (!board) return;

    setBoard(prev => {
      if (!prev) return prev;

      const sourceColumn = prev.columns.find(col => col.id === source.droppableId);
      const destColumn = prev.columns.find(col => col.id === destination.droppableId);

      if (!sourceColumn || !destColumn) return prev;

      // Same column - reorder
      if (source.droppableId === destination.droppableId) {
        const newCardIds = Array.from(sourceColumn.cardIds);
        newCardIds.splice(source.index, 1);
        newCardIds.splice(destination.index, 0, draggableId);

        return {
          ...prev,
          columns: prev.columns.map(col =>
            col.id === source.droppableId
              ? { ...col, cardIds: newCardIds }
              : col
          ),
          updatedAt: new Date().toISOString()
        };
      }

      // Different columns - move card
      const sourceCardIds = Array.from(sourceColumn.cardIds);
      const destCardIds = Array.from(destColumn.cardIds);

      sourceCardIds.splice(source.index, 1);
      destCardIds.splice(destination.index, 0, draggableId);

      return {
        ...prev,
        columns: prev.columns.map(col => {
          if (col.id === source.droppableId) {
            return { ...col, cardIds: sourceCardIds };
          }
          if (col.id === destination.droppableId) {
            return { ...col, cardIds: destCardIds };
          }
          return col;
        }),
        updatedAt: new Date().toISOString()
      };
    });
  }, [board]);

  // Export board as JSON
  const exportBoard = useCallback((boardToExport?: KanbanBoard) => {
    const targetBoard = boardToExport || board;
    if (!targetBoard) return;
    
    const dataStr = JSON.stringify(targetBoard, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `kanban-${targetBoard.title.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Tableau exporté en JSON');
  }, [board]);

  // Import board from JSON
  const importBoard = useCallback((jsonString: string) => {
    try {
      const importedBoard: KanbanBoard = JSON.parse(jsonString);
      
      // Generate new ID to avoid conflicts
      importedBoard.id = generateId();
      importedBoard.updatedAt = new Date().toISOString();
      
      setBoard(importedBoard);
      toast.success(`Tableau "${importedBoard.title}" importé`);
      
      return importedBoard;
    } catch (error) {
      toast.error('Erreur lors de l\'import JSON');
      return null;
    }
  }, []);

  // Get all boards
  const getAllBoards = useCallback(() => {
    return loadBoards();
  }, [loadBoards]);

  // Delete a board
  const deleteBoard = useCallback((boardIdToDelete: string) => {
    const boards = loadBoards();
    const updatedBoards = boards.filter(b => b.id !== boardIdToDelete);
    saveBoards(updatedBoards);
    
    if (board?.id === boardIdToDelete) {
      setBoard(null);
    }
    
    toast.success('Tableau supprimé');
  }, [board, loadBoards, saveBoards]);

  return {
    board,
    isLoading,
    createBoard,
    addColumn,
    updateColumn,
    deleteColumn,
    addCard,
    updateCard,
    deleteCard,
    handleDragEnd,
    exportBoard,
    importBoard,
    getAllBoards,
    deleteBoard
  };
};