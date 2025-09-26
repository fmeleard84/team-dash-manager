import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Save } from 'lucide-react';
import { getSectionTitle, getSectionContent } from './LLMDocumentationSections';

interface LLMEditorProps {
  sectionId: string;
  content?: string;
  onContentChange: (content: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving?: boolean;
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

const LLMEditor: React.FC<LLMEditorProps> = ({
  sectionId,
  content,
  onContentChange,
  onSave,
  onCancel,
  isSaving = false
}) => {
  const displayContent = content || getSectionContent(sectionId);
  const title = getSectionTitle(sectionId);
  const description = getDescription(sectionId);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl text-gray-900 font-bold mb-2">{title}</h1>
          <p className="text-gray-600">{description}</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={onSave}
            size="sm"
            disabled={isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
          <Button
            onClick={onCancel}
            variant="outline"
            size="sm"
            disabled={isSaving}
          >
            Annuler
          </Button>
        </div>
      </div>

      <Textarea
        value={displayContent}
        onChange={(e) => onContentChange(e.target.value)}
        className="min-h-[600px] font-mono text-sm bg-gray-50 text-gray-900 border-gray-300 resize-none"
        placeholder="Documentation..."
      />
    </div>
  );
};

export default LLMEditor;