import { useState, useEffect } from 'react';

interface ProjectUser {
  email: string;
  displayName: string;
  role?: string;
}

export function useProjectUsers(projectId?: string) {
  const [displayNames, setDisplayNames] = useState<ProjectUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (projectId) {
      setLoading(true);
      // For now, return empty results
      setDisplayNames([]);
      setLoading(false);
    }
  }, [projectId]);

  return {
    displayNames,
    loading
  };
}