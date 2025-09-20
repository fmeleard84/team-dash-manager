import { useMemo } from 'react';

export interface ProjectWithDate {
  id: string;
  title: string;
  created_at: string;
  [key: string]: any;
}

export interface SortedProjectOption {
  id: string;
  title: string;
  created_at: string;
  displayText: string;
  displayTextWithDate: string;
  formattedDate: string;
}

/**
 * Hook universel pour trier et formater les projets
 * Trie par date de création (plus récent en premier) et ajoute le formatage pour l'affichage
 */
export const useProjectSort = (projects: ProjectWithDate[]): SortedProjectOption[] => {
  return useMemo(() => {
    if (!projects || projects.length === 0) return [];
    
    return projects
      .sort((a, b) => {
        // Trier par created_at desc (plus récent en premier)
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        return dateB.getTime() - dateA.getTime();
      })
      .map(project => {
        const createdDate = new Date(project.created_at);
        const formattedDate = createdDate.toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
        
        return {
          ...project, // Conserver TOUTES les propriétés originales
          id: project.id,
          title: project.title,
          created_at: project.created_at,
          displayText: project.title,
          displayTextWithDate: `${project.title} • ${formattedDate}`,
          formattedDate
        };
      });
  }, [projects]);
};

/**
 * Fonction utilitaire pour obtenir uniquement le texte d'affichage formaté
 */
export const formatProjectOption = (project: ProjectWithDate): string => {
  const createdDate = new Date(project.created_at);
  const formattedDate = createdDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  
  return `${project.title} • ${formattedDate}`;
};