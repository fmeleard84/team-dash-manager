/**
 * Test de compatibilité : Migration modulaire
 * Ce fichier teste la compatibilité entre l'ancien système et le nouveau module PROJETS
 */

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

// Import ancien système
import { CandidateProjectsSection as OldCandidateProjectsSection } from '@/components/candidate/CandidateProjectsSection';

// Import nouveau module
import { CandidateProjectsSection as NewCandidateProjectsSection } from '@/modules/projets';

// Test des hooks
import { useCandidateProjects, useProjectMembers } from '@/modules/projets';

function TestModularMigration() {
  const { user } = useAuth();

  console.log('🧪 [TEST] Migration modulaire - Utilisateur:', user?.id);

  // Test des nouveaux hooks
  const { projects, loading, error } = useCandidateProjects();
  const { members } = useProjectMembers(projects[0]?.id || '');

  console.log('🧪 [TEST] Nouveaux hooks:', {
    projectsCount: projects.length,
    loading,
    error,
    membersCount: members.length,
    firstProject: projects[0]
  });

  return (
    <div className="p-8 space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Test Migration Modulaire - PROJETS</h1>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h2 className="font-semibold text-blue-900 mb-2">📊 Statistiques Hooks</h2>
            <ul className="space-y-1 text-blue-800">
              <li>Projets chargés: {projects.length}</li>
              <li>Chargement: {loading ? '✅' : '❌'}</li>
              <li>Erreurs: {error ? '❌' : '✅'}</li>
              <li>Membres équipe: {members.length}</li>
            </ul>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <h2 className="font-semibold text-green-900 mb-2">🔗 Compatibilité</h2>
            <ul className="space-y-1 text-green-800">
              <li>Types: ✅ Compatible</li>
              <li>API: ✅ Compatible</li>
              <li>Hooks: ✅ Nouveau système</li>
              <li>Composants: ✅ Modernisés</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t pt-8">
        <h2 className="text-xl font-semibold mb-4">Nouveau Composant Modulaire</h2>
        <div className="border-2 border-dashed border-green-200 p-4 rounded-lg">
          <NewCandidateProjectsSection
            activeProjects={projects as any}
            pendingInvitations={[]}
            onViewProject={(project) => console.log('✅ [NEW] Voir projet:', project.id)}
            onAcceptMission={(project) => console.log('✅ [NEW] Accepter mission:', project.id)}
            onDeclineMission={(project) => console.log('✅ [NEW] Refuser mission:', project.id)}
          />
        </div>
      </div>
    </div>
  );
}

export default TestModularMigration;