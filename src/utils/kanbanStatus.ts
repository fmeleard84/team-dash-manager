// Mapping between column titles and status values
export type CardStatus = 'todo' | 'in_progress' | 'review' | 'done';

// Map column title to status
export function getStatusFromColumnTitle(columnTitle: string): CardStatus {
  const titleLower = columnTitle.toLowerCase().trim();
  
  // Common variations for "À faire" / "Todo"
  if (titleLower.includes('faire') || 
      titleLower.includes('todo') || 
      titleLower === 'backlog' ||
      titleLower.includes('nouveau') ||
      titleLower.includes('planifié')) {
    return 'todo';
  }
  
  // Common variations for "En cours" / "In Progress"
  if (titleLower.includes('cours') || 
      titleLower.includes('progress') ||
      titleLower.includes('développement') ||
      titleLower.includes('active') ||
      titleLower.includes('doing')) {
    return 'in_progress';
  }
  
  // Common variations for "À valider" / "Review"
  if (titleLower.includes('valid') || 
      titleLower.includes('review') ||
      titleLower.includes('vérif') ||
      titleLower.includes('test') ||
      titleLower.includes('recette')) {
    return 'review';
  }
  
  // Common variations for "Finalisé" / "Done"
  if (titleLower.includes('finalisé') || 
      titleLower.includes('terminé') ||
      titleLower.includes('done') ||
      titleLower.includes('complet') ||
      titleLower.includes('fini') ||
      titleLower.includes('livré')) {
    return 'done';
  }
  
  // Default to 'todo' if no match
  return 'todo';
}

// Get status label in French
export function getStatusLabel(status: CardStatus): string {
  switch (status) {
    case 'todo': return 'À faire';
    case 'in_progress': return 'En cours';
    case 'review': return 'À valider';
    case 'done': return 'Finalisé';
    default: return 'À faire';
  }
}

// Get status color for badges
export function getStatusColor(status: CardStatus): string {
  switch (status) {
    case 'todo': return 'bg-gray-100 text-gray-700 border-gray-300';
    case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-300';
    case 'review': return 'bg-orange-100 text-orange-700 border-orange-300';
    case 'done': return 'bg-green-100 text-green-700 border-green-300';
    default: return 'bg-gray-100 text-gray-700 border-gray-300';
  }
}

// Get status dot color
export function getStatusDotColor(status: CardStatus): string {
  switch (status) {
    case 'todo': return 'bg-gray-500';
    case 'in_progress': return 'bg-blue-500';
    case 'review': return 'bg-orange-500';
    case 'done': return 'bg-green-500';
    default: return 'bg-gray-500';
  }
}