import { useState, useEffect } from 'react';

export interface MessageGroup {
  id: string;
  name: string;
  memberIds: string[];
  projectId: string;
  createdAt: string;
  color?: string;
}

export const useMessageGroups = (projectId: string) => {
  const [groups, setGroups] = useState<MessageGroup[]>([]);

  // Load groups from localStorage (for simplicity, could be moved to database later)
  useEffect(() => {
    if (!projectId) return;
    
    const storageKey = `message-groups-${projectId}`;
    const savedGroups = localStorage.getItem(storageKey);
    
    if (savedGroups) {
      try {
        const parsed = JSON.parse(savedGroups);
        setGroups(parsed);
      } catch (error) {
        console.error('Error loading groups:', error);
      }
    }
  }, [projectId]);

  const saveGroups = (newGroups: MessageGroup[]) => {
    const storageKey = `message-groups-${projectId}`;
    localStorage.setItem(storageKey, JSON.stringify(newGroups));
    setGroups(newGroups);
  };

  const createGroup = (name: string, memberIds: string[], color?: string) => {
    const newGroup: MessageGroup = {
      id: `group-${Date.now()}`,
      name,
      memberIds,
      projectId,
      createdAt: new Date().toISOString(),
      color: color || '#8b5cf6'
    };

    const updatedGroups = [...groups, newGroup];
    saveGroups(updatedGroups);
    return newGroup;
  };

  const updateGroup = (groupId: string, updates: Partial<MessageGroup>) => {
    const updatedGroups = groups.map(group => 
      group.id === groupId ? { ...group, ...updates } : group
    );
    saveGroups(updatedGroups);
  };

  const deleteGroup = (groupId: string) => {
    const updatedGroups = groups.filter(group => group.id !== groupId);
    saveGroups(updatedGroups);
  };

  return {
    groups,
    createGroup,
    updateGroup,
    deleteGroup
  };
};