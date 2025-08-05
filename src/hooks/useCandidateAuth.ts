import { useState, useEffect } from 'react';

interface UseCandidateAuthReturn {
  currentCandidateId: string | null;
  isLoading: boolean;
  error: string | null;
}

export function useCandidateAuth(): UseCandidateAuthReturn {
  const [currentCandidateId, setCurrentCandidateId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getCandidateId = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Vérifier les données d'authentification dans localStorage
        const candidateAuth = localStorage.getItem('candidate-auth');
        
        if (candidateAuth) {
          const authData = JSON.parse(candidateAuth);
          if (authData.candidateId) {
            setCurrentCandidateId(authData.candidateId);
            setIsLoading(false);
            return;
          }
        }

        // Si pas d'authentification, rediriger vers la page de connexion
        setError('Non authentifié');
        setIsLoading(false);
        
        // Optionnel: rediriger automatiquement
        // window.location.href = '/team';
        
      } catch (err) {
        setError('Erreur lors de la récupération de l\'authentification');
        setIsLoading(false);
      }
    };

    getCandidateId();
  }, []);

  return { currentCandidateId, isLoading, error };
}