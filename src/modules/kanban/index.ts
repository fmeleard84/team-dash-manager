// Export all from kanban module
export * from './types';
export { KanbanAPI } from './services/kanbanAPI';
export * from './hooks';

// Export components with different names to avoid conflicts
export { KanbanBoard as ModularKanbanBoard } from './components/KanbanBoard';
export { KanbanColumn as ModularKanbanColumn } from './components/KanbanColumn';
export { KanbanCard as ModularKanbanCard } from './components/KanbanCard';