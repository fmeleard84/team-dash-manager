import { useState, useEffect, useMemo } from 'react';

interface Project {
  id: string;
  title: string;
  created_at?: string;
  status?: string;
}

/**
 * Hook unifié pour la sélection de projet avec tri par date et sélection automatique
 * @param projects - Liste des projets disponibles
 * @param filterStatus - Optionnel: filtrer par statut (ex: 'play')
 */
export function useProjectSelector(projects: Project[], filterStatus?: string) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Filtrer et trier les projets
  const sortedProjects = useMemo(() => {
    let filtered = projects;
    
    // Appliquer le filtre de statut si fourni
    if (filterStatus) {
      filtered = projects.filter(p => p.status === filterStatus);
    }
    
    // Trier par date de création (plus récent en premier)
    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    });
  }, [projects, filterStatus]);

  // Sélectionner automatiquement le premier projet si aucun n'est sélectionné
  useEffect(() => {
    if (!selectedProjectId && sortedProjects.length > 0) {
      setSelectedProjectId(sortedProjects[0].id);
    }
    // Si le projet sélectionné n'existe plus dans la liste filtrée
    else if (selectedProjectId && !sortedProjects.find(p => p.id === selectedProjectId)) {
      setSelectedProjectId(sortedProjects.length > 0 ? sortedProjects[0].id : '');
    }
  }, [sortedProjects, selectedProjectId]);

  return {
    selectedProjectId,
    setSelectedProjectId,
    sortedProjects,
    selectedProject: sortedProjects.find(p => p.id === selectedProjectId) || null
  };
}