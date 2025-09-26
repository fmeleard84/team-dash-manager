import React from 'react';
import { getSectionTitle, getSectionContent } from './LLMDocumentationSections';

interface LLMContentViewerProps {
  sectionId: string;
  content?: string;
}

const getDescription = (sectionId: string): string => {
  if (sectionId === 'projet-demarrage') {
    return "Documentation technique complète du processus de démarrage de projet";
  }
  if (sectionId === 'general') {
    return "Vue d'ensemble de l'architecture et des conventions";
  }
  if (sectionId.startsWith('candidat')) {
    return "Documentation du flux et processus candidat";
  }
  if (sectionId.startsWith('db')) {
    return "Structure et configuration de la base de données";
  }
  if (sectionId.startsWith('projet')) {
    return "Documentation des processus et outils projet";
  }
  if (sectionId.startsWith('wiki')) {
    return "Système collaboratif de documentation";
  }
  if (sectionId.startsWith('api')) {
    return "Documentation technique des APIs et intégrations";
  }
  if (sectionId.startsWith('corrections')) {
    return "Historique des corrections et améliorations";
  }
  if (sectionId.startsWith('design')) {
    return "Documentation du système de design";
  }
  if (sectionId.startsWith('payment')) {
    return "Système de paiement et gestion des crédits";
  }
  return "Documentation technique détaillée";
};

const LLMContentViewer: React.FC<LLMContentViewerProps> = ({ sectionId, content }) => {
  const displayContent = content || getSectionContent(sectionId);
  const title = getSectionTitle(sectionId);
  const description = getDescription(sectionId);

  return (
    <div className="prose prose-sm max-w-none">
      <div className="mb-6">
        <h1 className="text-2xl text-gray-900 font-bold mb-2">{title}</h1>
        <p className="text-gray-600">{description}</p>
      </div>

      <pre className="whitespace-pre-wrap bg-gray-50 text-gray-900 p-6 rounded-lg overflow-x-auto border border-gray-200">
        {displayContent}
      </pre>
    </div>
  );
};

export default LLMContentViewer;